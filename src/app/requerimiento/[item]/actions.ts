"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getSupabaseClient } from "@/lib/supabase/server";

export type AgregarActividadState = { error: string | null; success: boolean };

const TIPOS_VALIDOS = [
  "SEGUIMIENTO",
  "PRESENTACION_FLUJO",
  "GESTION_DOCUMENTAL",
  "REFINAMIENTO_TECNICO",
  "OTRO",
];

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
    !TIPOS_VALIDOS.includes(eventType) ||
    typeof title !== "string" ||
    !title.trim()
  ) {
    return { error: "Tipo y título son obligatorios.", success: false };
  }

  const hoursSpent =
    typeof hoursSpentRaw === "string" && hoursSpentRaw.trim() !== ""
      ? Number(hoursSpentRaw)
      : null;
  const loggedAt =
    typeof loggedAtRaw === "string" && loggedAtRaw.trim() !== ""
      ? new Date(loggedAtRaw).toISOString()
      : new Date().toISOString();

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
