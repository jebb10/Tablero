export const ESTADOS_TAREA = [
  "No iniciada",
  "Pendiente",
  "En curso",
  "Bloqueada",
  "Completada",
  "Cancelada",
] as const;

export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

function normalizar(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** true si el status crudo de una tarea (de requirement_tasks.status) representa "Completada",
 * tolerando espacios/mayúsculas/diacríticos aunque hoy los 165 valores reales ya estén limpios
 * (verificado 2026-08-10, Unidad C2.1) — sustituye los `.toLowerCase() === "completada"` dispersos
 * por una única fuente de verdad. */
export function estadoEsCompletada(status: string | null | undefined): boolean {
  return status != null && normalizar(status) === "completada";
}
