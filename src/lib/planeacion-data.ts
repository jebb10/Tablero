import { calcularSemaforo, type Semaforo } from "./semaforo";
import { hoyLocal } from "./fechas";
import { PROJECT_SLUG } from "./project";
import { getSupabaseClient } from "./supabase/server";
import { FASES_ORDEN } from "./fases-orden";

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

export interface TareaParaEdicion {
  id: string;
  taskName: string;
  phaseNumber: number;
  phaseName: string;
  dueDate: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
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
              semaforo: calcularSemaforo(end, hoyLocal(), t.status === "Completada"),
              milestone: t.milestone,
              plannedDatesConfirmed: t.planned_dates_confirmed,
              assignee: t.assignee,
              estimatedHours: t.estimated_hours,
              executedHours: t.executed_hours,
            };
          });
        return { phaseNumber: numero, phaseName: nombre, tareas: tareasFase };
      });

      const tieneConsumo = fases.some((f) => f.tareas.some((t) => t.executedHours > 0));

      return { id: req.id, code: req.code, slug: req.slug, title: req.title, fases, tieneConsumo };
    });

    return { requerimientos: resultado, error: false };
  } catch {
    return { requerimientos: [], error: true };
  }
}

/** Unidad C1.2 — datos para la pantalla de edición de fechas planeadas de
 * un requerimiento. `null` si el requerimiento no existe o hay error. */
export async function getTareasParaEdicion(slug: string): Promise<{
  id: string;
  code: string;
  title: string;
  tareas: TareaParaEdicion[];
} | null> {
  try {
    const supabase = await getSupabaseClient();

    const { data: proyecto, error: errorProyecto } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", PROJECT_SLUG)
      .single();
    if (errorProyecto || !proyecto) throw errorProyecto ?? new Error("Proyecto no encontrado");

    const { data: requerimiento, error: errorRequerimiento } = await supabase
      .from("requirements")
      .select("id, code, title")
      .eq("project_id", proyecto.id)
      .eq("slug", slug)
      .maybeSingle();
    if (errorRequerimiento) throw errorRequerimiento;
    if (!requerimiento) return null;

    const { data: tareas, error: errorTareas } = await supabase
      .from("requirement_tasks")
      .select(
        "id, task_name, phase_number, phase_name, sort_order, due_date, planned_start_date, planned_end_date"
      )
      .eq("requirement_id", requerimiento.id)
      .order("phase_number")
      .order("sort_order");
    if (errorTareas) throw errorTareas;

    return {
      id: requerimiento.id,
      code: requerimiento.code,
      title: requerimiento.title,
      tareas: (tareas ?? []).map((t) => ({
        id: t.id,
        taskName: t.task_name,
        phaseNumber: t.phase_number,
        phaseName: t.phase_name,
        dueDate: t.due_date,
        plannedStartDate: t.planned_start_date,
        plannedEndDate: t.planned_end_date,
      })),
    };
  } catch {
    return null;
  }
}
