import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ErrorDatosBanner } from "@/components/error-datos-banner";
import { FaseStepper } from "@/components/fase-stepper";
import { getRequerimientoDetalle } from "@/lib/requerimiento-data";

export const dynamic = "force-dynamic";

export default async function RequerimientoPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item: slug } = await params;
  const { error, requerimiento, fases } = await getRequerimientoDetalle(slug);

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <ErrorDatosBanner soloBanner />
      </main>
    );
  }

  if (!requerimiento) {
    notFound();
  }

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
        <h1 className="text-2xl font-bold tracking-tight">{requerimiento.title}</h1>
        <p className="text-sm text-muted-foreground">{requerimiento.code}</p>
      </header>

      {!fases ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <p className="font-medium">Sin detalle disponible</p>
          <p className="text-sm">
            Este requerimiento todavía no tiene tareas registradas por fase.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border bg-card p-4 text-sm">
            {requerimiento.month_label && (
              <span>
                <span className="text-muted-foreground">Mes:</span> {requerimiento.month_label}
              </span>
            )}
            {requerimiento.complexity && (
              <span>
                <span className="text-muted-foreground">Complejidad:</span>{" "}
                {requerimiento.complexity}
              </span>
            )}
            {requerimiento.estimated_hours !== null && (
              <span>
                <span className="text-muted-foreground">Horas estimadas:</span>{" "}
                {requerimiento.estimated_hours}
              </span>
            )}
            {requerimiento.executed_hours !== null && (
              <span>
                <span className="text-muted-foreground">Horas consumidas:</span>{" "}
                {requerimiento.executed_hours}
              </span>
            )}
          </div>

          <FaseStepper fases={fases} />
        </>
      )}
    </main>
  );
}
