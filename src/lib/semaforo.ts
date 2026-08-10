export type Semaforo = "rojo" | "amarillo" | "verde" | "sin-fecha";

const UMBRAL_ROJO_DIAS = 3;
const UMBRAL_AMARILLO_DIAS = 10;

export function calcularSemaforo(deadline: Date | null, hoy = new Date()): Semaforo {
  if (!deadline) return "sin-fecha";
  const dias = Math.ceil((deadline.getTime() - hoy.getTime()) / 86_400_000);
  if (dias < 0 || dias <= UMBRAL_ROJO_DIAS) return "rojo";
  if (dias <= UMBRAL_AMARILLO_DIAS) return "amarillo";
  return "verde";
}

/** Clases de color del semáforo, por caso de uso — fuente única para
 * requerimiento-card.tsx, gantt-timeline.tsx y dashboard-client.tsx. */
export const SEMAFORO_DOT_CLASS: Record<Semaforo, string> = {
  rojo: "bg-status-bloqueo",
  amarillo: "bg-status-pausado",
  verde: "bg-status-entregado",
  "sin-fecha": "bg-transparent",
};

export const SEMAFORO_TEXT_CLASS: Record<Semaforo, string> = {
  rojo: "text-status-bloqueo",
  amarillo: "text-status-pausado",
  verde: "text-status-entregado",
  "sin-fecha": "text-muted-foreground",
};

export const SEMAFORO_BAR_CLASS: Record<Semaforo, string> = {
  rojo: "bg-status-bloqueo",
  amarillo: "bg-status-pausado",
  verde: "bg-status-entregado",
  "sin-fecha": "bg-muted-foreground/40",
};
