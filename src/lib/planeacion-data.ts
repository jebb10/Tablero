import { calcularSemaforo, type Semaforo } from "./semaforo";
import { hoyLocal } from "./fechas";
import { PROJECT_SLUG } from "./project";
import { getSupabaseClient } from "./supabase/server";
import { FASES_ORDEN } from "./fases-orden";
import { estadoEsCompletada } from "./estados-tarea";

export interface PlaneacionTarea {
  id: string;
  taskName: string;
  status: string;
  start: Date | null;
  end: Date | null;
  semaforo: Semaforo;
  milestone: string | null;
  plannedDatesConfirmed: boolean;
  assignee: string | null;
  estimatedHours: number | null;
  executedHours: number;
}

export interface PlaneacionFase {
  phaseNumber: number;
  phaseName: string;
  tareas: PlaneacionTarea[];
  /** Fecha límite propia de la fase (independiente de sus tareas), ver
   * `requirement_phase_deadlines` -- se dibuja como hito propio en el Gantt. */
  deadline: Date | null;
}

export interface PlaneacionRequerimiento {
  id: string;
  code: string;
  slug: string;
  title: string;
  fases: PlaneacionFase[];
  /** true si alguna tarea tiene executed_hours > 0 (extensión de C1, ver
   * migración 20260810120000_c1_ext_horas_por_tarea.sql). */
  tieneConsumo: boolean;
}

export async function getPlaneacionData(): Promise<{
  requerimientos: PlaneacionRequerimiento[];
  error: boolean;
}> {
  try {
    const supabase = await getSupabaseClient();

    const { data: proyecto, error: errorProyecto } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", PROJECT_SLUG)
      .single();
    if (errorProyecto || !proyecto) throw errorProyecto ?? new Error("Proyecto no encontrado");

    const { data: requerimientos, error: errorRequerimientos } = await supabase
      .from("requirements")
      .select("id, code, slug, title")
      .eq("project_id", proyecto.id)
      .eq("has_detail_tracking", true)
      .order("code");
    if (errorRequerimientos) throw errorRequerimientos;
    if (!requerimientos || requerimientos.length === 0) {
      return { requerimientos: [], error: false };
    }

    const ids = requerimientos.map((r) => r.id);
    const { data: tareas, error: errorTareas } = await supabase
      .from("requirement_tasks")
      .select(
        "id, requirement_id, phase_number, phase_name, task_name, status, due_date, planned_start_date, planned_end_date, sort_order, milestone, planned_dates_confirmed, assignee, estimated_hours, executed_hours"
      )
      .in("requirement_id", ids);
    if (errorTareas) throw errorTareas;

    const { data: fechasLimiteFase } = await supabase
      .from("requirement_phase_deadlines")
      .select("requirement_id, phase_number, due_date")
      .in("requirement_id", ids);
    const deadlinePorReqFase = new Map(
      (fechasLimiteFase ?? []).map((f) => [`${f.requirement_id}-${f.phase_number}`, new Date(f.due_date)])
    );

    const resultado = requerimientos.map((req) => {
      const tareasReq = (tareas ?? []).filter((t) => t.requirement_id === req.id);

      const fases: PlaneacionFase[] = FASES_ORDEN.map(({ numero, nombre }) => {
        const tareasFase = tareasReq
          .filter((t) => t.phase_number === numero)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((t) => {
            // planned_start_date/planned_end_date quedan NULL en Fase A (ver
            // ROADMAP_SUPABASE.md §4.4 -- el match por nombre de tarea contra
            // las hojas Gantt ocultas no fue viable). Fallback: due_date como
            // marcador de un día.
            const start = t.planned_start_date
              ? new Date(t.planned_start_date)
              : t.due_date
                ? new Date(t.due_date)
                : null;
            const end = t.planned_end_date
              ? new Date(t.planned_end_date)
              : t.due_date
                ? new Date(t.due_date)
                : null;
            return {
              id: t.id,
              taskName: t.task_name,
              status: t.status,
              start,
              end,
              // completada: solo a nivel de tarea (C1.4) -- una tarea
              // Completada nunca se pinta vencida, sin importar la fecha.
              semaforo: calcularSemaforo(end, hoyLocal(), estadoEsCompletada(t.status)),
              milestone: t.milestone,
              plannedDatesConfirmed: t.planned_dates_confirmed,
              assignee: t.assignee,
              estimatedHours: t.estimated_hours,
              executedHours: t.executed_hours,
            };
          });
        return {
          phaseNumber: numero,
          phaseName: nombre,
          tareas: tareasFase,
          deadline: deadlinePorReqFase.get(`${req.id}-${numero}`) ?? null,
        };
      });

      const tieneConsumo = fases.some((f) => f.tareas.some((t) => t.executedHours > 0));

      return { id: req.id, code: req.code, slug: req.slug, title: req.title, fases, tieneConsumo };
    });

    return { requerimientos: resultado, error: false };
  } catch {
    return { requerimientos: [], error: true };
  }
}

