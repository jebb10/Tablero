"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getSupabaseClient } from "@/lib/supabase/server";
import { registrarHorasSchema } from "@/lib/actividad-schema";

export type RegistrarHorasState = { error: string | null; success: boolean };

export async function registrarHoras(
  taskId: string,
  requirementId: string,
  phaseNumber: number,
  _prevState: RegistrarHorasState,
  formData: FormData
): Promise<RegistrarHorasState> {
  const profile = await requireAdmin();

  const parsed = registrarHorasSchema.safeParse({
    hoursSpent: formData.get("hoursSpent"),
    notes: formData.get("notes"),
    loggedAt: formData.get("loggedAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, success: false };
  }
  const loggedAt = parsed.data.loggedAt
    ? new Date(parsed.data.loggedAt).toISOString()
    : new Date().toISOString();

  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("activity_logs").insert({
    requirement_id: requirementId,
    task_id: taskId,
    phase_number: phaseNumber,
    title: "Registro de horas",
    notes: parsed.data.notes,
    hours_spent: parsed.data.hoursSpent,
    logged_at: loggedAt,
    created_by: profile.userId,
  });

  if (error) {
    return { error: "No se pudo registrar las horas.", success: false };
  }

  refresh();
  return { error: null, success: true };
}
