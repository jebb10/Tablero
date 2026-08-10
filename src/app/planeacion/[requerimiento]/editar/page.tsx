import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getTareasParaEdicion } from "@/lib/planeacion-data";
import { EditarFechasForm } from "@/components/planeacion/editar-fechas-form";

export const dynamic = "force-dynamic";

export default async function EditarFechasPage({
  params,
}: {
  params: Promise<{ requerimiento: string }>;
}) {
  await requireAdmin();

  const { requerimiento: slug } = await params;
  const datos = await getTareasParaEdicion(slug);
  if (!datos) notFound();

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
        <h1 className="text-2xl font-bold tracking-tight">Editar fechas planeadas</h1>
        <p className="text-sm text-muted-foreground">
          {datos.title} — {datos.code}
        </p>
      </header>

      <EditarFechasForm requirementId={datos.id} tareas={datos.tareas} />
    </main>
  );
}
