import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getRequerimientoParaEditar } from "@/lib/requerimiento-data";
import { RequerimientoForm } from "@/components/requerimiento-form";
import { actualizarRequerimiento } from "@/app/actions/requirements";

export default async function EditarRequerimientoPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  await requireAdmin();
  const { item: slug } = await params;
  const requerimiento = await getRequerimientoParaEditar(slug);
  if (!requerimiento) notFound();

  const accion = actualizarRequerimiento.bind(null, requerimiento.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Link
        href={`/requerimiento/${slug}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al requerimiento
      </Link>

      <div className="rounded-xl border bg-card p-5">
        <h1 className="mb-4 text-lg font-semibold">Editar requerimiento</h1>
        <RequerimientoForm
          action={accion}
          valoresIniciales={requerimiento}
          textoBotonGuardar="Guardar cambios"
        />
      </div>
    </main>
  );
}
