"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCog, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  GanttTimeline,
  avanzarPeriodo,
  calcularRangoVisible,
  etiquetaPeriodo,
  type Escala,
} from "@/components/planeacion/gantt-timeline";
import { GanttSidebar, type FiltroConsumo } from "@/components/planeacion/gantt-sidebar";
import { cn } from "@/lib/utils";
import { hoyLocal } from "@/lib/fechas";
import type { PlaneacionRequerimiento } from "@/lib/planeacion-data";

const ESCALAS: { valor: Escala; etiqueta: string }[] = [
  { valor: "dia", etiqueta: "Día" },
  { valor: "semana", etiqueta: "Semana" },
  { valor: "mes", etiqueta: "Mes" },
];

/** Punto de partida de la ventana visible al seleccionar un requerimiento:
 * hoy, si cae dentro del rango real de sus tareas; si no (proyecto ya
 * cerrado, o todavía no empieza), la fecha de su primera tarea. */
function referenciaInicial(requerimiento: PlaneacionRequerimiento, hoy: Date): Date {
  const fechas = requerimiento.fases
    .flatMap((f) => f.tareas)
    .flatMap((t) => [t.start, t.end])
    .filter((d): d is Date => d !== null);
  if (fechas.length === 0) return hoy;
  const min = new Date(Math.min(...fechas.map((d) => d.getTime())));
  const max = new Date(Math.max(...fechas.map((d) => d.getTime())));
  if (hoy.getTime() >= min.getTime() && hoy.getTime() <= max.getTime()) return hoy;
  return min;
}

export function PlaneacionClient({
  requerimientos,
  esAdmin,
}: {
  requerimientos: PlaneacionRequerimiento[];
  // Calculado en el Server Component (page.tsx) -- RoleGate no se puede
  // importar aquí (usa server-only), así que la decisión de mostrar el
  // botón "Editar fechas" viaja como prop. La seguridad real la sigue
  // dando requireAdmin() en /planeacion/[requerimiento]/editar y la RLS
  // de la RPC, no este booleano.
  esAdmin: boolean;
}) {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(
    requerimientos[0]?.id ?? null
  );
  const [colapsado, setColapsado] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [escala, setEscala] = useState<Escala>("semana");
  const [filtroConsumo, setFiltroConsumo] = useState<FiltroConsumo>("todos");

  const seleccionado = requerimientos.find((r) => r.id === seleccionadoId) ?? null;
  const hoy = hoyLocal();
  const [referencia, setReferencia] = useState<Date>(() =>
    seleccionado ? referenciaInicial(seleccionado, hoy) : hoy
  );

  // Al cambiar de requerimiento (no de escala), recentrar la ventana --
  // cada requerimiento tiene su propio rango de fechas real.
  useEffect(() => {
    if (seleccionado) setReferencia(referenciaInicial(seleccionado, hoy));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionadoId]);

  const requerimientosFiltrados = requerimientos.filter((r) => {
    if (filtroConsumo === "con") return r.tieneConsumo;
    if (filtroConsumo === "sin") return !r.tieneConsumo;
    return true;
  });

  if (requerimientos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Ningún requerimiento con seguimiento de detalle tiene tareas registradas todavía.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-1 gap-4", colapsado && "gap-2")}>
      <GanttSidebar
        requerimientos={requerimientosFiltrados}
        seleccionadoId={seleccionadoId}
        onSeleccionar={setSeleccionadoId}
        colapsado={colapsado}
        onToggleColapsado={() => setColapsado((c) => !c)}
        filtroConsumo={filtroConsumo}
        onFiltroConsumoChange={setFiltroConsumo}
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
                {requerimientosFiltrados.map((r) => (
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
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{seleccionado.title}</h2>
                <p className="text-xs text-muted-foreground">{seleccionado.code}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setReferencia((r) => avanzarPeriodo(escala, r, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setReferencia(hoy)}>
                    Hoy
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setReferencia((r) => avanzarPeriodo(escala, r, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="min-w-32 text-xs font-medium text-muted-foreground">
                    {etiquetaPeriodo(escala, calcularRangoVisible(escala, referencia))}
                  </span>
                </div>
                <div className="flex rounded-md border p-0.5">
                  {ESCALAS.map((e) => (
                    <button
                      key={e.valor}
                      type="button"
                      onClick={() => setEscala(e.valor)}
                      className={cn(
                        "rounded-sm px-2 py-1 text-xs font-medium transition-colors",
                        escala === e.valor
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {e.etiqueta}
                    </button>
                  ))}
                </div>
                {esAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/planeacion/${seleccionado.slug}/editar`} />}
                  >
                    <CalendarCog className="h-4 w-4" />
                    Editar fechas
                  </Button>
                )}
              </div>
            </header>
            <GanttTimeline
              requerimiento={seleccionado}
              escala={escala}
              hoy={hoy}
              referencia={referencia}
            />
          </>
        )}
      </div>
    </div>
  );
}
