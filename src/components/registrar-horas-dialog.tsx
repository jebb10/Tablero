"use client";

import { useActionState, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { registrarHoras, type RegistrarHorasState } from "@/app/actions/activity-logs";

const ESTADO_INICIAL: RegistrarHorasState = { error: null, success: false };

export function RegistrarHorasDialog({
  taskId,
  requirementId,
  phaseNumber,
}: {
  taskId: string;
  requirementId: string;
  phaseNumber: number;
}) {
  const [open, setOpen] = useState(false);
  const accionConId = registrarHoras.bind(null, taskId, requirementId, phaseNumber);
  const [state, formAction, pending] = useActionState(accionConId, ESTADO_INICIAL);

  const [successVisto, setSuccessVisto] = useState(state.success);
  if (state.success !== successVisto) {
    setSuccessVisto(state.success);
    if (state.success) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        <Clock className="h-3.5 w-3.5" />
        Registrar horas
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar horas</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hoursSpent">Horas</Label>
              <Input id="hoursSpent" name="hoursSpent" type="number" step="0.5" min="0.5" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loggedAt">Fecha</Label>
              <Input id="loggedAt" name="loggedAt" type="date" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Nota (opcional)</Label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              className="resize-vertical rounded-md border bg-transparent p-2 text-sm"
            />
          </div>

          {state.error && <p className="text-sm text-status-bloqueo">{state.error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
