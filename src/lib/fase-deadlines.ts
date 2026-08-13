import { getSupabaseClient } from "./supabase/server";
import { desdeISO } from "./fechas";

/** Fecha límite por fase de un requerimiento (`requirement_phase_deadlines`,
 * Unidad C3 — independiente de las fechas de sus tareas). `due_date` es
 * opcional desde 2026-08-12 (la fila puede existir solo para guardar
 * `estimated_hours`, sin fecha límite todavía). */
export async function getFechasLimiteFase(requirementId: string): Promise<Map<number, Date | null>> {
  const supabase = await getSupabaseClient();
  const { data } = await supabase
    .from("requirement_phase_deadlines")
    .select("phase_number, due_date")
    .eq("requirement_id", requirementId);

  return new Map(
    (data ?? []).map((f) => [f.phase_number, f.due_date ? desdeISO(f.due_date) : null])
  );
}

/** Horas estimadas manuales por fase de un requerimiento (2026-08-12,
 * reutiliza la misma tabla que la fecha límite de fase). */
export async function getHorasEstimadasFase(requirementId: string): Promise<Map<number, number>> {
  const supabase = await getSupabaseClient();
  const { data } = await supabase
    .from("requirement_phase_deadlines")
    .select("phase_number, estimated_hours")
    .eq("requirement_id", requirementId);

  return new Map(
    (data ?? [])
      .filter((f) => f.estimated_hours !== null)
      .map((f) => [f.phase_number, f.estimated_hours as number])
  );
}

/** Variante batch de getFechasLimiteFase para el Gantt (/planeacion), que
 * necesita las fechas límite de fase de muchos requerimientos a la vez.
 * Clave del Map: `${requirementId}-${phaseNumber}`. */
export async function getFechasLimiteFasePorRequerimientos(
  requirementIds: string[]
): Promise<Map<string, Date | null>> {
  const supabase = await getSupabaseClient();
  const { data } = await supabase
    .from("requirement_phase_deadlines")
    .select("requirement_id, phase_number, due_date")
    .in("requirement_id", requirementIds);

  return new Map(
    (data ?? []).map((f) => [
      `${f.requirement_id}-${f.phase_number}`,
      f.due_date ? desdeISO(f.due_date) : null,
    ])
  );
}

/** Variante batch de getHorasEstimadasFase para /horas, que necesita las
 * horas estimadas de fase de muchos requerimientos a la vez.
 * Clave del Map: `${requirementId}-${phaseNumber}`. */
export async function getHorasEstimadasFasePorRequerimientos(
  requirementIds: string[]
): Promise<Map<string, number>> {
  const supabase = await getSupabaseClient();
  const { data } = await supabase
    .from("requirement_phase_deadlines")
    .select("requirement_id, phase_number, estimated_hours")
    .in("requirement_id", requirementIds.length > 0 ? requirementIds : [""]);

  return new Map(
    (data ?? [])
      .filter((f) => f.estimated_hours !== null)
      .map((f) => [`${f.requirement_id}-${f.phase_number}`, f.estimated_hours as number])
  );
}
