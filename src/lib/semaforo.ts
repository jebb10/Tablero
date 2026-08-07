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
