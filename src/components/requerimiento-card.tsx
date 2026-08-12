import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RequerimientoIcono } from "@/lib/icons";
import { SEMAFORO_DOT_CLASS, type Semaforo } from "@/lib/semaforo";
import type { Requerimiento } from "@/lib/types";
import { formatearFecha } from "@/lib/fechas";
import { cn } from "@/lib/utils";

const SEMAFORO_TITULO: Record<Semaforo, string> = {
  vencido: "Fecha límite vencida",
  rojo: "Fecha límite próxima (≤3 días)",
  amarillo: "Fecha límite cercana",
  verde: "Fecha límite lejana",
  "sin-fecha": "Sin fecha límite",
};

export function RequerimientoCard({ req }: { req: Requerimiento }) {
  const fecha = formatearFecha(req.fechaLimite, { conAño: true });

  const contenido = (
    <div
      className={cn(
        "flex h-full min-h-44 flex-col gap-2 rounded-lg border bg-card p-3 transition-colors",
        "hover:border-primary/50 hover:shadow-sm",
        req.tieneTareaBloqueda && "border-status-bloqueo border-2",
        !req.tieneDetalle && "bg-muted/40 text-muted-foreground"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <RequerimientoIcono
          nombre={req.nombre}
          item={req.item}
          className={cn(
            "h-5 w-5 shrink-0",
            req.tieneDetalle ? "text-primary" : "text-muted-foreground"
          )}
        />
        {req.tieneTareaBloqueda && (
          <AlertTriangle className="h-4 w-4 shrink-0 text-status-bloqueo" />
        )}
      </div>

      <p className="line-clamp-2 text-sm font-medium leading-snug">
        {req.nombre}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {req.mes && (
          <Badge variant="secondary" className="h-[18px] w-fit text-[10.5px]">
            {req.mes}
          </Badge>
        )}
        <Badge
          variant={req.faseActual ? "outline" : "secondary"}
          className="h-[18px] w-fit text-[10.5px] font-normal"
        >
          {req.faseActual ?? "Sin fase registrada"}
        </Badge>
      </div>

      {req.tieneDetalle ? (
        req.sinTareas ? (
          <div className="mt-auto flex flex-col gap-1.5">
            <Badge variant="outline" className="h-[18px] w-fit text-[10.5px] font-normal">
              Aún sin tareas registradas
            </Badge>
            <span className="font-mono text-[11px] text-muted-foreground">
              0h / {req.horasEstimadas ?? 0}h
            </span>
          </div>
        ) : (
          <div className="mt-auto flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Avance</span>
              <span
                className={cn(
                  "font-semibold",
                  req.overbudget && "text-status-overbudget"
                )}
              >
                {req.porcentajeAvance ?? 0}%
              </span>
            </div>
            <Progress value={Math.min(req.porcentajeAvance ?? 0, 100)} className="h-1.5" />
            <div className="flex flex-wrap justify-between gap-1 text-[11px]">
              <span
                className={cn(
                  "font-mono text-muted-foreground",
                  req.overbudget && "font-bold text-status-overbudget"
                )}
              >
                {req.horasEjecutadas ?? 0}h / {req.horasEstimadas ?? 0}h
              </span>
              {fecha && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", SEMAFORO_DOT_CLASS[req.semaforo])}
                    title={SEMAFORO_TITULO[req.semaforo]}
                    aria-hidden={req.semaforo === "sin-fecha"}
                  />
                  {fecha}
                </span>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="mt-auto">
          <Badge variant="outline" className="text-xs font-normal">
            Sin detalle
          </Badge>
        </div>
      )}
    </div>
  );

  return (
    <Link href={`/requerimiento/${req.slug}`} className="block h-full">
      {contenido}
    </Link>
  );
}
