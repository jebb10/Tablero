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
import { actualizarHorasTarea, type ActualizarHorasTareaState } from "@/app/actions/tasks";
import { useCerrarAlExito } from "@/hooks/use-cerrar-al-exito";

const ESTADO_INICIAL: ActualizarHorasTareaState = { error: null, success: false };

export function EditarHorasDialog({
  taskId,
  requirementId,
  executedHours,
}: {
  taskId: string;
  requirementId: string;
  executedHours: number;
}) {
  const [open, setOpen] = useState(false);
  const accionConId = actualizarHorasTarea.bind(null, taskId, requirementId);
  const [state, formAction, pending] = useActionState(accionConId, ESTADO_INICIAL);

  useCerrarAlExito(state.success, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        <Clock className="h-3.5 w-3.5" />
        Editar horas
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Horas ejecutadas</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="executedHours">Horas ejecutadas</Label>
            <Input
              id="executedHours"
              name="executedHours"
              type="number"
              step="0.5"
              min="0"
              defaultValue={executedHours}
              required
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
