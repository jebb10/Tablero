import { getRequerimientos } from "./excel/dashboard-sheet";
import { loadWorkbook } from "./excel/workbook";
import { getKPIs } from "./kpis";
import type { KPIs, Requerimiento } from "./types";

interface DashboardData {
  requerimientos: Requerimiento[];
  kpis: KPIs;
}

/**
 * Caché en memoria del proceso (no persiste entre reinicios) del último
 * resultado leído con éxito. Permite seguir mostrando datos si el Excel
 * está bloqueado (abierto en otro programa) en el momento de un request.
 *
 * Limitación conocida (ver CLAUDE.md): en un entorno serverless (Vercel,
 * Fase 3) este estado de módulo no está garantizado entre invocaciones —
 * se documenta y se resuelve específicamente en esa fase, no aquí.
 */
let ultimoResultadoBueno: DashboardData | null = null;

export async function getDashboardData(): Promise<
  DashboardData & { error: boolean; ultimoResultadoNulo: boolean }
> {
  try {
    const wb = await loadWorkbook();
    const requerimientos = getRequerimientos(wb);
    const kpis = getKPIs(requerimientos);
    ultimoResultadoBueno = { requerimientos, kpis };
    return { requerimientos, kpis, error: false, ultimoResultadoNulo: false };
  } catch {
    if (ultimoResultadoBueno) {
      return { ...ultimoResultadoBueno, error: true, ultimoResultadoNulo: false };
    }
    return {
      requerimientos: [],
      kpis: getKPIs([]),
      error: true,
      ultimoResultadoNulo: true,
    };
  }
}
