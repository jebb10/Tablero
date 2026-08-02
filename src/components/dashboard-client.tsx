"use client";

import { useMemo, useState, useTransition } from "react";
import { FileDown, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiStrip } from "@/components/kpi-strip";
import { DataQualityPanel } from "@/components/data-quality-panel";
import { ArchivoBloqueadoBanner } from "@/components/archivo-bloqueado-banner";
import { PdfReport } from "@/components/pdf-report";
import { RequerimientoCard } from "@/components/requerimiento-card";
import { sincronizar } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { Estado, KPIs, Requerimiento } from "@/lib/types";

const BLOQUES: { estado: Estado; etiqueta: string; dot: string }[] = [
  { estado: "En curso", etiqueta: "En curso", dot: "bg-status-en-curso" },
  { estado: "Pausado", etiqueta: "Pausados", dot: "bg-status-pausado" },
  { estado: "No iniciado", etiqueta: "No iniciados", dot: "bg-status-no-iniciado" },
  {
    estado: "Entregado en producción",
    etiqueta: "Entregados en producción",
    dot: "bg-status-entregado",
  },
];

const TODOS = "__todos__";

function ordenarPorFechaLimite(a: Requerimiento, b: Requerimiento): number {
  if (a.fechaLimite && b.fechaLimite) {
    return a.fechaLimite.getTime() - b.fechaLimite.getTime();
  }
  if (a.fechaLimite) return -1;
  if (b.fechaLimite) return 1;
  return a.nombre.localeCompare(b.nombre);
}

export function DashboardClient({
  requerimientos,
  kpis,
  error,
}: {
  requerimientos: Requerimiento[];
  kpis: KPIs;
  error?: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [complejidad, setComplejidad] = useState(TODOS);
  const [mes, setMes] = useState(TODOS);
  const [isPending, startTransition] = useTransition();

  const complejidades = useMemo(
    () =>
      Array.from(
        new Set(requerimientos.map((r) => r.complejidad).filter(Boolean))
      ) as string[],
    [requerimientos]
  );
  const meses = useMemo(
    () => Array.from(new Set(requerimientos.map((r) => r.mes).filter(Boolean))) as string[],
    [requerimientos]
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return requerimientos.filter((r) => {
      if (texto && !`${r.nombre} ${r.item}`.toLowerCase().includes(texto)) {
        return false;
      }
      if (complejidad !== TODOS && r.complejidad !== complejidad) return false;
      if (mes !== TODOS && r.mes !== mes) return false;
      return true;
    });
  }, [requerimientos, busqueda, complejidad, mes]);

  return (
    <div className="flex flex-col gap-6">
      {error && <ArchivoBloqueadoBanner />}

      <div
        className={cn(
          "flex flex-col gap-6 print:hidden",
          error && "pointer-events-none opacity-45 grayscale-[0.6]"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <KpiStrip kpis={kpis} />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <FileDown />
              Exportar PDF
            </Button>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => startTransition(() => sincronizar())}
            >
              <RefreshCw className={isPending ? "animate-spin" : ""} />
              Sincronizar
            </Button>
          </div>
        </div>

        <DataQualityPanel calidad={kpis.calidad} />

        <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[16rem]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o ID..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={complejidad}
          onValueChange={(value) => setComplejidad(value ?? TODOS)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Complejidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Toda complejidad</SelectItem>
            {complejidades.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={mes} onValueChange={(value) => setMes(value ?? TODOS)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todo mes</SelectItem>
            {meses.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {BLOQUES.map(({ estado, etiqueta, dot }) => {
        const items = filtrados
          .filter((r) => r.estado === estado)
          .sort(ordenarPorFechaLimite);
        return (
          <section key={estado} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
              {etiqueta} ({items.length})
            </h2>
            {items.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Sin requerimientos en este estado.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {items.map((r) => (
                  <RequerimientoCard key={r.item} req={r} />
                ))}
              </div>
            )}
          </section>
        );
        })}
      </div>

      <PdfReport requerimientos={requerimientos} kpis={kpis} />
    </div>
  );
}
