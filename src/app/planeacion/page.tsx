import { ErrorDatosBanner } from "@/components/error-datos-banner";
import { PlaneacionClient } from "@/components/planeacion/planeacion-client";
import { getPlaneacionData } from "@/lib/planeacion-data";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PlaneacionPage() {
  const { requerimientos, error } = await getPlaneacionData();
  const perfil = await getCurrentProfile();
  const esAdmin = perfil?.role === "admin";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Planeación</h1>
        <p className="text-sm text-muted-foreground">
          Vista Gantt por requerimiento — fases y tareas con fecha límite.
        </p>
      </header>
      {error ? (
        <ErrorDatosBanner soloBanner />
      ) : (
        <PlaneacionClient requerimientos={requerimientos} esAdmin={esAdmin} />
      )}
    </main>
  );
}
