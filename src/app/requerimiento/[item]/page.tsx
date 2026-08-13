import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, SplitSquareHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorDatosBanner } from "@/components/error-datos-banner";
import { RoleGate } from "@/components/auth/role-gate";
import { RequerimientoDetalleClient } from "@/components/requerimiento-detalle-client";
import { getRequerimientoDetalle } from "@/lib/requerimiento-data";
import { construirControlesTareas } from "@/lib/tareas-controles";

export const dynamic = "force-dynamic";

export default async function RequerimientoPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item: slug } = await params;
  const { error, requerimiento, fases, errorTareas, reemplazadoPor } = await getRequerimientoDetalle(slug);

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

  const totalTareas = fases?.reduce((acc, f) => acc + f.tareas.length, 0) ?? 0;

  return (
    <RequerimientoDetalleClient
      requerimiento={requerimiento}
      fases={fases ?? []}
      errorTareas={errorTareas}
      reemplazadoPor={reemplazadoPor}
      totalTareas={totalTareas}
      controlesTareas={construirControlesTareas(fases ?? [], requerimiento.id)}
      accionesAdmin={
        <RoleGate role="admin">
          <div className="flex flex-wrap gap-2">
            <Link href={`/requerimiento/${slug}/editar`}>
              <Button type="button" size="sm" variant="outline">
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            </Link>
            <Link href={`/requerimiento/${slug}/cambio-de-alcance`}>
              <Button type="button" size="sm" variant="outline">
                <SplitSquareHorizontal className="h-3.5 w-3.5" />
                Cambio de alcance
              </Button>
            </Link>
          </div>
        </RoleGate>
      }
    />
  );
}
