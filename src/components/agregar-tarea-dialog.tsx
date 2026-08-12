"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
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
import { crearTarea, type CrearTareaState } from "@/app/actions/tasks";
import { useCerrarAlExito } from "@/hooks/use-cerrar-al-exito";

const ESTADO_INICIAL: CrearTareaState = { error: null, success: false };

export function AgregarTareaDialog({
  requirementId,
  phaseNumber,
}: {
  requirementId: string;
  phaseNumber: number;
}) {
  const [open, setOpen] = useState(false);
  const accionConId = crearTarea.bind(null, requirementId, phaseNumber);
  const [state, formAction, pending] = useActionState(accionConId, ESTADO_INICIAL);

  useCerrarAlExito(state.success, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="h-4 w-4" />
        Añadir tarea
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir tarea</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taskName">Nombre de la tarea</Label>
            <Input id="taskName" name="taskName" placeholder="Ej. Revisión de contrato" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueDate">Fecha límite</Label>
            <Input id="dueDate" name="dueDate" type="date" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plannedStartDate">Inicio planeado</Label>
              <Input id="plannedStartDate" name="plannedStartDate" type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plannedEndDate">Fin planeado</Label>
              <Input id="plannedEndDate" name="plannedEndDate" type="date" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="executedHours">Horas ejecutadas (opcional)</Label>
            <Input id="executedHours" name="executedHours" type="number" step="0.5" min="0" />
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
