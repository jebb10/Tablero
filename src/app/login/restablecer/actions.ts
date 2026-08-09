"use server";

import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/server";

export type RestablecerState = { error: string | null };

export async function restablecerAction(
  _prevState: RestablecerState,
  formData: FormData,
): Promise<RestablecerState> {
  const password = formData.get("password");

  if (typeof password !== "string" || password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "No se pudo actualizar la contraseña. Solicita un nuevo enlace." };
  }

  // La sesión de recuperación ya es una sesión válida — no hace falta
  // volver a loguearse, se entra directo con la contraseña ya actualizada.
  redirect("/");
}
