import { hoyLocal } from "./fechas";

export type Semaforo = "vencido" | "rojo" | "amarillo" | "verde" | "sin-fecha";

const UMBRAL_ROJO_DIAS = 3;
const UMBRAL_AMARILLO_DIAS = 10;

/** Unidad C1.4: `completada` es solo a nivel de TAREA (`requirement_tasks.
 * status === "Completada"`) — una tarea completada nunca se pinta vencida,
 * sin importar la fecha. A nivel de requerimiento no se pasa este
 * parámetro: ese caso ya lo cubre el KPI `entregasIncumplidas` de Home. */
export function calcularSemaforo(
  deadline: Date | null,
  hoy: Date = hoyLocal(),
  completada?: boolean
): Semaforo {
  if (!deadline) return "sin-fecha";
  const dias = Math.ceil((deadline.getTime() - hoy.getTime()) / 86_400_000);
  if (dias < 0 && !completada) return "vencido";
  if (dias <= UMBRAL_ROJO_DIAS) return "rojo";
  if (dias <= UMBRAL_AMARILLO_DIAS) return "amarillo";
  return "verde";
}

/** Clases de color del semáforo, por caso de uso — fuente única para
 * requerimiento-card.tsx, gantt-timeline.tsx y dashboard-client.tsx. */
export const SEMAFORO_DOT_CLASS: Record<Semaforo, string> = {
  vencido: "bg-status-vencido",
  rojo: "bg-status-bloqueo",
  amarillo: "bg-status-pausado",
  verde: "bg-status-entregado",
  "sin-fecha": "bg-transparent",
};

export const SEMAFORO_TEXT_CLASS: Record<Semaforo, string> = {
  vencido: "text-status-vencido",
  rojo: "text-status-bloqueo",
  amarillo: "text-status-pausado",
  verde: "text-status-entregado",
  "sin-fecha": "text-muted-foreground",
};

export const SEMAFORO_BAR_CLASS: Record<Semaforo, string> = {
  vencido: "bg-status-vencido",
  rojo: "bg-status-bloqueo",
  amarillo: "bg-status-pausado",
  verde: "bg-status-entregado",
  "sin-fecha": "bg-muted-foreground/40",
};
