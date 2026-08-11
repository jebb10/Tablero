"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { guardarFechaLimiteFase, type GuardarFechaLimiteFaseState } from "@/app/actions/tasks";

const ESTADO_INICIAL: GuardarFechaLimiteFaseState = { error: null, success: false };

function aInputDate(fecha: Date | null): string {
  return fecha ? fecha.toISOString().slice(0, 10) : "";
}

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

  return (
    <form action={formAction} className="flex items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col gap-0.5">
        <label htmlFor={`fase-fecha-${requirementId}-${phaseNumber}`} className="text-[10px] text-muted-foreground">
          Fecha límite de fase
        </label>
        <input
          id={`fase-fecha-${requirementId}-${phaseNumber}`}
          name="dueDate"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="h-7 rounded-md border bg-transparent px-1.5 text-xs"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending && <Spinner />}
        Guardar
      </Button>
      {state.error && <span className="text-xs text-status-bloqueo">{state.error}</span>}
    </form>
  );
}
