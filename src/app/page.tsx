import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorDatosBanner } from "@/components/error-datos-banner";
import { DashboardClient } from "@/components/dashboard-client";
import { RoleGate } from "@/components/auth/role-gate";
import { getDashboardData } from "@/lib/dashboard-data";

// Sin esto, Next intenta pre-renderizar esta página en build time (una sola
// vez, con datos congelados) en vez de consultar Supabase en cada request.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { requerimientos, kpis, hitosProximos, error, ultimoResultadoNulo } =
    await getDashboardData();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Positiva - Página Web.
          </h1>
          <p className="text-sm text-muted-foreground">
            Estado actual de los requerimientos del proyecto Positiva Web.
          </p>
        </div>
        <RoleGate role="admin">
          <Link href="/requerimiento/nuevo">
            <Button type="button" size="sm">
              <Plus className="h-4 w-4" />
              Nuevo requerimiento
            </Button>
          </Link>
        </RoleGate>
      </header>
      {ultimoResultadoNulo ? (
        <ErrorDatosBanner soloBanner />
      ) : (
        <DashboardClient
          requerimientos={requerimientos}
          kpis={kpis}
          hitosProximos={hitosProximos}
          error={error}
        />
      )}
    </main>
  );
}
