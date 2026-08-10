import { cn } from "@/lib/utils";
import type { PlaneacionRequerimiento } from "@/lib/planeacion-data";
import { SEMAFORO_BAR_CLASS } from "@/lib/semaforo";

const DIA_MS = 86_400_000;
const PX_POR_DIA = 6;
const ANCHO_MIN_PX = 14;

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(fecha);
}

export function GanttTimeline({ requerimiento }: { requerimiento: PlaneacionRequerimiento }) {
  const todasLasFechas = requerimiento.fases
    .flatMap((f) => f.tareas)
    .flatMap((t) => [t.start, t.end])
    .filter((d): d is Date => d !== null);

  if (todasLasFechas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Ninguna tarea de este requerimiento tiene fecha límite registrada.
      </div>
    );
  }

  const minFecha = new Date(Math.min(...todasLasFechas.map((d) => d.getTime())));
  const maxFecha = new Date(Math.max(...todasLasFechas.map((d) => d.getTime())));
  const anchoTotalPx = Math.max(
    ((maxFecha.getTime() - minFecha.getTime()) / DIA_MS) * PX_POR_DIA + ANCHO_MIN_PX,
    240
  );

  return (
    <div className="flex flex-col gap-4 overflow-x-auto rounded-lg border bg-card p-4">
      <div className="flex justify-between text-xs text-muted-foreground" style={{ minWidth: anchoTotalPx }}>
        <span>{formatearFecha(minFecha)}</span>
        <span>{formatearFecha(maxFecha)}</span>
      </div>

      {requerimiento.fases.map((fase) => (
        <div key={fase.phaseNumber} className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {fase.phaseName}
          </h3>
          {fase.tareas.length === 0 ? (
            <p className="pl-1 text-xs text-muted-foreground/70">Sin tareas</p>
          ) : (
            fase.tareas.map((tarea) => {
              const sinFecha = !tarea.start || !tarea.end;
              const offsetPx = sinFecha
                ? 0
                : ((tarea.start!.getTime() - minFecha.getTime()) / DIA_MS) * PX_POR_DIA;
              const anchoPx = sinFecha
                ? 0
                : Math.max(
                    ((tarea.end!.getTime() - tarea.start!.getTime()) / DIA_MS) * PX_POR_DIA,
                    ANCHO_MIN_PX
                  );

              const offsetHitoPx = sinFecha
                ? 0
                : ((tarea.end!.getTime() - minFecha.getTime()) / DIA_MS) * PX_POR_DIA;

              return (
                <div
                  key={tarea.id}
                  className="flex items-center gap-2 text-sm"
                  style={{ minWidth: anchoTotalPx }}
                >
                  <span className="w-48 shrink-0 truncate text-muted-foreground" title={tarea.taskName}>
                    {tarea.taskName}
                  </span>
                  <div className="relative h-3 flex-1">
                    {!sinFecha && (
                      <div
                        className={cn(
                          "absolute h-3 rounded-sm",
                          SEMAFORO_BAR_CLASS[tarea.semaforo],
                          !tarea.plannedDatesConfirmed &&
                            "text-white/50 bg-[repeating-linear-gradient(45deg,currentColor,currentColor_3px,transparent_3px,transparent_6px)]"
                        )}
                        style={{ left: offsetPx, width: anchoPx }}
                        title={`${tarea.status}${tarea.start ? ` — ${formatearFecha(tarea.start)}` : ""}${
                          tarea.plannedDatesConfirmed ? "" : " (fecha estimada, no confirmada)"
                        }`}
                      />
                    )}
                    {tarea.milestone && !sinFecha && (
                      <span
                        className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-primary"
                        style={{ left: offsetHitoPx }}
                        title={`Hito: ${tarea.milestone}`}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}
