import { getSupabaseClient } from "./supabase/server";

/** Fecha límite por fase de un requerimiento (`requirement_phase_deadlines`,
 * Unidad C3 — independiente de las fechas de sus tareas). */
export async function getFechasLimiteFase(requirementId: string): Promise<Map<number, Date>> {
  const supabase = await getSupabaseClient();
  const { data } = await supabase
    .from("requirement_phase_deadlines")
    .select("phase_number, due_date")
    .eq("requirement_id", requirementId);

  return new Map((data ?? []).map((f) => [f.phase_number, new Date(f.due_date)]));
}

/** Variante batch de getFechasLimiteFase para el Gantt (/planeacion), que
 * necesita las fechas límite de fase de muchos requerimientos a la vez.
 * Clave del Map: `${requirementId}-${phaseNumber}`. */
export async function getFechasLimiteFasePorRequerimientos(
  requirementIds: string[]
): Promise<Map<string, Date>> {
  const supabase = await getSupabaseClient();
  const { data } = await supabase
    .from("requirement_phase_deadlines")
    .select("requirement_id, phase_number, due_date")
    .in("requirement_id", requirementIds);

  return new Map(
    (data ?? []).map((f) => [`${f.requirement_id}-${f.phase_number}`, new Date(f.due_date)])
  );
}
