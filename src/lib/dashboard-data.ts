import { calcularSemaforo } from "./semaforo";
import { getKPIs } from "./kpis";
import { PROJECT_SLUG } from "./project";
import { getSupabaseClient } from "./supabase/server";
import type { Database } from "./supabase/database.types";
import type { Estado, KPIs, Requerimiento } from "./types";

interface DashboardData {
  requerimientos: Requerimiento[];
  kpis: KPIs;
}

const ESTADO_DB_A_ES: Record<string, Estado> = {
  NO_INICIADO: "No iniciado",
  EN_CURSO: "En curso",
  PAUSADO: "Pausado",
  ENTREGADO_PRODUCCION: "Entregado en producción",
};

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
>;

function adaptar(row: RequirementRow, idsConTareas: Set<string>): Requerimiento {
  const horasEstimadas = row.estimated_hours;
  const horasEjecutadas = row.executed_hours;
  const fechaLimite = row.deadline ? new Date(row.deadline) : null;

  return {
    item: row.code,
    slug: row.slug,
    nombre: row.title,
    estado: ESTADO_DB_A_ES[row.status] ?? "No iniciado",
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
    const supabase = getSupabaseClient();

    const { data: proyecto, error: errorProyecto } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", PROJECT_SLUG)
      .single();
    if (errorProyecto || !proyecto) throw errorProyecto ?? new Error("Proyecto no encontrado");

    const { data: filas, error: errorRequerimientos } = await supabase
      .from("requirements")
      .select(
        "id, code, slug, title, month_label, complexity, status, has_detail_tracking, estimated_hours, executed_hours, billing_date, notes, deadline"
      )
      .eq("project_id", proyecto.id);
    if (errorRequerimientos) throw errorRequerimientos;

    const idsConDetalle = (filas ?? [])
      .filter((r) => r.has_detail_tracking)
      .map((r) => r.id);

    const { data: tareas, error: errorTareas } = await supabase
      .from("requirement_tasks")
      .select("requirement_id")
      .in("requirement_id", idsConDetalle.length > 0 ? idsConDetalle : [""]);
    if (errorTareas) throw errorTareas;

    const idsConTareas = new Set((tareas ?? []).map((t) => t.requirement_id));

    const requerimientos = (filas ?? []).map((r) => adaptar(r, idsConTareas));
    const kpis = getKPIs(requerimientos);
    ultimoResultadoBueno = { requerimientos, kpis };
    return { requerimientos, kpis, error: false, ultimoResultadoNulo: false };
  } catch {
    if (ultimoResultadoBueno) {
      return { ...ultimoResultadoBueno, error: true, ultimoResultadoNulo: false };
    }
    return {
      requerimientos: [],
      kpis: getKPIs([]),
      error: true,
      ultimoResultadoNulo: true,
    };
  }
}
