import type * as XLSX from "xlsx";
import type { DetalleRequerimiento, Fase } from "../types";
import { parseEtiquetaValor, sheetRows, toDate, toNumber, toText } from "./workbook";

const FASES_ORDEN = ["Requerimientos", "Diseño", "Desarrollo", "QA", "Producción"];

function normalizarFase(raw: string): string {
  const limpio = raw.replace(/[▶►]/g, "").trim().toUpperCase();
  if (limpio.startsWith("REQUERIM")) return "Requerimientos";
  if (limpio.startsWith("DISE")) return "Diseño";
  if (limpio.startsWith("DESARROL")) return "Desarrollo";
  if (limpio.startsWith("QA")) return "QA";
  if (limpio.startsWith("PRODUC")) return "Producción";
  return limpio;
}

/**
 * @param wb workbook ya cargado. Pásalo cuando el caller también necesite
 * leer otra hoja del mismo archivo en la misma request (evita leer el Excel
 * dos veces).
 */
export function getDetalle(
  hojaNombre: string,
  wb: XLSX.WorkBook
): DetalleRequerimiento | null {
  if (!wb.Sheets[hojaNombre]) return null;
  const rows = sheetRows(wb, hojaNombre);

  const metaRow = rows[1] ?? [];
  const mes = parseEtiquetaValor(metaRow[0]);
  const complejidad = parseEtiquetaValor(metaRow[2]);
  const prioridad = parseEtiquetaValor(metaRow[4]);
  const horasTotalesEstimadas = toNumber(metaRow[8]);
  const horasTotalesConsumidas = toNumber(metaRow[10]);

  const fasesMap = new Map<string, Fase>();
  let faseActual: Fase | null = null;
  let totalesTexto: string | null = null;

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const colA = toText(row[0]);
    if (!colA) continue;

    if (colA === "TOTALES") {
      totalesTexto = toText(row[4]);
      continue;
    }

    if (colA.includes("▶")) {
      const nombreFase = normalizarFase(colA);
      faseActual = {
        nombre: nombreFase,
        horasEstimadas: toNumber(row[1]),
        tareas: [],
        estado: "pendiente",
      };
      fasesMap.set(nombreFase, faseActual);
      continue;
    }

    if (!faseActual) continue;
    const tarea = toText(row[2]);
    if (!tarea) continue;

    faseActual.tareas.push({
      tarea,
      detalle: toText(row[3]),
      estado: toText(row[4]),
      horas: toNumber(row[5]),
      fechaLimite: toDate(row[6]),
      fechaReal: toDate(row[7]),
      hito: toText(row[8]),
      notas: toText(row[9]),
      bloqueantes: toText(row[10]),
    });
  }

  for (const fase of fasesMap.values()) {
    if (fase.tareas.length === 0) {
      fase.estado = "pendiente";
    } else if (fase.tareas.every((t) => t.estado === "Completada")) {
      fase.estado = "completada";
    } else {
      fase.estado = "en-curso";
    }
  }

  const fases: Fase[] = FASES_ORDEN.map(
    (nombre) =>
      fasesMap.get(nombre) ?? {
        nombre,
        horasEstimadas: null,
        tareas: [],
        estado: "pendiente",
      }
  );

  return {
    hoja: hojaNombre,
    mes,
    complejidad,
    prioridad,
    horasTotalesEstimadas,
    horasTotalesConsumidas,
    fases,
    totalesTexto,
  };
}
