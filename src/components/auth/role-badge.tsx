import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth/session";

const ETIQUETA: Record<Role, string> = {
  admin: "Admin",
  viewer: "Viewer",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        role === "admin"
          ? "bg-warning-bg text-warning-text"
          : "bg-secondary text-muted-foreground",
      )}
    >
      {ETIQUETA[role]}
    </span>
  );
}
