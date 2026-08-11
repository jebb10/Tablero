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

function esEstadoTarea(status: string): status is EstadoTarea {
  return (ESTADOS_TAREA as readonly string[]).includes(status);
}

/** Adapta el `status` crudo de `requirement_tasks` (garantizado por CHECK constraint desde
 * C2.1, pero tipado como `string` en database.types.ts) al enum de dominio `EstadoTarea`. */
export function estadoTareaDesdeDb(status: string): EstadoTarea {
  if (esEstadoTarea(status)) return status;
  console.warn(`Estado de tarea desconocido: "${status}" — usando "No iniciada" como fallback.`);
  return "No iniciada";
}
