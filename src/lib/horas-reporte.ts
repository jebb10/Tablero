import { getDashboardData } from "./dashboard-data";
import { getHorasEstimadasFasePorRequerimientos } from "./fase-deadlines";
import type { Estado } from "./types";

export interface FilaHoras {
  item: string;
  slug: string;
  nombre: string;
  estado: Estado;
  horasFaseRequerimientos: number;
  horasFaseDiseno: number;
  horasFaseDesarrollo: number;
  horasEstimadasTotal: number;
  horasEjecutadas: number;
}

export interface ReporteHoras {
  filas: FilaHoras[];
  error: boolean;
}

/**
 * Reporte de horas por requerimiento para /horas: horas estimadas
 * (diligenciadas manualmente por el PO) de las fases Requerimientos/
 * Diseño/Desarrollo (1/2/3 de FASES_ORDEN — QA y Producción se ignoran a
 * propósito en esta pantalla), su suma, y el total de horas ejecutadas
 * real del requerimiento (todas las fases), para que cierre con el KPI
 * "Horas ejecutadas / estimadas" del Home.
 */
export async function getReporteHoras(): Promise<ReporteHoras> {
  const { requerimientos, error } = await getDashboardData();
  if (error) return { filas: [], error: true };

  const horasFase = await getHorasEstimadasFasePorRequerimientos(
    requerimientos.map((r) => r.id)
  );

  const filas: FilaHoras[] = requerimientos.map((r) => {
    const horasFaseRequerimientos = horasFase.get(`${r.id}-1`) ?? 0;
    const horasFaseDiseno = horasFase.get(`${r.id}-2`) ?? 0;
    const horasFaseDesarrollo = horasFase.get(`${r.id}-3`) ?? 0;

    return {
      item: r.item,
      slug: r.slug,
      nombre: r.nombre,
      estado: r.estado,
      horasFaseRequerimientos,
      horasFaseDiseno,
      horasFaseDesarrollo,
      horasEstimadasTotal: horasFaseRequerimientos + horasFaseDiseno + horasFaseDesarrollo,
      horasEjecutadas: r.horasEjecutadas ?? 0,
    };
  });

  return { filas, error: false };
}
