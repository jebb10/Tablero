import type { ReactNode } from "react";
import type { Actividad } from "@/lib/actividades-data";

const TIPO_LABEL: Record<string, string> = {
  SEGUIMIENTO: "Seguimiento",
  PRESENTACION_FLUJO: "Presentación de flujo",
  GESTION_DOCUMENTAL: "Gestión documental",
  REFINAMIENTO_TECNICO: "Refinamiento técnico",
  OTRO: "Otro",
};

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

export function RegistroActividades({
  actividades,
  botonAgregar,
}: {
  actividades: Actividad[];
  botonAgregar?: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Registro de actividades</h2>
        {botonAgregar}
      </div>

      {actividades.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin actividades registradas.</p>
      ) : (
        <div className="flex flex-col divide-y">
          {actividades.map((a) => (
            <div key={a.id} className="flex flex-wrap items-start gap-3 py-2.5 text-sm">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">
                {formatearFecha(a.loggedAt)}
              </span>
              <span className="w-40 shrink-0 rounded-full bg-muted px-2 py-0.5 text-center text-xs font-medium">
                {TIPO_LABEL[a.eventType] ?? a.eventType}
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
    </section>
  );
}
