import { agruparPorFase } from "./fases";
import { PROJECT_SLUG } from "./project";
import { getSupabaseClient } from "./supabase/server";
import { getFechasLimiteFase } from "./fase-deadlines";
import { FASES_ORDEN } from "./fases-orden";
import type { Database } from "./supabase/database.types";
import type { Fase } from "./types";
import { ESTADO_DB_CERRADO_POR_CAMBIO_ALCANCE } from "./estados";

export type RequerimientoDetalle = Pick<
  Database["public"]["Tables"]["requirements"]["Row"],
  | "id"
  | "code"
  | "title"
  | "month_label"
  | "complexity"
  | "has_detail_tracking"
  | "estimated_hours"
  | "executed_hours"
  | "status"
  | "description"
  | "client_stakeholder"
  | "assignees"
  | "dev_environment_url"
>;

export interface RequerimientoDetalleResult {
  error: boolean;
  requerimiento: RequerimientoDetalle | null;
  fases: Fase[] | null;
  errorTareas: boolean;
  reemplazadoPor: { code: string; slug: string; title: string } | null;
}

export type RequerimientoParaEditar = Pick<
  Database["public"]["Tables"]["requirements"]["Row"],
  | "id"
  | "code"
  | "title"
  | "category"
  | "complexity"
  | "month_label"
  | "status"
  | "deadline"
  | "estimated_hours"
  | "billing_date"
  | "notes"
  | "dev_environment_url"
  | "has_detail_tracking"
  | "parent_requirement_id"
>;

/** Unidad C2.3 — datos completos de un requerimiento para el formulario de edición. */
export async function getRequerimientoParaEditar(
  slug: string
): Promise<RequerimientoParaEditar | null> {
  const supabase = await getSupabaseClient();

  const { data: proyecto } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", PROJECT_SLUG)
    .single();
  if (!proyecto) return null;

  const { data } = await supabase
    .from("requirements")
    .select(
      "id, code, title, category, complexity, month_label, status, deadline, estimated_hours, billing_date, notes, dev_environment_url, has_detail_tracking, parent_requirement_id"
    )
    .eq("project_id", proyecto.id)
    .eq("slug", slug)
    .maybeSingle();

  return data ?? null;
}

/**
 * Único punto de entrada para el drill-down de un requerimiento —
 * consolida las consultas a Supabase para que la Fase B tenga un solo
 * lugar donde inyectar el cliente autenticado.
 */
export async function getRequerimientoDetalle(slug: string): Promise<RequerimientoDetalleResult> {
  const supabase = await getSupabaseClient();

  try {
    const { data: proyecto, error: errorProyecto } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", PROJECT_SLUG)
      .single();
    if (errorProyecto || !proyecto) throw errorProyecto ?? new Error("Proyecto no encontrado");

    const { data: requerimiento, error: errorRequerimiento } = await supabase
      .from("requirements")
      .select(
        "id, code, title, month_label, complexity, has_detail_tracking, estimated_hours, executed_hours, status, description, client_stakeholder, assignees, dev_environment_url"
      )
      .eq("project_id", proyecto.id)
      .eq("slug", slug)
      .maybeSingle();
    if (errorRequerimiento) throw errorRequerimiento;
    if (!requerimiento) {
      return {
        error: false,
        requerimiento: null,
        fases: null,
        errorTareas: false,
        reemplazadoPor: null,
      };
    }

    // Unidad C2.3 — si este requerimiento quedó CERRADO_POR_CAMBIO_ALCANCE,
    // buscar el requerimiento nuevo que lo reemplazó (parent_requirement_id
    // apunta a este) para mostrar el banner "Reemplazado por [link]".
    let reemplazadoPor: { code: string; slug: string; title: string } | null = null;
    if (requerimiento.status === ESTADO_DB_CERRADO_POR_CAMBIO_ALCANCE) {
      const { data: reemplazo } = await supabase
        .from("requirements")
        .select("code, slug, title")
        .eq("parent_requirement_id", requerimiento.id)
        .maybeSingle();
      reemplazadoPor = reemplazo ?? null;
    }

    // Unidad C2.4: los 28 requerimientos muestran su acordeón de tareas,
    // con o sin has_detail_tracking -- ya no gatea la consulta, solo sigue
    // usándose para el atenuado visual de la card en el Home. Query propia
    // (no lanza al try/catch general) para distinguir "sin tareas" (array
    // vacío, normal en los que aún no tienen ninguna) de "falló la consulta".
    let fases: Fase[] = agruparPorFase([]);
    let errorTareas = false;
    const { data: tareas, error: errorConsultaTareas } = await supabase
      .from("requirement_tasks")
      .select(
        "id, phase_number, phase_name, task_name, detail, status, estimated_hours, due_date, completed_date, milestone, blockers, notes, sort_order, assignee, planned_start_date, planned_end_date, planned_dates_confirmed, executed_hours"
      )
      .eq("requirement_id", requerimiento.id);
    if (errorConsultaTareas) {
      errorTareas = true;
    } else {
      const fechasLimiteFase = await getFechasLimiteFase(requerimiento.id);
      fases = agruparPorFase(tareas ?? []).map((fase, i) => ({
        ...fase,
        fechaLimiteFase: fechasLimiteFase.get(FASES_ORDEN[i].numero) ?? null,
      }));
    }

    return { error: false, requerimiento, fases, errorTareas, reemplazadoPor };
  } catch {
    return { error: true, requerimiento: null, fases: null, errorTareas: false, reemplazadoPor: null };
  }
}
