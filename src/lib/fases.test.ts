import { describe, expect, it } from "vitest";
import { agruparPorFase, type RequirementTaskRow } from "./fases";

function tarea(overrides: Partial<RequirementTaskRow> = {}): RequirementTaskRow {
  return {
    id: "tarea-test",
    phase_number: 1,
    phase_name: "Requerimientos",
    task_name: "Tarea de prueba",
    detail: null,
    status: "Pendiente",
    estimated_hours: null,
    due_date: null,
    completed_date: null,
    milestone: null,
    blockers: null,
    notes: null,
    sort_order: 0,
    assignee: null,
    planned_start_date: null,
    planned_end_date: null,
    planned_dates_confirmed: false,
    executed_hours: 0,
    ...overrides,
  };
}

describe("agruparPorFase", () => {
  it("devuelve las 5 fases en orden aunque no haya tareas", () => {
    const fases = agruparPorFase([]);
    expect(fases.map((f) => f.nombre)).toEqual([
      "Requerimientos",
      "Diseño",
      "Desarrollo",
      "QA",
      "Producción",
    ]);
    expect(fases.every((f) => f.estado === "pendiente")).toBe(true);
  });

  it("marca una fase como completada solo si todas sus tareas lo están", () => {
    const fases = agruparPorFase([
      tarea({ phase_number: 3, phase_name: "Desarrollo", status: "Completada" }),
      tarea({ phase_number: 3, phase_name: "Desarrollo", status: "Completada" }),
    ]);
    const desarrollo = fases.find((f) => f.nombre === "Desarrollo")!;
    expect(desarrollo.estado).toBe("completada");
  });

  it("marca una fase como en-curso si tiene alguna tarea no completada", () => {
    const fases = agruparPorFase([
      tarea({ phase_number: 3, phase_name: "Desarrollo", status: "Completada" }),
      tarea({ phase_number: 3, phase_name: "Desarrollo", status: "En curso" }),
    ]);
    const desarrollo = fases.find((f) => f.nombre === "Desarrollo")!;
    expect(desarrollo.estado).toBe("en-curso");
  });
});
