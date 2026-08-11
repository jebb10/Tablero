"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADOS_TAREA } from "@/lib/estados-tarea";
import { actualizarEstadoTarea, type ActualizarEstadoState } from "@/app/actions/tasks";

const ESTADO_INICIAL: ActualizarEstadoState = { error: null, success: false };

export function EstadoTareaSelect({
  taskId,
  estadoActual,
}: {
  taskId: string;
  estadoActual: string | null;
}) {
  const accionEstado = actualizarEstadoTarea.bind(null, taskId);
  const [estadoState, estadoFormAction] = useActionState(accionEstado, ESTADO_INICIAL);

  function onValueChange(value: string | null) {
    if (!value) return;
    const formData = new FormData();
    formData.append("status", value);
    estadoFormAction(formData);
  }

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={`status-${taskId}`} className="text-xs text-muted-foreground">
        Estado
      </Label>
      <Select name="status" defaultValue={estadoActual ?? undefined} onValueChange={onValueChange}>
        <SelectTrigger id={`status-${taskId}`} className="h-8 text-sm">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          {ESTADOS_TAREA.map((e) => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {estadoState.error && <span className="text-xs text-status-bloqueo">{estadoState.error}</span>}
    </div>
  );
}
