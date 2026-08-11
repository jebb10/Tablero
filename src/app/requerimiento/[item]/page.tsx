import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ErrorDatosBanner } from "@/components/error-datos-banner";
import { TareasPorFase } from "@/components/tareas-por-fase";
import { ActividadesSinFase } from "@/components/actividades-sin-fase";
import { getRequerimientoDetalle } from "@/lib/requerimiento-data";
import { getActividades } from "@/lib/actividades-data";
import { dbAEstado } from "@/lib/estados";
import { construirControlesTareas } from "@/lib/tareas-controles";

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

  const { actividades, error: errorActividades } = await getActividades(requerimiento.id);
  const actividadesSinFase = actividades.filter((a) => a.taskId == null);

  const horasEstimadas = requerimiento.estimated_hours;
  const horasEjecutadas = requerimiento.executed_hours;
  const horasRestantes =
    horasEstimadas !== null && horasEjecutadas !== null ? horasEstimadas - horasEjecutadas : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al dashboard
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">{requerimiento.code}</span>
          <Badge variant="secondary">{dbAEstado(requerimiento.status)}</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{requerimiento.title}</h1>
        {requerimiento.description && (
          <p className="max-w-xl text-sm text-muted-foreground">{requerimiento.description}</p>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {requerimiento.client_stakeholder && (
            <span>
              <span className="text-muted-foreground">Cliente:</span>{" "}
              {requerimiento.client_stakeholder}
            </span>
          )}
          {requerimiento.assignees && requerimiento.assignees.length > 0 && (
            <span>
              <span className="text-muted-foreground">Asignado:</span>{" "}
              {requerimiento.assignees.join(", ")}
            </span>
          )}
        </div>
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
          {errorActividades && <ErrorDatosBanner soloBanner />}
          <ActividadesSinFase actividades={actividadesSinFase} />

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Horas estimadas</p>
              <p className="text-xl font-bold">{horasEstimadas ?? "—"}h</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Horas consumidas</p>
              <p className="text-xl font-bold">{horasEjecutadas ?? "—"}h</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Horas restantes</p>
              <p className="text-xl font-bold">{horasRestantes ?? "—"}h</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 text-base font-semibold">Tareas por fase</h2>
            <TareasPorFase fases={fases} {...construirControlesTareas(fases, requerimiento.id)} />
          </div>

          {requerimiento.dev_environment_url ? (
            <a
              href={requerimiento.dev_environment_url}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium"
            >
              <Link2 className="h-4 w-4" />
              Link del desarrollo
            </a>
          ) : (
            <span className="flex w-fit items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
              <Link2 className="h-4 w-4" />
              Sin enlace configurado
            </span>
          )}
        </>
      )}
    </main>
  );
}
