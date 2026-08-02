import { ArchivoBloqueadoBanner } from "@/components/archivo-bloqueado-banner";
import { DashboardClient } from "@/components/dashboard-client";
import { getDashboardData } from "@/lib/dashboard-data";

export default async function Home() {
  const { requerimientos, kpis, error, ultimoResultadoNulo } = getDashboardData();

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
        <ArchivoBloqueadoBanner soloBanner />
      ) : (
        <DashboardClient requerimientos={requerimientos} kpis={kpis} error={error} />
      )}
    </main>
  );
}
