import { calcularSemaforo } from "./semaforo";
import { calcularFaseActual } from "./fases";
import { getKPIs } from "./kpis";
import { PROJECT_SLUG } from "./project";
import { getSupabaseClient } from "./supabase/server";
import { dbAEstado } from "./estados";
import { estadoTareaDesdeDb } from "./estados-tarea";
import { getFechasLimiteFasePorRequerimientos } from "./fase-deadlines";
import { FASES_ORDEN } from "./fases-orden";
import { desdeISO } from "./fechas";
import type { Database } from "./supabase/database.types";
import type { HitoProximo, KPIs, Requerimiento } from "./types";

interface DashboardData {
  requerimientos: Requerimiento[];
  kpis: KPIs;
  hitosProximos: HitoProximo[];
}

type TaskForHome = Pick<
  Database["public"]["Tables"]["requirement_tasks"]["Row"],
  | "requirement_id"
  | "phase_number"
  | "phase_name"
  | "status"
  | "due_date"
  | "planned_end_date"
>;

type RequirementRow = Pick<
  Database["public"]["Tables"]["requirements"]["Row"],
  | "id"
  | "code"
  | "slug"
  | "title"
  | "month_label"
  | "complexity"
  | "status"
  | "has_detail_tracking"
  | "estimated_hours"
  | "executed_hours"
  | "deadline"
  | "reopened_count"
>;

/** Fecha (due_date) más próxima entre las tareas en estado "En curso" del
 * requerimiento, sin importar la fase. `null` si ninguna tarea en curso
 * tiene fecha. Fuente de "Próximas fechas límite" en Home. */
function proximaFechaDeTareasEnCurso(tareas: TaskForHome[]): Date | null {
  const fechas = tareas
    .filter((t) => estadoTareaDesdeDb(t.status) === "En curso" && t.due_date)
    .map((t) => desdeISO(t.due_date as string));
  if (fechas.length === 0) return null;
  return new Date(Math.min(...fechas.map((f) => f.getTime())));
}

function adaptar(
  row: RequirementRow,
  idsConTareas: Set<string>,
  faseActual: string | null,
  tareasDelRequerimiento: TaskForHome[]
): Requerimiento {
  const horasEstimadas = row.estimated_hours;
  const horasEjecutadas = row.executed_hours;
  const fechaLimite = row.deadline ? desdeISO(row.deadline) : null;

  return {
    item: row.code,
    slug: row.slug,
    nombre: row.title,
    estado: dbAEstado(row.status),
    mes: row.month_label,
    complejidad: row.complexity,
    horasEstimadas,
    horasEjecutadas,
    horasPorEjecutar:
      horasEstimadas !== null && horasEjecutadas !== null
        ? horasEstimadas - horasEjecutadas
        : null,
    porcentajeAvance:
      horasEstimadas !== null && horasEstimadas > 0
        ? Math.round(((horasEjecutadas ?? 0) / horasEstimadas) * 100)
        : null,
    overbudget:
      horasEstimadas !== null &&
      horasEjecutadas !== null &&
      horasEjecutadas > horasEstimadas,
    tieneDetalle: row.has_detail_tracking,
    sinTareas: row.has_detail_tracking && !idsConTareas.has(row.id),
    fechaLimite,
    semaforo: calcularSemaforo(fechaLimite),
    reabierto: row.reopened_count,
    faseActual,
    tieneTareaBloqueda: tareasDelRequerimiento.some(
      (t) => estadoTareaDesdeDb(t.status) === "Bloqueada"
    ),
    proximaActividadFecha: proximaFechaDeTareasEnCurso(tareasDelRequerimiento),
  };
}

/**
 * Caché en memoria del proceso (no persiste entre reinicios) del último
 * resultado leído con éxito. Permite seguir mostrando datos si Supabase no
 * responde en el momento de un request.
 *
 * Limitación conocida (heredada de la Fase 3a): en un entorno serverless
 * (Vercel) este estado de módulo no está garantizado entre invocaciones.
 */
let ultimoResultadoBueno: DashboardData | null = null;

export async function getDashboardData(): Promise<
  DashboardData & { error: boolean; ultimoResultadoNulo: boolean }
> {
  try {
    const supabase = await getSupabaseClient();

    const { data: proyecto, error: errorProyecto } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", PROJECT_SLUG)
      .single();
    if (errorProyecto || !proyecto) throw errorProyecto ?? new Error("Proyecto no encontrado");

    const { data: filas, error: errorRequerimientos } = await supabase
      .from("requirements")
      .select(
        "id, code, slug, title, month_label, complexity, status, has_detail_tracking, estimated_hours, executed_hours, deadline, reopened_count"
      )
      .eq("project_id", proyecto.id);
    if (errorRequerimientos) throw errorRequerimientos;

    const idsConDetalle = (filas ?? [])
      .filter((r) => r.has_detail_tracking)
      .map((r) => r.id);

    const { data: tareas, error: errorTareas } = await supabase
      .from("requirement_tasks")
      .select("requirement_id, phase_number, phase_name, status, due_date, planned_end_date")
      .in("requirement_id", idsConDetalle.length > 0 ? idsConDetalle : [""]);
    if (errorTareas) throw errorTareas;

    const tareasPorRequerimiento = new Map<string, TaskForHome[]>();
    for (const t of tareas ?? []) {
      const lista = tareasPorRequerimiento.get(t.requirement_id) ?? [];
      lista.push(t);
      tareasPorRequerimiento.set(t.requirement_id, lista);
    }
    const idsConTareas = new Set(tareasPorRequerimiento.keys());

    const requerimientos = (filas ?? []).map((r) => {
      const tareasDelReq = tareasPorRequerimiento.get(r.id) ?? [];
      return adaptar(r, idsConTareas, calcularFaseActual(tareasDelReq), tareasDelReq);
    });

    const requerimientoPorId = new Map((filas ?? []).map((r) => [r.id, r]));

    const idsEnCurso = (filas ?? [])
      .filter((r) => dbAEstado(r.status) === "En curso")
      .map((r) => r.id);
    const fechasFase = await getFechasLimiteFasePorRequerimientos(idsEnCurso);

    // Una fase solo cuenta como "hito próximo" si todavía tiene alguna
    // tarea en curso — si ya se cerraron todas sus tareas, el hito no debe
    // listarse aunque la fecha límite de fase siga registrada.
    const fasesConTareaEnCurso = new Set<string>();
    for (const [requirementId, tareasReq] of tareasPorRequerimiento.entries()) {
      for (const t of tareasReq) {
        if (estadoTareaDesdeDb(t.status) === "En curso") {
          fasesConTareaEnCurso.add(`${requirementId}-${t.phase_number}`);
        }
      }
    }

    const hitosProximos: HitoProximo[] = Array.from(fechasFase.entries())
      .filter(([clave]) => fasesConTareaEnCurso.has(clave))
      .map(([clave, fecha]) => {
        const separador = clave.lastIndexOf("-");
        const requirementId = clave.slice(0, separador);
        const phaseNumero = Number(clave.slice(separador + 1));
        const req = requerimientoPorId.get(requirementId);
        const fase = FASES_ORDEN.find((f) => f.numero === phaseNumero);
        return {
          nombre: fase?.nombre ?? `Fase ${phaseNumero}`,
          requerimientoCodigo: req?.code ?? "",
          requerimientoNombre: req?.title ?? "",
          requerimientoSlug: req?.slug ?? "",
          fecha,
        };
      })
      .sort((a, b) => (a.fecha && b.fecha ? a.fecha.getTime() - b.fecha.getTime() : 0))
      .slice(0, 5);

    const kpis = getKPIs(requerimientos);
    ultimoResultadoBueno = { requerimientos, kpis, hitosProximos };
    return { requerimientos, kpis, hitosProximos, error: false, ultimoResultadoNulo: false };
  } catch {
    if (ultimoResultadoBueno) {
      return { ...ultimoResultadoBueno, error: true, ultimoResultadoNulo: false };
    }
    return {
      requerimientos: [],
      kpis: getKPIs([]),
      hitosProximos: [],
      error: true,
      ultimoResultadoNulo: true,
    };
  }
}
