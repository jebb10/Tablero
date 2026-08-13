import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ErrorDatosBanner } from "@/components/error-datos-banner";
import { HorasClient } from "@/components/horas-client";
import { getReporteHoras } from "@/lib/horas-reporte";

export const dynamic = "force-dynamic";

export default async function HorasPage() {
  const { filas, error } = await getReporteHoras();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al dashboard
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Horas ejecutadas / estimadas</h1>
        <p className="text-sm text-muted-foreground">
          Detalle por requerimiento de horas estimadas por fase (Requerimientos, Diseño,
          Desarrollo) y horas ejecutadas totales.
        </p>
      </header>
      {error ? <ErrorDatosBanner soloBanner /> : <HorasClient filas={filas} />}
    </main>
  );
}
