import type { Estado, KPIs, Requerimiento } from "./types";

const ESTADOS_ENTREGA_CUMPLIDA: Estado[] = [
  "Entregado en producción",
  "Cerrado por cambio de alcance",
];

export function getKPIs(requerimientos: Requerimiento[]): KPIs {
  const porEstado: Record<Estado, number> = {
    "En curso": 0,
    Pausado: 0,
    "No iniciado": 0,
    "Entregado en producción": 0,
    "Cerrado por cambio de alcance": 0,
  };
  let horasEstimadasTotal = 0;
  let horasEjecutadasTotal = 0;
  let bloqueados = 0;
  let reabiertos = 0;

  for (const r of requerimientos) {
    porEstado[r.estado]++;
    horasEstimadasTotal += r.horasEstimadas ?? 0;
    horasEjecutadasTotal += r.horasEjecutadas ?? 0;
    if (r.estado === "En curso" && r.tieneTareaBloqueda) bloqueados++;
    if (r.reabierto > 0 && !ESTADOS_ENTREGA_CUMPLIDA.includes(r.estado)) reabiertos++;
  }

  return {
    total: requerimientos.length,
    porEstado,
    horasEstimadasTotal,
    horasEjecutadasTotal,
    bloqueados,
    reabiertos,
  };
}
