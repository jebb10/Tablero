import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { RequerimientoForm } from "@/components/requerimiento-form";
import { crearRequerimiento } from "@/app/actions/requirements";

export default async function NuevoRequerimientoPage() {
  await requireAdmin();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Volver al dashboard
      </Link>

      <div className="rounded-xl border bg-card p-5">
        <h1 className="mb-4 text-lg font-semibold">Nuevo requerimiento</h1>
        <RequerimientoForm action={crearRequerimiento} textoBotonGuardar="Crear requerimiento" />
      </div>
    </main>
  );
}
