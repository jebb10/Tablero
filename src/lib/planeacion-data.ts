import { calcularSemaforo, type Semaforo } from "./semaforo";
import { PROJECT_SLUG } from "./project";
import { getSupabaseClient } from "./supabase/server";

export interface PlaneacionTarea {
  id: string;
  taskName: string;
  status: string;
  start: Date | null;
  end: Date | null;
  semaforo: Semaforo;
}

export interface PlaneacionFase {
  phaseNumber: number;
  phaseName: string;
  tareas: PlaneacionTarea[];
}

export interface PlaneacionRequerimiento {
  id: string;
  code: string;
  title: string;
  fases: PlaneacionFase[];
}

const FASES_ORDEN = [
  { numero: 1, nombre: "Requerimientos" },
  { numero: 2, nombre: "Diseño" },
  { numero: 3, nombre: "Desarrollo" },
  { numero: 4, nombre: "QA" },
  { numero: 5, nombre: "Producción" },
];

export async function getPlaneacionData(): Promise<{
  requerimientos: PlaneacionRequerimiento[];
  error: boolean;
}> {
  try {
    const supabase = getSupabaseClient();

    const { data: proyecto, error: errorProyecto } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", PROJECT_SLUG)
      .single();
    if (errorProyecto || !proyecto) throw errorProyecto ?? new Error("Proyecto no encontrado");

    const { data: requerimientos, error: errorRequerimientos } = await supabase
      .from("requirements")
      .select("id, code, title")
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
        "id, requirement_id, phase_number, phase_name, task_name, status, due_date, planned_start_date, planned_end_date, sort_order"
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
              semaforo: calcularSemaforo(end),
            };
          });
        return { phaseNumber: numero, phaseName: nombre, tareas: tareasFase };
      });

      return { id: req.id, code: req.code, title: req.title, fases };
    });

    return { requerimientos: resultado, error: false };
  } catch {
    return { requerimientos: [], error: true };
  }
}
