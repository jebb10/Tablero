"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Diamond, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiStrip } from "@/components/kpi-strip";
import { ErrorDatosBanner } from "@/components/error-datos-banner";
import { PdfReport } from "@/components/pdf-report";
import { RequerimientoCard } from "@/components/requerimiento-card";
import { cn } from "@/lib/utils";
import type { Estado, HitoProximo, KPIs, Requerimiento } from "@/lib/types";
import { calcularSemaforo, SEMAFORO_TEXT_CLASS } from "@/lib/semaforo";
import { formatearFecha as formatearFechaBase } from "@/lib/fechas";
import { ESTADOS_ENTREGA_CUMPLIDA } from "@/lib/kpis";

const BLOQUES: { estado: Estado; etiqueta: string; dot: string; id?: string }[] = [
  { estado: "En curso", etiqueta: "En curso", dot: "bg-status-en-curso", id: "en-curso" },
  { estado: "Pausado", etiqueta: "Pausados", dot: "bg-status-pausado" },
  { estado: "No iniciado", etiqueta: "No iniciados", dot: "bg-status-no-iniciado" },
  {
    estado: "Entregado en producción",
    etiqueta: "Entregados en producción",
    dot: "bg-status-entregado",
  },
];

const ESTADO_CERRADO: Estado = "Cerrado por cambio de alcance";

function ordenarPorFechaLimite(a: Requerimiento, b: Requerimiento): number {
  if (a.fechaLimite && b.fechaLimite) {
    return a.fechaLimite.getTime() - b.fechaLimite.getTime();
  }
  if (a.fechaLimite) return -1;
  if (b.fechaLimite) return 1;
  return a.nombre.localeCompare(b.nombre);
}

function formatearFecha(fecha: Date | null): string {
  return formatearFechaBase(fecha) ?? "Sin fecha";
}

export function DashboardClient({
  requerimientos,
  kpis,
  hitosProximos,
  error,
}: {
  requerimientos: Requerimiento[];
  kpis: KPIs;
  hitosProximos: HitoProximo[];
  error?: boolean;
}) {
  const [cerradosExpandido, setCerradosExpandido] = useState(false);

  const cerrados = useMemo(
    () => requerimientos.filter((r) => r.estado === ESTADO_CERRADO).sort(ordenarPorFechaLimite),
    [requerimientos]
  );

  const nombresReabiertos = useMemo(
    () =>
      requerimientos
        .filter((r) => r.reabierto > 0 && !ESTADOS_ENTREGA_CUMPLIDA.includes(r.estado))
        .map((r) => r.nombre),
    [requerimientos]
  );

  const nombresBloqueados = useMemo(
    () =>
      requerimientos
        .filter((r) => r.estado === "En curso" && r.tieneTareaBloqueda)
        .map((r) => r.nombre),
    [requerimientos]
  );

  const proximasFechas = useMemo(
    () =>
      requerimientos
        .filter((r) => r.estado === "En curso" && r.proximaActividadFecha !== null)
        .sort((a, b) => a.proximaActividadFecha!.getTime() - b.proximaActividadFecha!.getTime())
        .slice(0, 4),
    [requerimientos]
  );

  return (
    <div className="flex flex-col gap-6">
      {error && <ErrorDatosBanner />}

      <div
        className={cn(
          "flex flex-col gap-6 print:hidden",
          error && "pointer-events-none opacity-45 grayscale-[0.6]"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <KpiStrip
            kpis={kpis}
            nombresReabiertos={nombresReabiertos}
            nombresBloqueados={nombresBloqueados}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <FileDown />
              Exportar PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2.5 rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Próximas fechas límite</h2>
            {proximasFechas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin fechas límite registradas.</p>
            ) : (
              proximasFechas.map((r) => (
                <Link
                  key={r.item}
                  href={r.tieneDetalle ? `/requerimiento/${r.slug}` : "#"}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2",
                    !r.tieneDetalle && "pointer-events-none"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium leading-tight">{r.nombre}</p>
                    <p className="text-xs text-muted-foreground">{r.item}</p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold whitespace-nowrap",
                      SEMAFORO_TEXT_CLASS[calcularSemaforo(r.proximaActividadFecha)]
                    )}
                  >
                    {formatearFecha(r.proximaActividadFecha)}
                  </span>
                </Link>
              ))
            )}
          </div>
          <div className="flex flex-col gap-2.5 rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Hitos próximos</h2>
            {hitosProximos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin hitos próximos registrados.</p>
            ) : (
              hitosProximos.map((h, i) => (
                <Link
                  key={`${h.requerimientoCodigo}-${i}`}
                  href={h.requerimientoSlug ? `/requerimiento/${h.requerimientoSlug}` : "#"}
                  className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2"
                >
                  <Diamond className="h-2.5 w-2.5 shrink-0 fill-primary text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{h.nombre}</p>
                    <p className="text-xs text-muted-foreground">{h.requerimientoCodigo}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatearFecha(h.fecha)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

      {BLOQUES.map(({ estado, etiqueta, dot, id }) => {
        const items = requerimientos
          .filter((r) => r.estado === estado)
          .sort(ordenarPorFechaLimite);
        return (
          <section key={estado} id={id} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
              {etiqueta} ({items.length})
            </h2>
            {items.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Sin requerimientos en este estado.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {items.map((r) => (
                  <RequerimientoCard key={r.item} req={r} />
                ))}
              </div>
            )}
          </section>
        );
        })}

      {cerrados.length > 0 && (
        <div className="overflow-hidden rounded-xl border">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setCerradosExpandido((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setCerradosExpandido((v) => !v);
            }}
            className="flex cursor-pointer items-center justify-between gap-3 p-3.5"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Cerrados por cambio de alcance ({cerrados.length})
            </h2>
            {cerradosExpandido ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
          {cerradosExpandido && (
            <div className="grid grid-cols-1 gap-3 border-t p-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {cerrados.map((r) => (
                <RequerimientoCard key={r.item} req={r} />
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      <PdfReport requerimientos={requerimientos} kpis={kpis} />
    </div>
  );
}
