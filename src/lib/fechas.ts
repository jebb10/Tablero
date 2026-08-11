/** Vercel corre en UTC; new Date() en un Server Component puede dar un día
 * distinto al del PO (UTC-5). Todo cálculo de "hoy"/fechas locales del
 * negocio pasa por aquí, no por new Date() directo. Aún sin consumidores en
 * 0.6 — queda listo para la Unidad C1.4 (semáforo vencido/próximo). */
export const ZONA = "America/Bogota";

export function hoyLocal(): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const anio = partes.find((p) => p.type === "year")!.value;
  const mes = partes.find((p) => p.type === "month")!.value;
  const dia = partes.find((p) => p.type === "day")!.value;
  return new Date(`${anio}-${mes}-${dia}T00:00:00`);
}

/** YYYY-MM-DD sin desplazamiento de zona (no usa toISOString, que convierte a UTC). */
export function aISO(d: Date): string {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Parsea una fecha YYYY-MM-DD como fecha local (evita el corrimiento de un
 * día que produce `new Date("YYYY-MM-DD")`, que Date interpreta como UTC). */
export function desdeISO(s: string): Date {
  const [anio, mes, dia] = s.split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

export function sumarDias(d: Date, dias: number): Date {
  const resultado = new Date(d);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

/** Diferencia en días completos (b - a), redondeando a días de calendario. */
export function diffDias(a: Date, b: Date): number {
  const msPorDia = 86_400_000;
  const aSinHora = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bSinHora = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bSinHora.getTime() - aSinHora.getTime()) / msPorDia);
}

/** Valor para un <input type="date"> ("" si es null). Usa aISO en vez de
 * toISOString() (que convierte a UTC y puede correr un día la fecha en
 * horas de la tarde en America/Bogota, UTC-5). */
export function aInputDate(fecha: Date | null): string {
  return fecha ? aISO(fecha) : "";
}

/** Formato de fecha corto para UI ("es-CO", día/mes[/año]). `null` si no hay
 * fecha (los call-sites deciden el fallback visual: "Sin fecha"/"—"/etc). */
export function formatearFecha(fecha: Date, opciones?: { conAño?: boolean }): string;
export function formatearFecha(
  fecha: Date | null,
  opciones?: { conAño?: boolean }
): string | null;
export function formatearFecha(
  fecha: Date | null,
  opciones: { conAño?: boolean } = {}
): string | null {
  if (!fecha) return null;
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    ...(opciones.conAño ? { year: "numeric" as const } : {}),
  }).format(fecha);
}
