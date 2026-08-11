import type { Database } from "./supabase/database.types";
import type { EstadoFase, Fase, Tarea } from "./types";
import { FASES_ORDEN } from "./fases-orden";
import { estadoEsCompletada, estadoTareaDesdeDb } from "./estados-tarea";

export type RequirementTaskRow = Pick<
  Database["public"]["Tables"]["requirement_tasks"]["Row"],
  | "id"
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
  | "assignee"
  | "planned_start_date"
  | "planned_end_date"
  | "planned_dates_confirmed"
  | "executed_hours"
>;

function toDate(v: string | null): Date | null {
  return v ? new Date(v) : null;
}

function estadoDeFase(tareas: Tarea[]): EstadoFase {
  if (tareas.length === 0) return "pendiente";
  if (tareas.every((t) => estadoEsCompletada(t.estado))) return "completada";
  return "en-curso";
}

/** Agrupa las filas planas de requirement_tasks en el shape Fase[] que consume TareasPorFase. */
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
      id: f.id,
      tarea: f.task_name,
      detalle: f.detail,
      estado: estadoTareaDesdeDb(f.status),
      horas: f.estimated_hours,
      fechaLimite: toDate(f.due_date),
      fechaReal: toDate(f.completed_date),
      hito: f.milestone,
      notas: f.notes,
      bloqueantes: f.blockers,
      asignado: f.assignee,
      plannedStartDate: toDate(f.planned_start_date),
      plannedEndDate: toDate(f.planned_end_date),
      plannedDatesConfirmed: f.planned_dates_confirmed,
      executedHours: f.executed_hours,
    }));

    const horasEstimadas = filasFase.length
      ? filasFase.reduce((acc, f) => acc + (f.estimated_hours ?? 0), 0)
      : null;

    return {
      nombre,
      horasEstimadas,
      tareas,
      estado: estadoDeFase(tareas),
      fechaLimiteFase: null,
    };
  });
}

/**
 * Fase actual de un requerimiento: la primera fase (en orden de FASES_ORDEN)
 * cuyas tareas no estén todas en "Completada". Si todas las fases con
 * tareas están completas, devuelve la última fase con tareas registradas.
 * `null` si el requerimiento no tiene ninguna tarea (los 21 heurísticos).
 */
export function calcularFaseActual(
  tareas: { phase_number: number; status: string }[]
): string | null {
  if (tareas.length === 0) return null;

  const porNumero = new Map<number, { phase_number: number; status: string }[]>();
  for (const t of tareas) {
    const lista = porNumero.get(t.phase_number) ?? [];
    lista.push(t);
    porNumero.set(t.phase_number, lista);
  }

  for (const { numero, nombre } of FASES_ORDEN) {
    const tareasFase = porNumero.get(numero) ?? [];
    if (
      tareasFase.length > 0 &&
      !tareasFase.every((t) => estadoEsCompletada(t.status))
    ) {
      return nombre;
    }
  }

  const numerosConTareas = Array.from(porNumero.keys()).sort((a, b) => b - a);
  return FASES_ORDEN.find((f) => f.numero === numerosConTareas[0])?.nombre ?? null;
}
