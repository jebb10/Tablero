import { AlertCircle, AlertTriangle, Clock, ListChecks, Timer } from "lucide-react";
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
      className={`flex flex-1 items-center gap-3 rounded-lg border bg-card p-3 min-w-[10rem] ${
        acento === "atencion" ? "border-status-atencion/40 bg-status-atencion/5" : ""
      }`}
    >
      <Icono
        className={`h-5 w-5 shrink-0 ${
          acento === "atencion"
            ? "text-status-atencion"
            : acento
              ? "text-status-bloqueo"
              : "text-primary"
        }`}
      />
      <div>
        <p className="text-xs text-muted-foreground">{etiqueta}</p>
        <p
          className={`text-lg font-semibold leading-tight ${
            acento === "atencion" ? "text-status-atencion" : ""
          }`}
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
        icono={AlertTriangle}
        etiqueta="Con bloqueo activo"
        valor={String(kpis.bloqueados)}
        acento={kpis.bloqueados > 0}
      />
      <Kpi
        icono={AlertCircle}
        etiqueta="Calidad de datos"
        valor={`${kpis.calidad.camposFaltantes} campos`}
        acento="atencion"
        href="#calidad-datos"
      />
    </div>
  );
}
