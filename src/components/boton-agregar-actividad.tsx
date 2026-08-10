"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { agregarActividad, type AgregarActividadState } from "@/app/requerimiento/[item]/actions";
import { TIPO_ACTIVIDAD_LABEL } from "@/lib/actividad-tipos";

const ESTADO_INICIAL: AgregarActividadState = { error: null, success: false };

function ModalActividad({
  requirementId,
  onClose,
}: {
  requirementId: string;
  onClose: () => void;
}) {
  const accionConId = agregarActividad.bind(null, requirementId);
  const [state, formAction, pending] = useActionState(accionConId, ESTADO_INICIAL);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Añadir actividad</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eventType">Tipo</Label>
            <select
              id="eventType"
              name="eventType"
              required
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              defaultValue="SEGUIMIENTO"
            >
              {Object.entries(TIPO_ACTIVIDAD_LABEL).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" placeholder="Ej. Reunión de seguimiento semanal" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Comentario / notas</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="resize-vertical rounded-md border bg-transparent p-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hoursSpent">Horas</Label>
              <Input id="hoursSpent" name="hoursSpent" type="number" step="0.5" min="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loggedAt">Fecha</Label>
              <Input id="loggedAt" name="loggedAt" type="date" />
            </div>
          </div>

          {state.error && <p className="text-sm text-status-bloqueo">{state.error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BotonAgregarActividad({ requirementId }: { requirementId: string }) {
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setModalAbierto(true)}>
        <Plus className="h-4 w-4" />
        Añadir actividad
      </Button>
      {modalAbierto && (
        <ModalActividad requirementId={requirementId} onClose={() => setModalAbierto(false)} />
      )}
    </>
  );
}
