"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { CalidadDatos } from "@/lib/types";

export function DataQualityPanel({ calidad }: { calidad: CalidadDatos }) {
  const [expandido, setExpandido] = useState(false);

  if (calidad.camposFaltantes === 0) return null;

  return (
    <div
      id="calidad-datos"
      className="overflow-hidden rounded-xl border border-status-atencion/40 bg-status-atencion/5 scroll-mt-4"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpandido((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpandido((v) => !v);
        }}
        className="flex cursor-pointer items-center justify-between gap-3 p-3.5"
      >
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-status-atencion" />
          <p className="text-sm font-semibold text-status-atencion">
            Calidad de datos: {calidad.camposFaltantes} campos incompletos en{" "}
            {calidad.requerimientosAfectados} requerimientos
          </p>
        </div>
        {expandido ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-status-atencion" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-status-atencion" />
        )}
      </div>
      {expandido && (
        <div className="border-t border-status-atencion/40 bg-card px-3.5 pb-3 pt-1.5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Requerimiento</th>
                <th className="py-2 font-medium">Campo faltante</th>
              </tr>
            </thead>
            <tbody>
              {calidad.filas.map((fila, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-2">{fila.req}</td>
                  <td className="py-2 text-status-atencion">{fila.campo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
