"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Fase } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatearFecha(fecha: Date | null): string | null {
  if (!fecha) return null;
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(fecha);
}

const ESTADO_COLOR: Record<string, string> = {
  completada: "text-status-entregado",
  "en-curso": "text-status-en-curso",
  pendiente: "text-muted-foreground",
};

const ETIQUETA_ESTADO: Record<string, string> = {
  completada: "Completado",
  "en-curso": "En curso",
  pendiente: "Pendiente",
};

export function TareasPorFase({ fases }: { fases: Fase[] }) {
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(fases.map((f) => [f.nombre, f.estado !== "completada"]))
  );

  return (
    <div className="flex flex-col gap-2.5">
      {fases.map((fase) => {
        const abierta = abiertas[fase.nombre];
        return (
          <div key={fase.nombre} className="overflow-hidden rounded-lg border">
            <button
              type="button"
              onClick={() => setAbiertas((prev) => ({ ...prev, [fase.nombre]: !prev[fase.nombre] }))}
              className="flex w-full items-center justify-between gap-2.5 bg-muted/40 px-3.5 py-2.5 text-left"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-sm font-semibold">{fase.nombre}</h3>
                <span className={cn("text-xs font-medium", ESTADO_COLOR[fase.estado])}>
                  {ETIQUETA_ESTADO[fase.estado]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {fase.tareas.length} {fase.tareas.length === 1 ? "tarea" : "tareas"}
                </span>
              </div>
              {abierta ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>

            {abierta && (
              <div className="flex flex-col divide-y border-t">
                {fase.tareas.length === 0 ? (
                  <p className="p-3.5 text-sm text-muted-foreground">
                    Sin tareas registradas en esta fase.
                  </p>
                ) : (
                  fase.tareas.map((t, idx) => {
                    const fecha = formatearFecha(t.fechaLimite);
                    const bloqueo = t.bloqueantes ?? t.notas;
                    return (
                      <div key={idx} className="flex flex-col gap-1 p-3.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium">{t.tarea}</p>
                          {t.estado && (
                            <span className="text-xs font-medium text-muted-foreground">
                              {t.estado}
                            </span>
                          )}
                        </div>
                        {t.detalle && (
                          <p className="text-xs text-muted-foreground">{t.detalle}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {t.asignado && <span>Asignado: {t.asignado}</span>}
                          {fecha && <span>Fecha límite: {fecha}</span>}
                          {t.horas !== null && <span>Horas: {t.horas}</span>}
                        </div>
                        {bloqueo && (
                          <p className="text-xs text-status-bloqueo">⚠ {bloqueo}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
