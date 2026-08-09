import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/server";

export type Role = "admin" | "viewer";

export type Profile = {
  userId: string;
  email: string;
  role: Role;
  fullName: string | null;
};

// auth.getUser() valida el token contra Supabase Auth en cada llamada — a
// diferencia de getSession(), no confía ciegamente en la cookie.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await getSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Sin fila en `profiles` = sin rol asignado = no autorizado, aunque la
  // cuenta exista en auth.users (ver scripts/create_user.mjs).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role as Role,
    fullName: profile.full_name,
  };
});

export async function requireAuth(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.role !== "admin") {
    redirect("/");
  }
  return profile;
}
