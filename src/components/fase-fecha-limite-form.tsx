"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { guardarFechaLimiteFase, type GuardarFechaLimiteFaseState } from "@/app/actions/tasks";
import { aInputDate } from "@/lib/fechas";

const ESTADO_INICIAL: GuardarFechaLimiteFaseState = { error: null, success: false };

export function FaseFechaLimiteForm({
  requirementId,
  phaseNumber,
  fechaLimiteFase,
}: {
  requirementId: string;
  phaseNumber: number;
  fechaLimiteFase: Date | null;
}) {
  const [fecha, setFecha] = useState(aInputDate(fechaLimiteFase));
  const accionConId = guardarFechaLimiteFase.bind(null, requirementId, phaseNumber);
  const [state, formAction, pending] = useActionState(accionConId, ESTADO_INICIAL);

  // `className="contents"` (display: contents) hace que el <form> mismo
  // desaparezca de la caja del layout: sus dos hijos directos (el campo de
  // fecha y el botón) pasan a ser ítems del grid del padre (2 columnas en
  // `tareas-por-fase.tsx`) -- el campo ocupa toda la fila 1 (col-span-2) y
  // el botón cae solo a la fila 2, junto a "Añadir tarea", sin dejar de
  // pertenecer al mismo <form> (sigue siendo un submit normal).
  return (
    <form action={formAction} className="contents" onClick={(e) => e.stopPropagation()}>
      <div className="col-start-1 row-start-1 flex w-full flex-col gap-0.5 justify-self-end sm:w-36">
        <label htmlFor={`fase-fecha-${requirementId}-${phaseNumber}`} className="text-[10px] text-muted-foreground">
          Fecha límite de fase
        </label>
        <input
          id={`fase-fecha-${requirementId}-${phaseNumber}`}
          name="dueDate"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="h-7 w-full rounded-md border bg-transparent px-1.5 text-xs"
        />
      </div>
      <div className="col-start-1 row-start-2 flex flex-col items-start justify-self-start gap-0.5">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending && <Spinner />}
          Guardar
        </Button>
        {state.error && <span className="text-xs text-status-bloqueo">{state.error}</span>}
      </div>
    </form>
  );
}
