"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegistrarHorasDialog } from "@/components/registrar-horas-dialog";
import { EstadoTareaSelect } from "./estado-tarea-select";
import { FechasPlaneadasForm } from "./fechas-planeadas-form";
import { EditarTareaForm } from "./editar-tarea-form";
import { EliminarTareaButton } from "./eliminar-tarea-button";

export function TareaAccionesAdmin({
  taskId,
  taskName,
  requirementId,
  phaseNumber,
  estadoActual,
  plannedStartDate,
  plannedEndDate,
  executedHours,
  dueDate,
  notas,
  bloqueantes,
  asignado,
}: {
  taskId: string;
  taskName: string;
  requirementId: string;
  phaseNumber: number;
  estadoActual: string | null;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  executedHours: number;
  dueDate: Date | null;
  notas: string | null;
  bloqueantes: string | null;
  asignado: string | null;
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <EditarTareaForm
        taskId={taskId}
        taskName={taskName}
        dueDate={dueDate}
        notas={notas}
        bloqueantes={bloqueantes}
        asignado={asignado}
        onCerrar={() => setEditando(false)}
      />
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 border-t pt-2">
      <EstadoTareaSelect taskId={taskId} estadoActual={estadoActual} />

      <FechasPlaneadasForm
        taskId={taskId}
        plannedStartDate={plannedStartDate}
        plannedEndDate={plannedEndDate}
      />

      <RegistrarHorasDialog taskId={taskId} requirementId={requirementId} phaseNumber={phaseNumber} />

      <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </Button>

      <EliminarTareaButton taskId={taskId} taskName={taskName} executedHours={executedHours} />
    </div>
  );
}
