"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlaneacionRequerimiento } from "@/lib/planeacion-data";

export type FiltroConsumo = "todos" | "con" | "sin";

const FILTROS: { valor: FiltroConsumo; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "con", etiqueta: "Con consumo" },
  { valor: "sin", etiqueta: "Sin consumo" },
];

export function GanttSidebar({
  requerimientos,
  seleccionadoId,
  onSeleccionar,
  colapsado,
  onToggleColapsado,
  filtroConsumo,
  onFiltroConsumoChange,
}: {
  requerimientos: PlaneacionRequerimiento[];
  seleccionadoId: string | null;
  onSeleccionar: (id: string) => void;
  colapsado: boolean;
  onToggleColapsado: () => void;
  filtroConsumo: FiltroConsumo;
  onFiltroConsumoChange: (f: FiltroConsumo) => void;
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
        <>
          <div className="flex flex-col gap-1 px-2 pb-2">
            <select
              value={filtroConsumo}
              onChange={(e) => onFiltroConsumoChange(e.target.value as FiltroConsumo)}
              className="h-8 rounded-md border bg-transparent px-2 text-xs"
            >
              {FILTROS.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <nav className="flex flex-col gap-0.5 overflow-y-auto p-2 pt-0">
            {requerimientos.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">
                Ningún requerimiento coincide con el filtro.
              </p>
            ) : (
              requerimientos.map((r) => (
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
              ))
            )}
          </nav>
        </>
      )}
    </aside>
  );
}
