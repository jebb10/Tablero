"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlaneacionRequerimiento } from "@/lib/planeacion-data";

export function GanttSidebar({
  requerimientos,
  seleccionadoId,
  onSeleccionar,
  colapsado,
  onToggleColapsado,
}: {
  requerimientos: PlaneacionRequerimiento[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
  colapsado: boolean;
  onToggleColapsado: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex",
        colapsado ? "w-12" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-2">
        {!colapsado && (
          <span className="pl-1 text-xs font-semibold uppercase text-muted-foreground">
            Requerimientos
          </span>
        )}
        <Button variant="ghost" size="icon-sm" onClick={onToggleColapsado}>
          {colapsado ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      {!colapsado && (
        <nav className="flex flex-col gap-0.5 overflow-y-auto p-2 pt-0">
          {requerimientos.map((r) => (
            <button
              key={r.id}
              onClick={() => onSeleccionar(r.id)}
              className={cn(
                "rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                r.id === seleccionadoId
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="line-clamp-2">{r.title}</span>
            </button>
          ))}
        </nav>
      )}
    </aside>
  );
}
