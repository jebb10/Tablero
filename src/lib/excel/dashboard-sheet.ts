import type * as XLSX from "xlsx";
import type { Estado, Requerimiento } from "../types";
import { loadWorkbook, sheetRows, slugify, toDate, toNumber, toText } from "./workbook";

const DASHBOARD_SHEET = "Dashboard Principal";

/**
 * Heurística para los 21 requerimientos sin hoja de detalle propia:
 * usa el valor original de "Completado" (recuperado del backup antes de
 * limpiarlo del Excel) como aproximación de estado. Ver CLAUDE.md — estos
 * 21 quedan congelados por decisión del PO, no se les crea hoja de detalle.
 */
const ESTADO_HEURISTICO: Record<string, Estado> = {
  "SALUD_HU0001_ModificaciónPantalla+Salud": "Entregado en producción",
  ADMI_HU0001_AdministradorPortalPensionados: "Entregado en producción",
  INTE_HU0001_MODULO_DE_BUSQUEDA_INTERMEDIARIOS: "Entregado en producción",
  ACRO_HU0001_ModificacionDocumentosAcrobat: "Entregado en producción",
  ACRO_HU0002_ModificacionDocumentosAcrobat: "Entregado en producción",
  GEWE_HU0006_GestiónDocumentos: "Entregado en producción",
  PARQ_HU0001_DiseñoPáginaInterna: "Entregado en producción",
  COTI_HU0001_LevantamientoDeRequerimiento: "Entregado en producción",
  "Estandarización Documental": "Entregado en producción",
  "Desarrollo y puesta en producción - Exequias": "Entregado en producción",
  "Produccion VIGILANTES CORPORATIVOS EXEQUIAS ARL": "Entregado en producción",
  "Wompi (FR14) Validaciones Cambios Gaia": "Entregado en producción",
  ACRO_HU0005_RediseñoFurelFurat: "Entregado en producción",
  BICI_HU0001_ProductoDigitalBicibles: "No iniciado",
  EXEQ_HU0001_ExequiasPositiva: "No iniciado",
  ACCAI_HU0001_Formulario: "No iniciado",
  IMPU_HU0001_GenerarCertificados: "No iniciado",
  DOCU_HU0001_BibliotecaListasInteligentes: "No iniciado",
  BANN_HU0001_AdminBanners: "No iniciado",
  GEWE_HU0001_AdminEstadoActualizacion: "No iniciado",
};

function contieneBloqueo(notas: string | null): boolean {
  if (!notas) return false;
  const n = notas.toLowerCase();
  return n.includes("actividad bloqueante") || n.includes("espera de ws");
}

function fechaLimiteMasReciente(wb: XLSX.WorkBook, hojaNombre: string): Date | null {
  const rows = sheetRows(wb, hojaNombre);
  let max: Date | null = null;
  for (let i = 3; i < rows.length; i++) {
    const cell = toDate(rows[i]?.[6]);
    if (cell && (!max || cell > max)) max = cell;
  }
  return max;
}

/** true si la hoja de detalle no tiene ninguna tarea (columna C) registrada. */
function hojaSinTareas(wb: XLSX.WorkBook, hojaNombre: string): boolean {
  const rows = sheetRows(wb, hojaNombre);
  return rows.slice(3).every((row) => !toText(row[2]));
}

/**
 * @param wb workbook ya cargado, opcional — si no se pasa, se carga uno
 * nuevo. Pásalo cuando el caller también necesite leer otra hoja del mismo
 * archivo en la misma request (evita leer el Excel dos veces).
 */
export function getRequerimientos(wb: XLSX.WorkBook = loadWorkbook()): Requerimiento[] {
  const rows = sheetRows(wb, DASHBOARD_SHEET);
  const result: Requerimiento[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const estadoCell = row[0];
    const itemCell = row[1];
    const nombreCell = row[2];
    const mesCell = row[3];
    const complejidadCell = row[4];
    const horasEstCell = row[11];
    const horasEjecCell = row[12];
    const fechaCobroCell = row[13];
    const notasCell = row[14];
    const hojaDetalleCell = row[15];

    const item = toText(itemCell);
    const nombre = toText(nombreCell);
    if (!item && !nombre) continue;

    const hojaDetalle = toText(hojaDetalleCell);
    const tieneDetalle = hojaDetalle !== null;
    const notas = toText(notasCell);

    const estadoExplicito = toText(estadoCell) as Estado | null;
    let estado: Estado;
    if (estadoExplicito) {
      estado = estadoExplicito;
    } else if (item && ESTADO_HEURISTICO[item]) {
      estado = ESTADO_HEURISTICO[item];
    } else {
      estado = "No iniciado";
    }

    const horasEstimadas = toNumber(horasEstCell);
    const horasEjecutadas = toNumber(horasEjecCell);

    result.push({
      item: item ?? `sin-item-${i}`,
      slug: item ? slugify(item) : slugify(nombre ?? `req-${i}`),
      nombre: nombre ?? item ?? "Sin nombre",
      estado,
      mes: toText(mesCell),
      complejidad: toText(complejidadCell),
      horasEstimadas,
      horasEjecutadas,
      horasPorEjecutar:
        horasEstimadas !== null && horasEjecutadas !== null
          ? horasEstimadas - horasEjecutadas
          : null,
      porcentajeAvance:
        horasEstimadas !== null && horasEstimadas > 0
          ? Math.round(((horasEjecutadas ?? 0) / horasEstimadas) * 100)
          : null,
      overbudget:
        horasEstimadas !== null &&
        horasEjecutadas !== null &&
        horasEjecutadas > horasEstimadas,
      fechaCobro: toText(fechaCobroCell),
      notas,
      bloqueado: contieneBloqueo(notas),
      hojaDetalle,
      tieneDetalle,
      sinTareas: tieneDetalle && hojaDetalle ? hojaSinTareas(wb, hojaDetalle) : false,
      fechaLimite: tieneDetalle && hojaDetalle ? fechaLimiteMasReciente(wb, hojaDetalle) : null,
    });
  }

  return result;
}
