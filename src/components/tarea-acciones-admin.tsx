"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { RegistrarHorasDialog } from "@/components/registrar-horas-dialog";
import { ESTADOS_TAREA } from "@/lib/estados-tarea";
import {
  guardarFechasPlaneadas,
  eliminarTarea,
  actualizarEstadoTarea,
  actualizarTarea,
  type GuardarFechasState,
  type EliminarTareaState,
  type ActualizarEstadoState,
  type ActualizarTareaState,
} from "@/app/actions/tasks";

const ESTADO_FECHAS_INICIAL: GuardarFechasState = { error: null, success: false };
const ESTADO_ESTADO_INICIAL: ActualizarEstadoState = { error: null, success: false };
const ESTADO_TAREA_INICIAL: ActualizarTareaState = { error: null, success: false };

function aInputDate(fecha: Date | null): string {
  return fecha ? fecha.toISOString().slice(0, 10) : "";
}

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
  const router = useRouter();
  const [inicio, setInicio] = useState(aInputDate(plannedStartDate));
  const [fin, setFin] = useState(aInputDate(plannedEndDate));
  const [state, formAction, pending] = useActionState(guardarFechasPlaneadas, ESTADO_FECHAS_INICIAL);

  const accionEstado = actualizarEstadoTarea.bind(null, taskId);
  const [estadoState, estadoFormAction] = useActionState(accionEstado, ESTADO_ESTADO_INICIAL);
  const formEstadoRef = useRef<HTMLFormElement>(null);

  const [editando, setEditando] = useState(false);
  const accionTarea = actualizarTarea.bind(null, taskId);
  const [tareaState, tareaFormAction, guardandoTarea] = useActionState(
    accionTarea,
    ESTADO_TAREA_INICIAL
  );
  const [editSuccessVisto, setEditSuccessVisto] = useState(tareaState.success);
  if (tareaState.success !== editSuccessVisto) {
    setEditSuccessVisto(tareaState.success);
    if (tareaState.success) setEditando(false);
  }

  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function onEliminar() {
    const aviso =
      executedHours > 0
        ? `¿Eliminar la tarea "${taskName}"? Se perderán ${executedHours}h registradas. Esta acción no se puede deshacer.`
        : `¿Eliminar la tarea "${taskName}"? Esta acción no se puede deshacer.`;
    if (!window.confirm(aviso)) return;
    setEliminando(true);
    setErrorEliminar(null);
    const formData = new FormData();
    formData.append("taskId", taskId);
    const resultado: EliminarTareaState = await eliminarTarea({ error: null, success: false }, formData);
    setEliminando(false);
    if (resultado.error) {
      setErrorEliminar(resultado.error);
    } else {
      router.refresh();
    }
  }

  const filasJson = JSON.stringify([{ id: taskId, inicio: inicio || null, fin: fin || null }]);

  if (editando) {
    return (
      <form action={tareaFormAction} className="mt-2 flex flex-col gap-2 border-t pt-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`taskName-${taskId}`} className="text-xs text-muted-foreground">
              Nombre
            </Label>
            <Input id={`taskName-${taskId}`} name="taskName" defaultValue={taskName} required className="h-8" />
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
          <Textarea id={`blockers-${taskId}`} name="blockers" defaultValue={bloqueantes ?? ""} className="text-sm" />
        </div>
        {tareaState.error && <span className="text-xs text-status-bloqueo">{tareaState.error}</span>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={guardandoTarea}>
            {guardandoTarea && <Spinner />}
            Guardar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditando(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 border-t pt-2">
      <form ref={formEstadoRef} action={estadoFormAction} className="flex flex-col gap-1">
        <label htmlFor={`status-${taskId}`} className="text-xs text-muted-foreground">
          Estado
        </label>
        <select
          id={`status-${taskId}`}
          name="status"
          defaultValue={estadoActual ?? ""}
          onChange={() => formEstadoRef.current?.requestSubmit()}
          className="h-8 rounded-md border bg-transparent px-2 text-sm"
        >
          {ESTADOS_TAREA.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        {estadoState.error && <span className="text-xs text-status-bloqueo">{estadoState.error}</span>}
      </form>

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="filas" value={filasJson} />
        <div className="flex flex-col gap-1">
          <label htmlFor={`inicio-${taskId}`} className="text-xs text-muted-foreground">
            Inicio planeado
          </label>
          <input
            id={`inicio-${taskId}`}
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="h-8 rounded-md border bg-transparent px-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`fin-${taskId}`} className="text-xs text-muted-foreground">
            Fin planeado
          </label>
          <input
            id={`fin-${taskId}`}
            type="date"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            className="h-8 rounded-md border bg-transparent px-2 text-sm"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending && <Spinner />}
          Guardar fechas
        </Button>
        {state.error && <span className="text-xs text-status-bloqueo">{state.error}</span>}
      </form>

      <RegistrarHorasDialog taskId={taskId} requirementId={requirementId} phaseNumber={phaseNumber} />

      <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </Button>

      <Button type="button" size="sm" variant="ghost" onClick={onEliminar} disabled={eliminando}>
        {eliminando ? <Spinner /> : <Trash2 className="h-3.5 w-3.5 text-status-bloqueo" />}
        Eliminar tarea
      </Button>
      {errorEliminar && <span className="text-xs text-status-bloqueo">{errorEliminar}</span>}
    </div>
  );
}
