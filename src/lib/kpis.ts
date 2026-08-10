import type { CalidadDatos, Estado, KPIs, Requerimiento, SaludProyecto } from "./types";
import { estadoEsCompletada } from "./estados-tarea";

interface TareaParaSalud {
  status: string;
  due_date: string | null;
  planned_end_date: string | null;
}

const ESTADOS_ENTREGA_CUMPLIDA: Estado[] = [
  "Entregado en producción",
  "Cerrado por cambio de alcance",
];

function calcularSalud(vencidas: number, entregasIncumplidas: number, bloqueados: number): SaludProyecto {
  if (vencidas + entregasIncumplidas >= 4 || bloqueados >= 2) return "rojo";
  if (vencidas + entregasIncumplidas >= 1 || bloqueados >= 1) return "amarillo";
  return "verde";
}

export function getKPIs(
  requerimientos: Requerimiento[],
  tareas: TareaParaSalud[] = [],
  hoy: Date = new Date()
): KPIs {
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
  let entregasIncumplidas = 0;

  for (const r of requerimientos) {
    porEstado[r.estado]++;
    horasEstimadasTotal += r.horasEstimadas ?? 0;
    horasEjecutadasTotal += r.horasEjecutadas ?? 0;
    if (r.bloqueado) bloqueados++;
    if (r.reabierto > 0) reabiertos++;
    if (
      r.fechaLimite &&
      r.fechaLimite < hoy &&
      !ESTADOS_ENTREGA_CUMPLIDA.includes(r.estado)
    ) {
      entregasIncumplidas++;
    }
  }

  const vencidas = tareas.filter((t) => {
    if (estadoEsCompletada(t.status)) return false;
    const fechaStr = t.planned_end_date ?? t.due_date;
    if (!fechaStr) return false;
    return new Date(fechaStr) < hoy;
  }).length;

  return {
    total: requerimientos.length,
    porEstado,
    horasEstimadasTotal,
    horasEjecutadasTotal,
    bloqueados,
    calidad: getCalidadDatos(requerimientos),
    reabiertos,
    vencidas,
    entregasIncumplidas,
    salud: calcularSalud(vencidas, entregasIncumplidas, bloqueados),
  };
}

/**
 * Calidad de datos: solo evalúa los requerimientos con hoja de detalle real
 * (tieneDetalle). Los 21 heurísticos quedan fuera a propósito — ya se sabe
 * que les faltan estos campos, incluirlos solo generaría ruido esperado.
 */
export function getCalidadDatos(requerimientos: Requerimiento[]): CalidadDatos {
  const filas: { req: string; campo: string }[] = [];

  for (const r of requerimientos) {
    if (!r.tieneDetalle) continue;

    if (r.horasEstimadas === null) filas.push({ req: r.nombre, campo: "Horas estimadas" });
    if (r.horasEjecutadas === null) filas.push({ req: r.nombre, campo: "Horas ejecutadas" });
    if (r.fechaLimite === null) filas.push({ req: r.nombre, campo: "Fecha límite" });
    if (r.sinTareas) filas.push({ req: r.nombre, campo: "Sin tareas registradas" });
  }

  return {
    camposFaltantes: filas.length,
    requerimientosAfectados: new Set(filas.map((f) => f.req)).size,
    filas,
  };
}
