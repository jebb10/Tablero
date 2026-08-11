import type { Estado } from "./types";

export const ESTADOS_DB = [
  "NO_INICIADO",
  "EN_CURSO",
  "PAUSADO",
  "ENTREGADO_PRODUCCION",
  "CERRADO_POR_CAMBIO_ALCANCE",
] as const;

export type EstadoDb = (typeof ESTADOS_DB)[number];

/** Único valor de ESTADOS_DB con lógica propia (cierre por cambio de alcance,
 * Unidad C2.3) -- constante nombrada para no comparar/escribir el literal a mano. */
export const ESTADO_DB_CERRADO_POR_CAMBIO_ALCANCE: EstadoDb = "CERRADO_POR_CAMBIO_ALCANCE";

export const ESTADO_DB_A_ES: Record<EstadoDb, Estado> = {
  NO_INICIADO: "No iniciado",
  EN_CURSO: "En curso",
  PAUSADO: "Pausado",
  ENTREGADO_PRODUCCION: "Entregado en producción",
  CERRADO_POR_CAMBIO_ALCANCE: "Cerrado por cambio de alcance",
};

export const ESTADO_ES_A_DB: Record<Estado, EstadoDb> = Object.fromEntries(
  Object.entries(ESTADO_DB_A_ES).map(([db, es]) => [es, db])
) as Record<Estado, EstadoDb>;

function esEstadoDb(status: string): status is EstadoDb {
  return (ESTADOS_DB as readonly string[]).includes(status);
}

/** Traduce un status crudo de la BD a Estado. Un valor no mapeado es un bug
 * real desde 0.6 (el conjunto de 5 valores es exhaustivo y verificado) — se
 * reporta con console.warn en vez de fallar en silencio. */
export function dbAEstado(status: string): Estado {
  if (esEstadoDb(status)) return ESTADO_DB_A_ES[status];
  console.warn(`Estado desconocido de la BD: "${status}" — usando "No iniciado" como fallback.`);
  return "No iniciado";
}
