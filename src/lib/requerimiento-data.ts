import { agruparPorFase } from "./fases";
import { PROJECT_SLUG } from "./project";
import { getSupabaseClient } from "./supabase/server";
import type { Database } from "./supabase/database.types";
import type { Fase } from "./types";

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
    if (!requerimiento) return { error: false, requerimiento: null, fases: null };

    let fases: Fase[] | null = null;
    if (requerimiento.has_detail_tracking) {
      const { data: tareas } = await supabase
        .from("requirement_tasks")
        .select(
          "id, phase_number, phase_name, task_name, detail, status, estimated_hours, due_date, completed_date, milestone, blockers, notes, sort_order, assignee"
        )
        .eq("requirement_id", requerimiento.id);
      fases = agruparPorFase(tareas ?? []);
    }

    return { error: false, requerimiento, fases };
  } catch {
    return { error: true, requerimiento: null, fases: null };
  }
}
