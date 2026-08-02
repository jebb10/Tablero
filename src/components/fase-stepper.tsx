import { Check, Circle, CircleDot } from "lucide-react";
import type { Fase } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatearFecha(fecha: Date | null): string | null {
  if (!fecha) return null;
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

const ETIQUETA_ESTADO = {
  completada: "Completado",
  "en-curso": "En curso",
  pendiente: "Pendiente",
} as const;

export function FaseStepper({ fases }: { fases: Fase[] }) {
  return (
    <ol className="flex flex-col">
      {fases.map((fase, i) => {
        const esUltima = i === fases.length - 1;
        const tareasActivas =
          fase.estado === "en-curso"
            ? fase.tareas.filter((t) => t.estado?.toLowerCase() !== "completada")
            : [];

        return (
          <li key={fase.nombre} className="relative pb-6 pl-8 last:pb-0">
            {!esUltima && (
              <span
                className="absolute left-[0.6rem] top-5 h-full w-px bg-border"
                aria-hidden
              />
            )}
            <span className="absolute left-0 top-0.5">
              {fase.estado === "completada" && (
                <Check className="h-5 w-5 rounded-full bg-status-entregado p-0.5 text-white" />
              )}
              {fase.estado === "en-curso" && (
                <CircleDot className="h-5 w-5 text-status-en-curso" />
              )}
              {fase.estado === "pendiente" && (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </span>

            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">{fase.nombre}</h3>
              <span
                className={cn(
                  "text-xs font-medium",
                  fase.estado === "completada" && "text-status-entregado",
                  fase.estado === "en-curso" && "text-status-en-curso",
                  fase.estado === "pendiente" && "text-muted-foreground"
                )}
              >
                {ETIQUETA_ESTADO[fase.estado]}
              </span>
            </div>
            {fase.horasEstimadas !== null && (
              <p className="text-xs text-muted-foreground">
                Horas estimadas de la fase: {fase.horasEstimadas}
              </p>
            )}

            {tareasActivas.length > 0 && (
              <ul className="mt-2 flex flex-col gap-2">
                {tareasActivas.map((t, idx) => {
                  const fecha = formatearFecha(t.fechaLimite);
                  const bloqueo = t.bloqueantes ?? t.notas;
                  return (
                    <li
                      key={idx}
                      className="rounded-md border bg-muted/40 p-2 text-sm"
                    >
                      <p className="font-medium">{t.tarea}</p>
                      {t.detalle && (
                        <p className="text-xs text-muted-foreground">{t.detalle}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {t.estado && <span>Estado: {t.estado}</span>}
                        {fecha && <span>Fecha límite: {fecha}</span>}
                      </div>
                      {bloqueo && (
                        <p className="mt-1 text-xs text-status-bloqueo">
                          ⚠ {bloqueo}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
