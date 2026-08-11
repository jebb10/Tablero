import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getRequerimientoDetalle } from "@/lib/requerimiento-data";
import { TareasPorFase } from "@/components/tareas-por-fase";
import { construirControlesTareas } from "@/lib/tareas-controles";

export const dynamic = "force-dynamic";

export default async function EditarFechasPage({
  params,
}: {
  params: Promise<{ requerimiento: string }>;
}) {
  await requireAdmin();

  const { requerimiento: slug } = await params;
  const { requerimiento, fases } = await getRequerimientoDetalle(slug);
  if (!requerimiento) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <Link
        href="/planeacion"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Planeación
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Editar tareas y fechas planeadas</h1>
        <p className="text-sm text-muted-foreground">
          {requerimiento.title} — {requerimiento.code}
        </p>
      </header>

      {fases && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-base font-semibold">Tareas por fase</h2>
          <TareasPorFase fases={fases} {...construirControlesTareas(fases, requerimiento.id)} />
        </div>
      )}
    </main>
  );
}
