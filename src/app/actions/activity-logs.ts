"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getSupabaseClient } from "@/lib/supabase/server";

export type RegistrarHorasState = { error: string | null; success: boolean };

export async function registrarHoras(
  taskId: string,
  requirementId: string,
  phaseNumber: number,
  _prevState: RegistrarHorasState,
  formData: FormData
): Promise<RegistrarHorasState> {
  const profile = await requireAdmin();

  const hoursSpentRaw = formData.get("hoursSpent");
  const notes = formData.get("notes");
  const loggedAtRaw = formData.get("loggedAt");

  const hoursSpent = typeof hoursSpentRaw === "string" ? Number(hoursSpentRaw) : NaN;
  if (!Number.isFinite(hoursSpent) || hoursSpent <= 0) {
    return { error: "Las horas deben ser un número mayor a cero.", success: false };
  }

  let loggedAt = new Date().toISOString();
  if (typeof loggedAtRaw === "string" && loggedAtRaw.trim() !== "") {
    const parsed = new Date(loggedAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "La fecha no es válida.", success: false };
    }
    loggedAt = parsed.toISOString();
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("activity_logs").insert({
    requirement_id: requirementId,
    task_id: taskId,
    phase_number: phaseNumber,
    title: "Registro de horas",
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    hours_spent: hoursSpent,
    logged_at: loggedAt,
    created_by: profile.userId,
  });

  if (error) {
    return { error: "No se pudo registrar las horas.", success: false };
  }

  refresh();
  return { error: null, success: true };
}
