import type { EstadoFase, Fase, Tarea } from "./types";

const FASES_ORDEN: { numero: number; nombre: string }[] = [
  { numero: 1, nombre: "Requerimientos" },
  { numero: 2, nombre: "Diseño" },
  { numero: 3, nombre: "Desarrollo" },
  { numero: 4, nombre: "QA" },
  { numero: 5, nombre: "Producción" },
];

export interface RequirementTaskRow {
  phase_number: number;
  phase_name: string;
  task_name: string;
  detail: string | null;
  status: string;
  estimated_hours: number | null;
  due_date: string | null;
  completed_date: string | null;
  milestone: string | null;
  blockers: string | null;
  notes: string | null;
  sort_order: number;
}

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
