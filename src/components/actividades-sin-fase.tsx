"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Actividad } from "@/lib/actividades-data";
import { TIPO_ACTIVIDAD_LABEL } from "@/lib/actividad-tipos";

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(
    fecha
  );
}

export function ActividadesSinFase({ actividades }: { actividades: Actividad[] }) {
  const [abierto, setAbierto] = useState(false);

  if (actividades.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2.5 bg-muted/40 px-3.5 py-2.5 text-left"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-sm font-semibold">Actividades sin fase asignada</h3>
          <span className="text-xs text-muted-foreground">
            {actividades.length} {actividades.length === 1 ? "actividad" : "actividades"} (histórico)
          </span>
        </div>
        {abierto ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {abierto && (
        <div className="flex flex-col divide-y border-t">
          {actividades.map((a) => (
            <div key={a.id} className="flex flex-wrap items-start gap-3 p-3.5 text-sm">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">
                {formatearFecha(a.loggedAt)}
              </span>
              <span className="w-40 shrink-0 rounded-full bg-muted px-2 py-0.5 text-center text-xs font-medium">
                {TIPO_ACTIVIDAD_LABEL[a.eventType] ?? a.eventType}
              </span>
              <span className="w-32 shrink-0 truncate text-xs">{a.autor ?? "—"}</span>
              <span className="w-14 shrink-0 font-mono text-xs">
                {a.hoursSpent !== null ? `${a.hoursSpent}h` : "—"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{a.title}</p>
                {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
