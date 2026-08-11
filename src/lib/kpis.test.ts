import { describe, expect, it } from "vitest";
import { getKPIs } from "./kpis";
import type { Requerimiento } from "./types";

function req(overrides: Partial<Requerimiento> = {}): Requerimiento {
  return {
    item: "TEST_HU0001",
    slug: "test-hu0001",
    nombre: "Requerimiento de prueba",
    estado: "En curso",
    mes: null,
    complejidad: null,
    horasEstimadas: 10,
    horasEjecutadas: 5,
    horasPorEjecutar: 5,
    porcentajeAvance: 50,
    overbudget: false,
    notas: null,
    bloqueado: false,
    tieneDetalle: true,
    sinTareas: false,
    fechaLimite: null,
    semaforo: "sin-fecha",
    reabierto: 0,
    faseActual: null,
    ...overrides,
  };
}

describe("getKPIs", () => {
  it("no explota con un array vacío", () => {
    const kpis = getKPIs([]);
    expect(kpis.total).toBe(0);
    expect(kpis.porEstado).toEqual({
      "En curso": 0,
      Pausado: 0,
      "No iniciado": 0,
      "Entregado en producción": 0,
      "Cerrado por cambio de alcance": 0,
    });
  });

  it("cuenta por estado", () => {
    const kpis = getKPIs([
      req({ estado: "En curso" }),
      req({ estado: "En curso" }),
      req({ estado: "Pausado" }),
      req({ estado: "Entregado en producción" }),
    ]);
    expect(kpis.total).toBe(4);
    expect(kpis.porEstado["En curso"]).toBe(2);
    expect(kpis.porEstado.Pausado).toBe(1);
    expect(kpis.porEstado["No iniciado"]).toBe(0);
    expect(kpis.porEstado["Entregado en producción"]).toBe(1);
  });
});
