"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { aInputDate } from "@/lib/fechas";
import { guardarFechasPlaneadas, type GuardarFechasState } from "@/app/actions/tasks";

const ESTADO_INICIAL: GuardarFechasState = { error: null, success: false };

export function FechasPlaneadasForm({
  taskId,
  plannedStartDate,
  plannedEndDate,
}: {
  taskId: string;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
}) {
  const [inicio, setInicio] = useState(aInputDate(plannedStartDate));
  const [fin, setFin] = useState(aInputDate(plannedEndDate));
  const [state, formAction, pending] = useActionState(guardarFechasPlaneadas, ESTADO_INICIAL);

  const filasJson = JSON.stringify([{ id: taskId, inicio: inicio || null, fin: fin || null }]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="filas" value={filasJson} />
      <div className="flex flex-col gap-1">
        <label htmlFor={`inicio-${taskId}`} className="text-xs text-muted-foreground">
          Inicio planeado
        </label>
        <Input
          id={`inicio-${taskId}`}
          type="date"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          className="h-8"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`fin-${taskId}`} className="text-xs text-muted-foreground">
          Fin planeado
        </label>
        <Input
          id={`fin-${taskId}`}
          type="date"
          value={fin}
          onChange={(e) => setFin(e.target.value)}
          className="h-8"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending && <Spinner />}
        Guardar fechas
      </Button>
      {state.error && <span className="text-xs text-status-bloqueo">{state.error}</span>}
    </form>
  );
}
