"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { aInputDate } from "@/lib/fechas";
import { actualizarTarea, type ActualizarTareaState } from "@/app/actions/tasks";
import { useCerrarAlExito } from "@/hooks/use-cerrar-al-exito";

const ESTADO_INICIAL: ActualizarTareaState = { error: null, success: false };

export function EditarTareaForm({
  taskId,
  taskName,
  dueDate,
  notas,
  bloqueantes,
  asignado,
  onCerrar,
}: {
  taskId: string;
  taskName: string;
  dueDate: Date | null;
  notas: string | null;
  bloqueantes: string | null;
  asignado: string | null;
  onCerrar: () => void;
}) {
  const accionTarea = actualizarTarea.bind(null, taskId);
  const [state, formAction, pending] = useActionState(accionTarea, ESTADO_INICIAL);
  useCerrarAlExito(state.success, onCerrar);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2 border-t pt-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`taskName-${taskId}`} className="text-xs text-muted-foreground">
            Nombre
          </Label>
          <Input
            id={`taskName-${taskId}`}
            name="taskName"
            defaultValue={taskName}
            required
            className="h-8"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`dueDate-${taskId}`} className="text-xs text-muted-foreground">
            Fecha límite
          </Label>
          <Input
            id={`dueDate-${taskId}`}
            name="dueDate"
            type="date"
            defaultValue={aInputDate(dueDate)}
            required
            className="h-8"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`assignee-${taskId}`} className="text-xs text-muted-foreground">
          Asignado
        </Label>
        <Input id={`assignee-${taskId}`} name="assignee" defaultValue={asignado ?? ""} className="h-8" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`notes-${taskId}`} className="text-xs text-muted-foreground">
          Notas
        </Label>
        <Textarea id={`notes-${taskId}`} name="notes" defaultValue={notas ?? ""} className="text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`blockers-${taskId}`} className="text-xs text-muted-foreground">
          Bloqueantes
        </Label>
        <Textarea
          id={`blockers-${taskId}`}
          name="blockers"
          defaultValue={bloqueantes ?? ""}
          className="text-sm"
        />
      </div>
      {state.error && <span className="text-xs text-status-bloqueo">{state.error}</span>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Spinner />}
          Guardar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
