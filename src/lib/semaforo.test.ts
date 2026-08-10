import { describe, expect, it } from "vitest";
import { calcularSemaforo } from "./semaforo";

const HOY = new Date("2026-08-07T12:00:00Z");

function enDias(dias: number): Date {
  return new Date(HOY.getTime() + dias * 86_400_000);
}

describe("calcularSemaforo", () => {
  it("sin-fecha cuando no hay deadline", () => {
    expect(calcularSemaforo(null, HOY)).toBe("sin-fecha");
  });

  it("vencido cuando ya venció y no está completada", () => {
    expect(calcularSemaforo(enDias(-1), HOY)).toBe("vencido");
  });

  it("vencido hace mucho tiempo (no colapsa con rojo)", () => {
    expect(calcularSemaforo(enDias(-100), HOY)).toBe("vencido");
  });

  it("no es vencido si la tarea está completada, aunque la fecha ya pasó", () => {
    expect(calcularSemaforo(enDias(-1), HOY, true)).not.toBe("vencido");
    expect(calcularSemaforo(enDias(-100), HOY, true)).not.toBe("vencido");
  });

  it("rojo en el umbral de 3 días (inclusive)", () => {
    expect(calcularSemaforo(enDias(3), HOY)).toBe("rojo");
  });

  it("amarillo justo después del umbral rojo", () => {
    expect(calcularSemaforo(enDias(4), HOY)).toBe("amarillo");
  });

  it("amarillo en el umbral de 10 días (inclusive)", () => {
    expect(calcularSemaforo(enDias(10), HOY)).toBe("amarillo");
  });

  it("verde después del umbral amarillo", () => {
    expect(calcularSemaforo(enDias(11), HOY)).toBe("verde");
  });
});
