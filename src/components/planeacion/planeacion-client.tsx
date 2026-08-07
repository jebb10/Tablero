"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GanttSidebar } from "@/components/planeacion/gantt-sidebar";
import { GanttTimeline } from "@/components/planeacion/gantt-timeline";
import { cn } from "@/lib/utils";
import type { PlaneacionRequerimiento } from "@/lib/planeacion-data";

export function PlaneacionClient({
  requerimientos,
}: {
  requerimientos: PlaneacionRequerimiento[];
}) {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(
    requerimientos[0]?.id ?? null
  );
  const [colapsado, setColapsado] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  const seleccionado = requerimientos.find((r) => r.id === seleccionadoId) ?? null;

  if (requerimientos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Ningún requerimiento con hoja de detalle tiene tareas registradas todavía.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-1 gap-4", colapsado && "gap-2")}>
      <GanttSidebar
        requerimientos={requerimientos}
        seleccionadoId={seleccionadoId}
        onSeleccionar={setSeleccionadoId}
        colapsado={colapsado}
        onToggleColapsado={() => setColapsado((c) => !c)}
      />

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center gap-2 md:hidden">
          <Sheet open={drawerAbierto} onOpenChange={setDrawerAbierto}>
            <SheetTrigger
              render={
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              }
            >
              Requerimientos
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Requerimientos</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-0.5 overflow-y-auto p-2 pt-0">
                {requerimientos.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSeleccionadoId(r.id);
                      setDrawerAbierto(false);
                    }}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-left text-sm",
                      r.id === seleccionadoId
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {r.title}
                  </button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {seleccionado && (
          <>
            <header>
              <h2 className="font-semibold">{seleccionado.title}</h2>
              <p className="text-xs text-muted-foreground">{seleccionado.code}</p>
            </header>
            <GanttTimeline requerimiento={seleccionado} />
          </>
        )}
      </div>
    </div>
  );
}
