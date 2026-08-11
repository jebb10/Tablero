"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Fase } from "@/lib/types";
import { estadoEsCompletada } from "@/lib/estados-tarea";
import { formatearFecha } from "@/lib/fechas";
import { cn } from "@/lib/utils";

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

export function TareasPorFase({
  fases,
  botonesAgregarTarea = [],
  camposFechaLimiteFase = [],
  accionesTarea = {},
}: {
  fases: Fase[];
  botonesAgregarTarea?: ReactNode[];
  camposFechaLimiteFase?: ReactNode[];
  accionesTarea?: Record<string, ReactNode>;
}) {
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(fases.map((f) => [f.nombre, f.estado !== "completada"]))
  );

  return (
    <div className="flex flex-col gap-2.5">
      {fases.map((fase, i) => {
        const abierta = abiertas[fase.nombre];
        const fechaLimiteFase = formatearFecha(fase.fechaLimiteFase);
        const completadas = fase.tareas.filter((t) => estadoEsCompletada(t.estado)).length;

        return (
          <div key={fase.nombre} className="overflow-hidden rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-muted/40 px-3.5 py-2.5">
              <button
                type="button"
                onClick={() => setAbiertas((prev) => ({ ...prev, [fase.nombre]: !prev[fase.nombre] }))}
                className="flex flex-1 items-center gap-2.5 text-left"
              >
                <h3 className="text-sm font-semibold">{fase.nombre}</h3>
                <span className={cn("text-xs font-medium", ESTADO_COLOR[fase.estado])}>
                  {ETIQUETA_ESTADO[fase.estado]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {fase.tareas.length === 0
                    ? "0 tareas"
                    : `${completadas}/${fase.tareas.length} completadas`}
                </span>
                {fechaLimiteFase && (
                  <span className="text-xs text-muted-foreground">Fase límite: {fechaLimiteFase}</span>
                )}
                {abierta ? (
                  <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
              <div className="flex shrink-0 flex-wrap items-end gap-1.5">
                {camposFechaLimiteFase[i]}
                {botonesAgregarTarea[i]}
              </div>
            </div>

            {abierta && (
              <div className="flex flex-col divide-y border-t">
                {fase.tareas.length === 0 ? (
                  <p className="p-3.5 text-sm text-muted-foreground">
                    Sin tareas registradas en esta fase.
                  </p>
                ) : (
                  fase.tareas.map((t) => {
                    const fecha = formatearFecha(t.fechaLimite);
                    const inicio = formatearFecha(t.plannedStartDate);
                    const fin = formatearFecha(t.plannedEndDate);
                    const bloqueo = t.bloqueantes ?? t.notas;
                    const sinFecha = !t.fechaLimite && !t.plannedStartDate;
                    const completada = estadoEsCompletada(t.estado);
                    return (
                      <div
                        key={t.id}
                        className={cn("flex flex-col gap-1 p-3.5", completada && "opacity-60")}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-medium">{t.tarea}</p>
                          {t.estado && (
                            <span className="text-xs font-medium text-muted-foreground">
                              {t.estado}
                            </span>
                          )}
                        </div>
                        {t.detalle && <p className="text-xs text-muted-foreground">{t.detalle}</p>}
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {t.asignado && <span>Asignado: {t.asignado}</span>}
                          {fecha && <span>Fecha límite: {fecha}</span>}
                          {(inicio || fin) && (
                            <span>
                              Planeado: {inicio ?? "—"} → {fin ?? "—"}
                            </span>
                          )}
                          {t.horas !== null && <span>Horas estimadas: {t.horas}</span>}
                          <span>Horas consumidas: {t.executedHours}h</span>
                        </div>
                        {bloqueo && <p className="text-xs text-status-bloqueo">⚠ {bloqueo}</p>}
                        {sinFecha && (
                          <p className="text-xs text-status-bloqueo">
                            ⚠ Sin fecha — no aparece en el Gantt
                          </p>
                        )}
                        {accionesTarea[t.id]}
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
