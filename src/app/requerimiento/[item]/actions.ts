"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getSupabaseClient } from "@/lib/supabase/server";
import { TIPOS_ACTIVIDAD_VALIDOS } from "@/lib/actividad-tipos";

export type AgregarActividadState = { error: string | null; success: boolean };

export async function agregarActividad(
  requirementId: string,
  _prevState: AgregarActividadState,
  formData: FormData
): Promise<AgregarActividadState> {
  const profile = await requireAdmin();

  const eventType = formData.get("eventType");
  const title = formData.get("title");
  const notes = formData.get("notes");
  const hoursSpentRaw = formData.get("hoursSpent");
  const loggedAtRaw = formData.get("loggedAt");

  if (
    typeof eventType !== "string" ||
    !TIPOS_ACTIVIDAD_VALIDOS.includes(eventType as (typeof TIPOS_ACTIVIDAD_VALIDOS)[number]) ||
    typeof title !== "string" ||
    !title.trim()
  ) {
    return { error: "Tipo y título son obligatorios.", success: false };
  }

  let hoursSpent: number | null = null;
  if (typeof hoursSpentRaw === "string" && hoursSpentRaw.trim() !== "") {
    const parsed = Number(hoursSpentRaw);
    if (!Number.isFinite(parsed)) {
      return { error: "Las horas deben ser un número válido.", success: false };
    }
    hoursSpent = parsed;
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
    event_type: eventType,
    title: title.trim(),
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
    hours_spent: hoursSpent,
    logged_at: loggedAt,
    created_by: profile.userId,
  });

  if (error) {
    return { error: "No se pudo guardar la actividad.", success: false };
  }

  refresh();
  return { error: null, success: true };
}
