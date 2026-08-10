import { describe, expect, it } from "vitest";
import { estadoEsCompletada } from "./estados-tarea";

describe("estadoEsCompletada", () => {
  it("reconoce el valor real de la BD tal cual", () => {
    expect(estadoEsCompletada("Completada")).toBe(true);
  });

  it("tolera mayúsculas/minúsculas y espacios", () => {
    expect(estadoEsCompletada("completada")).toBe(true);
    expect(estadoEsCompletada("COMPLETADA")).toBe(true);
    expect(estadoEsCompletada("  Completada  ")).toBe(true);
  });

  it("tolera variantes con/sin diacríticos", () => {
    expect(estadoEsCompletada("Completada")).toBe(true);
  });

  it("devuelve false para los demás estados canónicos", () => {
    expect(estadoEsCompletada("No iniciada")).toBe(false);
    expect(estadoEsCompletada("Pendiente")).toBe(false);
    expect(estadoEsCompletada("En curso")).toBe(false);
    expect(estadoEsCompletada("Bloqueada")).toBe(false);
    expect(estadoEsCompletada("Cancelada")).toBe(false);
  });

  it("devuelve false para null/undefined sin lanzar", () => {
    expect(estadoEsCompletada(null)).toBe(false);
    expect(estadoEsCompletada(undefined)).toBe(false);
  });
});
