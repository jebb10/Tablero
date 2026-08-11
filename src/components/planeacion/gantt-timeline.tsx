"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaneacionFase, PlaneacionRequerimiento } from "@/lib/planeacion-data";
import { SEMAFORO_BAR_CLASS } from "@/lib/semaforo";
import { diffDias } from "@/lib/fechas";
import { estadoEsCompletada } from "@/lib/estados-tarea";

export type Escala = "dia" | "semana" | "mes";

const DIA_MS = 86_400_000;
// Ventana de días visible por escala (navegable con < Hoy >, no todo el
// rango del requerimiento comprimido) -- "mes" es variable, se calcula por
// calendario real (28-31 días), las otras dos son fijas.
const DIAS_VENTANA_FIJA: Record<"dia" | "semana", number> = { dia: 14, semana: 7 };
// px por día generoso a propósito: con una ventana corta hay espacio de
// sobra, así que dos tareas en días distintos siempre se ven claramente
// separadas (el problema original era comprimir meses enteros en ~900px).
const PX_POR_DIA: Record<Escala, number> = { dia: 60, semana: 120, mes: 28 };
const ANCHO_MIN_PX = 4;
const ALTO_FASE_PX = 32;
const ALTO_TAREA_PX = 28;

/** Alto en px que ocupa una fase (cabecera + sus tareas si está abierta, o 1
 * fila reservada para "Sin tareas" si está abierta y no tiene ninguna). */
function alturaFase(fase: PlaneacionFase, abierta: boolean): number {
  return (
    ALTO_FASE_PX +
    (abierta ? Math.max(fase.tareas.length, fase.tareas.length === 0 ? 1 : 0) * ALTO_TAREA_PX : 0)
  );
}

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(fecha);
}

function formatearMes(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", { month: "short", year: "numeric" }).format(fecha);
}

function sinHora(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function inicioSemana(d: Date): Date {
  const dia = sinHora(d);
  const offsetLunes = (dia.getDay() + 6) % 7; // lunes = 0
  dia.setDate(dia.getDate() - offsetLunes);
  return dia;
}

function inicioMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sumarDias(d: Date, dias: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
}

/** Rango [inicio, fin] (ambas inclusive, sin hora) de la ventana visible
 * del Gantt para una escala y una fecha de referencia -- reemplaza el
 * diseño anterior de "comprimir todo el rango de fechas del requerimiento",
 * que amontonaba las tareas cuando el rango real era de varios meses. */
export function calcularRangoVisible(escala: Escala, referencia: Date): { inicio: Date; fin: Date } {
  if (escala === "mes") {
    const inicio = inicioMes(referencia);
    const finExclusivo = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
    return { inicio, fin: new Date(finExclusivo.getTime() - DIA_MS) };
  }
  const dias = DIAS_VENTANA_FIJA[escala];
  const inicio = inicioSemana(referencia);
  return { inicio, fin: sumarDias(inicio, dias - 1) };
}

/** Mueve la fecha de referencia un período hacia adelante/atrás (-1/+1). */
export function avanzarPeriodo(escala: Escala, referencia: Date, direccion: 1 | -1): Date {
  if (escala === "mes") {
    return new Date(referencia.getFullYear(), referencia.getMonth() + direccion, 1);
  }
  return sumarDias(referencia, DIAS_VENTANA_FIJA[escala] * direccion);
}

export function etiquetaPeriodo(escala: Escala, rango: { inicio: Date; fin: Date }): string {
  if (escala === "mes") return formatearMes(rango.inicio);
  return `${formatearFecha(rango.inicio)} – ${formatearFecha(rango.fin)}`;
}

/** Primera fase (en orden de fases) cuyas tareas no están todas
 * "Completada" — mismo criterio que calcularFaseActual (src/lib/fases.ts),
 * adaptado al shape ya agrupado de PlaneacionFase[]. Si todas están
 * completas, la última fase con tareas. `null` si no hay tareas. */
function faseEnCurso(fases: PlaneacionFase[]): number | null {
  for (const fase of fases) {
    if (
      fase.tareas.length > 0 &&
      !fase.tareas.every((t) => estadoEsCompletada(t.status))
    ) {
      return fase.phaseNumber;
    }
  }
  const conTareas = fases.filter((f) => f.tareas.length > 0);
  return conTareas.length ? conTareas[conTareas.length - 1].phaseNumber : null;
}

function resumenFase(fase: PlaneacionFase): { start: Date; end: Date } | null {
  const fechas = fase.tareas.flatMap((t) => [t.start, t.end]).filter((d): d is Date => d !== null);
  if (fechas.length === 0) return null;
  return {
    start: new Date(Math.min(...fechas.map((d) => d.getTime()))),
    end: new Date(Math.max(...fechas.map((d) => d.getTime()))),
  };
}

function tituloTarea(tarea: PlaneacionFase["tareas"][number]): string {
  const partes = [`${tarea.taskName} — ${tarea.status}`];
  if (tarea.start && tarea.end) {
    const duracion = diffDias(tarea.start, tarea.end) + 1;
    partes.push(
      `${formatearFecha(tarea.start)} – ${formatearFecha(tarea.end)} (${duracion} día${duracion === 1 ? "" : "s"})`
    );
  }
  if (tarea.estimatedHours !== null) partes.push(`Horas estimadas: ${tarea.estimatedHours}`);
  partes.push(`Asignado: ${tarea.assignee ?? "Sin asignar"}`);
  if (!tarea.plannedDatesConfirmed) partes.push("(fecha estimada, no confirmada)");
  return partes.join("\n");
}

export function GanttTimeline({
  requerimiento,
  escala,
  hoy,
  referencia,
}: {
  requerimiento: PlaneacionRequerimiento;
  escala: Escala;
  hoy: Date;
  /** Fecha que ancla la ventana visible -- controlada por planeacion-client.tsx
   * (botones "< Hoy >"). */
  referencia: Date;
}) {
  const [fasesAbiertasOverride, setFasesAbiertasOverride] = useState<Set<number> | null>(null);

  const { inicio: minFecha, fin: maxFecha } = calcularRangoVisible(escala, referencia);
  const pxPorDia = PX_POR_DIA[escala];
  const totalDias = Math.round((maxFecha.getTime() - minFecha.getTime()) / DIA_MS) + 1;
  const anchoTotalPx = totalDias * pxPorDia;

  function offsetPara(d: Date): number {
    return ((sinHora(d).getTime() - minFecha.getTime()) / DIA_MS) * pxPorDia;
  }

  function visibleEnVentana(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false;
    return sinHora(b).getTime() >= minFecha.getTime() && sinHora(a).getTime() <= maxFecha.getTime();
  }

  // Columnas de mes (fila superior de la cabecera y líneas de grid más marcadas).
  const columnasMes: { offsetPx: number; label: string }[] = [];
  {
    let cursor = inicioMes(minFecha);
    while (cursor.getTime() <= maxFecha.getTime()) {
      columnasMes.push({ offsetPx: Math.max(0, offsetPara(cursor)), label: formatearMes(cursor) });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  }

  // Un día por columna, siempre (la ventana ya es corta -- 7/14/28-31 días
  // como máximo -- así que nunca hay demasiadas columnas para ser legible).
  const columnasDia: { offsetPx: number; label: string; finDeSemana: boolean }[] = [];
  {
    const cursor = new Date(minFecha);
    while (cursor.getTime() <= maxFecha.getTime()) {
      const diaSemana = cursor.getDay();
      columnasDia.push({
        offsetPx: offsetPara(cursor),
        label: String(cursor.getDate()),
        finDeSemana: diaSemana === 0 || diaSemana === 6,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const faseEnCursoNumero = faseEnCurso(requerimiento.fases);
  const abiertas = fasesAbiertasOverride ?? new Set(faseEnCursoNumero !== null ? [faseEnCursoNumero] : []);

  function toggleFase(numero: number) {
    setFasesAbiertasOverride((prev) => {
      const base = new Set(prev ?? (faseEnCursoNumero !== null ? [faseEnCursoNumero] : []));
      if (base.has(numero)) base.delete(numero);
      else base.add(numero);
      return base;
    });
  }

  const offsetHoyPx = offsetPara(hoy);
  const hoyVisible = sinHora(hoy).getTime() >= minFecha.getTime() && sinHora(hoy).getTime() <= maxFecha.getTime();

  const alturaTotalPx = requerimiento.fases.reduce(
    (acc, fase) => acc + alturaFase(fase, abiertas.has(fase.phaseNumber)),
    0
  );

  // Offset Y de cada fase, acumulado a partir de la altura de las fases
  // anteriores -- calculado de forma pura (sin mutar una variable a través
  // de las iteraciones) para cumplir la regla de inmutabilidad de render.
  const filaFaseYPorIndice = requerimiento.fases.reduce<number[]>((acc, fase, i) => {
    if (i === 0) return [0];
    const anterior = requerimiento.fases[i - 1];
    return [...acc, acc[i - 1] + alturaFase(anterior, abiertas.has(anterior.phaseNumber))];
  }, []);

  return (
    <div className="flex rounded-lg border bg-card">
      {/* Columna de nombres — fuera del área con scroll horizontal, así nunca se pierde de vista.
          Siempre lista TODAS las tareas, sin importar si su fecha cae dentro de la ventana visible. */}
      <div className="flex w-48 shrink-0 flex-col border-r">
        <div className="h-11 border-b" />
        {requerimiento.fases.map((fase) => {
          const abierta = abiertas.has(fase.phaseNumber);
          return (
            <div key={fase.phaseNumber}>
              <button
                type="button"
                onClick={() => toggleFase(fase.phaseNumber)}
                className="flex items-center gap-1 truncate px-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                style={{ height: ALTO_FASE_PX }}
              >
                {abierta ? (
                  <ChevronUp className="h-3 w-3 shrink-0" />
                ) : (
                  <ChevronDown className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">{fase.phaseName}</span>
              </button>
              {abierta &&
                (fase.tareas.length === 0 ? (
                  <div className="px-2 text-xs text-muted-foreground/70" style={{ height: ALTO_TAREA_PX }}>
                    Sin tareas
                  </div>
                ) : (
                  fase.tareas.map((tarea) => (
                    <div
                      key={tarea.id}
                      className="flex items-center truncate px-2 text-xs text-muted-foreground"
                      style={{ height: ALTO_TAREA_PX }}
                      title={tarea.taskName}
                    >
                      {tarea.taskName}
                    </div>
                  ))
                ))}
            </div>
          );
        })}
      </div>

      {/* Área de barras -- ventana de ancho fijo (anchoTotalPx = totalDias *
          pxPorDia, siempre exacto para la escala actual). `width` fijo, no
          `minWidth`: este div nunca debe ser más ancho que su contenido. */}
      <div className="relative flex-1 overflow-x-auto">
        <div style={{ width: anchoTotalPx }}>
          <div className="sticky top-0 z-10 bg-card">
            <div className="relative h-5 border-b text-[10px] font-medium text-muted-foreground">
              {columnasMes.map((c) => (
                <span key={c.offsetPx} className="absolute top-0.5 whitespace-nowrap" style={{ left: c.offsetPx + 2 }}>
                  {c.label}
                </span>
              ))}
            </div>
            <div className="relative h-6 border-b text-[10px] text-muted-foreground">
              {columnasDia.map((c) => (
                <span
                  key={c.offsetPx}
                  className="absolute top-0.5 whitespace-nowrap"
                  style={{ left: c.offsetPx + Math.min(2, pxPorDia / 2 - 4) }}
                >
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative" style={{ height: alturaTotalPx }}>
            {columnasDia
              .filter((c) => c.finDeSemana)
              .map((c) => (
                <div
                  key={c.offsetPx}
                  className="absolute top-0 bottom-0 bg-muted/30"
                  style={{ left: c.offsetPx, width: pxPorDia }}
                />
              ))}
            {columnasDia.map((c) => (
              <div key={c.offsetPx} className="absolute top-0 bottom-0 border-l" style={{ left: c.offsetPx }} />
            ))}
            {columnasMes.map((c) => (
              <div
                key={c.offsetPx}
                className="absolute top-0 bottom-0 border-l border-foreground/20"
                style={{ left: c.offsetPx }}
              />
            ))}
            {hoyVisible && (
              <div
                className="absolute top-0 bottom-0 z-[5] border-l-2 border-primary"
                style={{ left: offsetHoyPx }}
                title="Hoy"
              />
            )}

            {requerimiento.fases.map((fase, index) => {
              const abierta = abiertas.has(fase.phaseNumber);
              const resumen = resumenFase(fase);
              const filaFaseY = filaFaseYPorIndice[index];
              const filasTareas: { tarea: PlaneacionFase["tareas"][number]; y: number }[] = abierta
                ? fase.tareas.map((tarea, i) => ({
                    tarea,
                    y: filaFaseY + ALTO_FASE_PX + i * ALTO_TAREA_PX,
                  }))
                : [];

              const deadlineVisible =
                fase.deadline &&
                sinHora(fase.deadline).getTime() >= minFecha.getTime() &&
                sinHora(fase.deadline).getTime() <= maxFecha.getTime();

              return (
                <div key={fase.phaseNumber}>
                  {deadlineVisible && (
                    <span
                      className="absolute z-[1] h-3 w-3 rotate-45 bg-foreground/70"
                      style={{ left: offsetPara(fase.deadline!), top: filaFaseY + ALTO_FASE_PX / 2 - 6 }}
                      title={`Fecha límite de fase (${fase.phaseName}): ${formatearFecha(fase.deadline!)}`}
                    />
                  )}
                  {resumen && visibleEnVentana(resumen.start, resumen.end) && (
                    <div
                      className="absolute h-2 rounded-sm bg-muted-foreground/50"
                      style={{
                        left: Math.max(0, offsetPara(resumen.start)),
                        width: Math.max(
                          offsetPara(resumen.end) - Math.max(0, offsetPara(resumen.start)) + pxPorDia,
                          ANCHO_MIN_PX
                        ),
                        top: filaFaseY + ALTO_FASE_PX / 2 - 4,
                      }}
                      title={`${fase.phaseName}: ${formatearFecha(resumen.start)} – ${formatearFecha(resumen.end)}`}
                    />
                  )}
                  {filasTareas.map(({ tarea, y: yTarea }) => {
                    if (!visibleEnVentana(tarea.start, tarea.end)) return null;
                    const offsetX = Math.max(0, offsetPara(tarea.start!));
                    const anchoPx = Math.max(offsetPara(tarea.end!) - offsetX + pxPorDia, ANCHO_MIN_PX);
                    const offsetHitoPx = offsetPara(tarea.end!) + pxPorDia;

                    return (
                      <div key={tarea.id}>
                        <div
                          className={cn(
                            "absolute h-3 rounded-sm",
                            SEMAFORO_BAR_CLASS[tarea.semaforo],
                            !tarea.plannedDatesConfirmed &&
                              "text-white/50 bg-[repeating-linear-gradient(45deg,currentColor,currentColor_3px,transparent_3px,transparent_6px)]"
                          )}
                          style={{ left: offsetX, width: anchoPx, top: yTarea + ALTO_TAREA_PX / 2 - 6 }}
                          title={tituloTarea(tarea)}
                        />
                        {tarea.milestone && offsetHitoPx <= anchoTotalPx && (
                          <span
                            className="absolute h-2.5 w-2.5 rotate-45 bg-primary"
                            style={{ left: offsetHitoPx, top: yTarea + ALTO_TAREA_PX / 2 - 5 }}
                            title={`Hito: ${tarea.milestone}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
