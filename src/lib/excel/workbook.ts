import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";

const WORKBOOK_PATH = path.resolve(
  process.cwd(),
  "..",
  "REQUERIMIENTOS BOLSAS DE HORAS 414.xlsx"
);

export function loadWorkbook(): XLSX.WorkBook {
  const buffer = fs.readFileSync(WORKBOOK_PATH);
  return XLSX.read(buffer, { type: "buffer", cellDates: true });
}

export function sheetRows(wb: XLSX.WorkBook, name: string): unknown[][] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
}

export function toNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

export function toText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function toDate(v: unknown): Date | null {
  return v instanceof Date ? v : null;
}

export function parseEtiquetaValor(v: unknown): string | null {
  const s = toText(v);
  if (!s) return null;
  const idx = s.indexOf(":");
  if (idx < 0) return s;
  return toText(s.slice(idx + 1));
}

const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
