import type { Database } from "./supabase/database.types";
import type { EstadoFase, Fase, Tarea } from "./types";
import { FASES_ORDEN } from "./fases-orden";

export type RequirementTaskRow = Pick<
  Database["public"]["Tables"]["requirement_tasks"]["Row"],
  | "phase_number"
  | "phase_name"
  | "task_name"
  | "detail"
  | "status"
  | "estimated_hours"
  | "due_date"
  | "completed_date"
  | "milestone"
  | "blockers"
  | "notes"
  | "sort_order"
>;

function toDate(v: string | null): Date | null {
  return v ? new Date(v) : null;
}

function estadoDeFase(tareas: Tarea[]): EstadoFase {
  if (tareas.length === 0) return "pendiente";
  if (tareas.every((t) => t.estado?.toLowerCase() === "completada")) return "completada";
  return "en-curso";
}

/** Agrupa las filas planas de requirement_tasks en el shape Fase[] que consume FaseStepper / el Gantt. */
export function agruparPorFase(filas: RequirementTaskRow[]): Fase[] {
  const porNumero = new Map<number, RequirementTaskRow[]>();
  for (const fila of filas) {
    const lista = porNumero.get(fila.phase_number) ?? [];
    lista.push(fila);
    porNumero.set(fila.phase_number, lista);
  }

  return FASES_ORDEN.map(({ numero, nombre }) => {
    const filasFase = (porNumero.get(numero) ?? []).sort((a, b) => a.sort_order - b.sort_order);
    const tareas: Tarea[] = filasFase.map((f) => ({
      tarea: f.task_name,
      detalle: f.detail,
      estado: f.status,
      horas: f.estimated_hours,
      fechaLimite: toDate(f.due_date),
      fechaReal: toDate(f.completed_date),
      hito: f.milestone,
      notas: f.notes,
      bloqueantes: f.blockers,
    }));

    const horasEstimadas = filasFase.length
      ? filasFase.reduce((acc, f) => acc + (f.estimated_hours ?? 0), 0)
      : null;

    return {
      nombre,
      horasEstimadas,
      tareas,
      estado: estadoDeFase(tareas),
    };
  });
}
