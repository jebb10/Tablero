import type { ReactNode } from "react";
import { getCurrentProfile } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/session";

export async function RoleGate({
  role = "admin",
  children,
  fallback = null,
}: {
  role?: Role;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== role) {
    return fallback;
  }

  return children;
}
