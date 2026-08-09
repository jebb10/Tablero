"use server";

import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

// Nunca redirigir fuera del propio sitio (open redirect): `next` debe ser
// una ruta relativa que empiece por "/" y no "//" (protocol-relative).
function rutaSegura(next: FormDataEntryValue | null): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const next = rutaSegura(formData.get("next"));

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { error: "Correo o contraseña incorrectos." };
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  // redirect() lanza una excepción de control — debe quedar fuera de
  // cualquier try/catch, o el catch se la comería.
  redirect(next);
}

export async function cerrarSesion() {
  const supabase = await getSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login?msg=logged-out");
}
