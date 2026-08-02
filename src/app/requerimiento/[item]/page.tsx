import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArchivoBloqueadoBanner } from "@/components/archivo-bloqueado-banner";
import { FaseStepper } from "@/components/fase-stepper";
import { loadWorkbook } from "@/lib/excel/workbook";
import { getRequerimientos } from "@/lib/excel/dashboard-sheet";
import { getDetalle } from "@/lib/excel/detalle-sheet";
import type { Requerimiento } from "@/lib/types";

export default async function RequerimientoPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item: slug } = await params;

  let requerimientos: Requerimiento[];
  let wb: ReturnType<typeof loadWorkbook>;
  try {
    wb = loadWorkbook();
    requerimientos = getRequerimientos(wb);
  } catch {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <ArchivoBloqueadoBanner soloBanner />
      </main>
    );
  }

  const requerimiento = requerimientos.find((r) => r.slug === slug);

  if (!requerimiento) {
    notFound();
  }

  const detalle = requerimiento.hojaDetalle
    ? getDetalle(requerimiento.hojaDetalle, wb)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al dashboard
      </Link>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">{requerimiento.nombre}</h1>
        <p className="text-sm text-muted-foreground">{requerimiento.item}</p>
      </header>

      {!detalle ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <p className="font-medium">Sin detalle disponible</p>
          <p className="text-sm">
            Este requerimiento todavía no tiene una hoja de detalle asociada en el
            Excel.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border bg-card p-4 text-sm">
            {detalle.mes && (
              <span>
                <span className="text-muted-foreground">Mes:</span> {detalle.mes}
              </span>
            )}
            {detalle.complejidad && (
              <span>
                <span className="text-muted-foreground">Complejidad:</span>{" "}
                {detalle.complejidad}
              </span>
            )}
            {detalle.prioridad && (
              <span>
                <span className="text-muted-foreground">Prioridad:</span>{" "}
                {detalle.prioridad}
              </span>
            )}
            {detalle.horasTotalesEstimadas !== null && (
              <span>
                <span className="text-muted-foreground">Horas estimadas:</span>{" "}
                {detalle.horasTotalesEstimadas}
              </span>
            )}
            {detalle.horasTotalesConsumidas !== null && (
              <span>
                <span className="text-muted-foreground">Horas consumidas:</span>{" "}
                {detalle.horasTotalesConsumidas}
              </span>
            )}
            {detalle.totalesTexto && (
              <span>
                <span className="text-muted-foreground">Avance:</span>{" "}
                {detalle.totalesTexto}
              </span>
            )}
          </div>

          <FaseStepper fases={detalle.fases} />
        </>
      )}
    </main>
  );
}
