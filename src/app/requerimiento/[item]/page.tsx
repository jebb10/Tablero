import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArchivoBloqueadoBanner } from "@/components/archivo-bloqueado-banner";
import { FaseStepper } from "@/components/fase-stepper";
import { agruparPorFase } from "@/lib/fases";
import { PROJECT_SLUG } from "@/lib/project";
import { getSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type RequerimientoDetalle = Pick<
  Database["public"]["Tables"]["requirements"]["Row"],
  | "id"
  | "code"
  | "title"
  | "month_label"
  | "complexity"
  | "has_detail_tracking"
  | "estimated_hours"
  | "executed_hours"
>;

export default async function RequerimientoPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item: slug } = await params;
  const supabase = getSupabaseClient();

  let requerimiento: RequerimientoDetalle | null;

  try {
    const { data: proyecto, error: errorProyecto } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", PROJECT_SLUG)
      .single();
    if (errorProyecto || !proyecto) throw errorProyecto ?? new Error("Proyecto no encontrado");

    const { data, error } = await supabase
      .from("requirements")
      .select(
        "id, code, title, month_label, complexity, has_detail_tracking, estimated_hours, executed_hours"
      )
      .eq("project_id", proyecto.id)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    requerimiento = data;
  } catch {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <ArchivoBloqueadoBanner soloBanner />
      </main>
    );
  }

  if (!requerimiento) {
    notFound();
  }

  let fases = null;
  if (requerimiento.has_detail_tracking) {
    const { data: tareas } = await supabase
      .from("requirement_tasks")
      .select(
        "phase_number, phase_name, task_name, detail, status, estimated_hours, due_date, completed_date, milestone, blockers, notes, sort_order"
      )
      .eq("requirement_id", requerimiento.id);
    fases = agruparPorFase(tareas ?? []);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al dashboard
      </Link>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">{requerimiento.title}</h1>
        <p className="text-sm text-muted-foreground">{requerimiento.code}</p>
      </header>

      {!fases ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <p className="font-medium">Sin detalle disponible</p>
          <p className="text-sm">
            Este requerimiento todavía no tiene tareas registradas por fase.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border bg-card p-4 text-sm">
            {requerimiento.month_label && (
              <span>
                <span className="text-muted-foreground">Mes:</span> {requerimiento.month_label}
              </span>
            )}
            {requerimiento.complexity && (
              <span>
                <span className="text-muted-foreground">Complejidad:</span>{" "}
                {requerimiento.complexity}
              </span>
            )}
            {requerimiento.estimated_hours !== null && (
              <span>
                <span className="text-muted-foreground">Horas estimadas:</span>{" "}
                {requerimiento.estimated_hours}
              </span>
            )}
            {requerimiento.executed_hours !== null && (
              <span>
                <span className="text-muted-foreground">Horas consumidas:</span>{" "}
                {requerimiento.executed_hours}
              </span>
            )}
          </div>

          <FaseStepper fases={fases} />
        </>
      )}
    </main>
  );
}
