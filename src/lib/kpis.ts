import type { CalidadDatos, Estado, KPIs, Requerimiento } from "./types";

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

  for (const r of requerimientos) {
    porEstado[r.estado]++;
    horasEstimadasTotal += r.horasEstimadas ?? 0;
    horasEjecutadasTotal += r.horasEjecutadas ?? 0;
    if (r.bloqueado) bloqueados++;
  }

  return {
    total: requerimientos.length,
    porEstado,
    horasEstimadasTotal,
    horasEjecutadasTotal,
    bloqueados,
    calidad: getCalidadDatos(requerimientos),
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
