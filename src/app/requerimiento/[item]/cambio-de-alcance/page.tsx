import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getRequerimientoParaEditar } from "@/lib/requerimiento-data";
import { RequerimientoForm } from "@/components/requerimiento-form";
import { cerrarPorCambioDeAlcance } from "@/app/actions/requirements";

export default async function CambioDeAlcancePage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  await requireAdmin();
  const { item: slug } = await params;
  const requerimientoViejo = await getRequerimientoParaEditar(slug);
  if (!requerimientoViejo) notFound();

  const accion = cerrarPorCambioDeAlcance.bind(null, requerimientoViejo.id);

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
        <h1 className="mb-1 text-lg font-semibold">Cambio de alcance</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          &quot;{requerimientoViejo.title}&quot; ({requerimientoViejo.code}) quedará marcado como
          &quot;Cerrado por cambio de alcance&quot; y se creará este nuevo requerimiento enlazado a él.
        </p>
        <RequerimientoForm action={accion} textoBotonGuardar="Cerrar el anterior y crear este" />
      </div>
    </main>
  );
}
