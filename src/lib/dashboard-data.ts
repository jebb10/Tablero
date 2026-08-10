import { calcularSemaforo } from "./semaforo";
import { calcularFaseActual } from "./fases";
import { getKPIs } from "./kpis";
import { PROJECT_SLUG } from "./project";
import { getSupabaseClient } from "./supabase/server";
import { dbAEstado } from "./estados";
import { estadoEsCompletada } from "./estados-tarea";
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
  | "milestone"
>;

function contieneBloqueo(notas: string | null): boolean {
  if (!notas) return false;
  const n = notas.toLowerCase();
  return n.includes("actividad bloqueante") || n.includes("espera de ws");
}

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
  | "billing_date"
  | "notes"
  | "deadline"
  | "reopened_count"
>;

function adaptar(
  row: RequirementRow,
  idsConTareas: Set<string>,
  faseActual: string | null
): Requerimiento {
  const horasEstimadas = row.estimated_hours;
  const horasEjecutadas = row.executed_hours;
  const fechaLimite = row.deadline ? new Date(row.deadline) : null;

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
    fechaCobro: row.billing_date,
    notas: row.notes,
    bloqueado: contieneBloqueo(row.notes),
    tieneDetalle: row.has_detail_tracking,
    sinTareas: row.has_detail_tracking && !idsConTareas.has(row.id),
    fechaLimite,
    semaforo: calcularSemaforo(fechaLimite),
    reabierto: row.reopened_count,
    faseActual,
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
        "id, code, slug, title, month_label, complexity, status, has_detail_tracking, estimated_hours, executed_hours, billing_date, notes, deadline, reopened_count"
      )
      .eq("project_id", proyecto.id);
    if (errorRequerimientos) throw errorRequerimientos;

    const idsConDetalle = (filas ?? [])
      .filter((r) => r.has_detail_tracking)
      .map((r) => r.id);

    const { data: tareas, error: errorTareas } = await supabase
      .from("requirement_tasks")
      .select("requirement_id, phase_number, phase_name, status, due_date, planned_end_date, milestone")
      .in("requirement_id", idsConDetalle.length > 0 ? idsConDetalle : [""]);
    if (errorTareas) throw errorTareas;

    const tareasPorRequerimiento = new Map<string, TaskForHome[]>();
    for (const t of tareas ?? []) {
      const lista = tareasPorRequerimiento.get(t.requirement_id) ?? [];
      lista.push(t);
      tareasPorRequerimiento.set(t.requirement_id, lista);
    }
    const idsConTareas = new Set(tareasPorRequerimiento.keys());

    const requerimientos = (filas ?? []).map((r) =>
      adaptar(r, idsConTareas, calcularFaseActual(tareasPorRequerimiento.get(r.id) ?? []))
    );

    const requerimientoPorId = new Map((filas ?? []).map((r) => [r.id, r]));
    const hoy = new Date();
    const hitosProximos: HitoProximo[] = (tareas ?? [])
      .filter((t) => t.milestone !== null && !estadoEsCompletada(t.status))
      .map((t) => {
        const fechaStr = t.planned_end_date ?? t.due_date;
        return { t, fecha: fechaStr ? new Date(fechaStr) : null };
      })
      .sort((a, b) => {
        if (a.fecha && b.fecha) return a.fecha.getTime() - b.fecha.getTime();
        if (a.fecha) return -1;
        if (b.fecha) return 1;
        return 0;
      })
      .slice(0, 5)
      .map(({ t, fecha }) => {
        const req = requerimientoPorId.get(t.requirement_id);
        return {
          nombre: t.milestone as string,
          requerimientoCodigo: req?.code ?? "",
          requerimientoNombre: req?.title ?? "",
          requerimientoSlug: req?.slug ?? "",
          fecha,
        };
      });

    const kpis = getKPIs(requerimientos, tareas ?? [], hoy);
    ultimoResultadoBueno = { requerimientos, kpis, hitosProximos };
    return { requerimientos, kpis, hitosProximos, error: false, ultimoResultadoNulo: false };
  } catch {
    if (ultimoResultadoBueno) {
      return { ...ultimoResultadoBueno, error: true, ultimoResultadoNulo: false };
    }
    return {
      requerimientos: [],
      kpis: getKPIs([], [], new Date()),
      hitosProximos: [],
      error: true,
      ultimoResultadoNulo: true,
    };
  }
}
