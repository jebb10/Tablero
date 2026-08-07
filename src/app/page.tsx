import { ErrorDatosBanner } from "@/components/error-datos-banner";
import { DashboardClient } from "@/components/dashboard-client";
import { getDashboardData } from "@/lib/dashboard-data";

// Sin esto, Next intenta pre-renderizar esta página en build time (una sola
// vez, con datos congelados) en vez de consultar Supabase en cada request.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { requerimientos, kpis, error, ultimoResultadoNulo } = await getDashboardData();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Dashboard 414 — Bolsas de Horas
        </h1>
        <p className="text-sm text-muted-foreground">
          Estado actual de los requerimientos del proyecto Positiva Web 414.
        </p>
      </header>
      {ultimoResultadoNulo ? (
        <ErrorDatosBanner soloBanner />
      ) : (
        <DashboardClient requerimientos={requerimientos} kpis={kpis} error={error} />
      )}
    </main>
  );
}
