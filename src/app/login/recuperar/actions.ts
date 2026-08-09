"use server";

import { headers } from "next/headers";
import { getSupabaseClient } from "@/lib/supabase/server";

export type RecuperarState = { sent: boolean };

export async function recuperarAction(
  _prevState: RecuperarState,
  formData: FormData,
): Promise<RecuperarState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email) {
    return { sent: false };
  }

  const supabase = await getSupabaseClient();
  const origin = (await headers()).get("origin");

  // Nunca revelar si el correo existe o no — mismo resultado siempre,
  // coincide con el copy "Si el correo existe...".
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/login/restablecer`,
  });

  return { sent: true };
}
