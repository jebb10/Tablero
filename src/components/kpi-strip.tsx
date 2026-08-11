import { AlertTriangle, Clock, ListChecks, RotateCcw, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KPIs } from "@/lib/types";

function Kpi({
  icono: Icono,
  etiqueta,
  valor,
  acento,
  href,
}: {
  icono: typeof Clock;
  etiqueta: string;
  valor: string;
  acento?: boolean | "atencion";
  href?: string;
}) {
  const contenido = (
    <div
      className={cn(
        "flex flex-1 items-center gap-3 rounded-lg border bg-card p-3 min-w-[10rem]",
        acento === "atencion" && "border-status-atencion/40 bg-status-atencion/5",
      )}
    >
      <Icono
        className={cn(
          "h-5 w-5 shrink-0",
          acento === "atencion"
            ? "text-status-atencion"
            : acento
              ? "text-status-bloqueo"
              : "text-primary",
        )}
      />
      <div>
        <p className="text-xs text-muted-foreground">{etiqueta}</p>
        <p
          className={cn(
            "text-lg font-semibold leading-tight",
            acento === "atencion" && "text-status-atencion",
          )}
        >
          {valor}
        </p>
      </div>
    </div>
  );

  if (!href) return contenido;
  return (
    <a href={href} className="flex flex-1 min-w-[10rem]">
      {contenido}
    </a>
  );
}

export function KpiStrip({ kpis }: { kpis: KPIs }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Kpi icono={ListChecks} etiqueta="Requerimientos" valor={String(kpis.total)} />
      <Kpi
        icono={Timer}
        etiqueta="Horas ejecutadas / estimadas"
        valor={`${kpis.horasEjecutadasTotal.toFixed(0)} / ${kpis.horasEstimadasTotal.toFixed(0)}`}
      />
      <Kpi icono={Clock} etiqueta="En curso" valor={String(kpis.porEstado["En curso"])} />
      <Kpi
        icono={RotateCcw}
        etiqueta="Reabiertos"
        valor={String(kpis.reabiertos)}
        acento={kpis.reabiertos > 0}
      />
      <Kpi
        icono={AlertTriangle}
        etiqueta="Con bloqueo activo"
        valor={String(kpis.bloqueados)}
        acento={kpis.bloqueados > 0}
      />
    </div>
  );
}
