"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  crearTarea,
  eliminarTarea,
  guardarFechasPlaneadas,
  type CrearTareaState,
  type EliminarTareaState,
  type GuardarFechasState,
} from "@/app/planeacion/[requerimiento]/editar/actions";
import type { TareaParaEdicion } from "@/lib/planeacion-data";
import { FASES_ORDEN } from "@/lib/fases-orden";

const ESTADO_FECHAS_INICIAL: GuardarFechasState = { error: null, success: false };
const ESTADO_CREAR_INICIAL: CrearTareaState = { error: null, success: false };

function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

// No se puede anidar un <form> per-fila dentro del <form> de guardado masivo
// de fechas -- HTML no permite <form> anidados. Se invoca la Server Action
// directamente como función (patrón soportado por Next.js), sin useActionState.
function BotonEliminarTarea({ taskId, taskName }: { taskId: string; taskName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm(`¿Eliminar la tarea "${taskName}"? Esta acción no se puede deshacer.`)) return;
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.append("taskId", taskId);
    const resultado: EliminarTareaState = await eliminarTarea(
      { error: null, success: false },
      formData
    );
    setPending(false);
    if (resultado.error) {
      setError(resultado.error);
    } else {
      // refresh() (next/cache) no siempre repropaga las props nuevas a este
      // Client Component en esta ruta anidada -- router.refresh() lo fuerza.
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="ghost" size="icon-sm" onClick={onClick} disabled={pending}>
        {pending ? <Spinner /> : <Trash2 className="h-3.5 w-3.5 text-status-bloqueo" />}
      </Button>
      {error && <span className="text-xs text-status-bloqueo">{error}</span>}
    </div>
  );
}

function NuevaTareaForm({ requirementId }: { requirementId: string }) {
  const router = useRouter();
  const accionConId = crearTarea.bind(null, requirementId);
  const [state, formAction, pending] = useActionState(accionConId, ESTADO_CREAR_INICIAL);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="taskName">Nombre de la tarea</Label>
        <Input id="taskName" name="taskName" placeholder="Ej. Revisión de contrato" required className="w-56" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phaseNumber">Fase</Label>
        <select
          id="phaseNumber"
          name="phaseNumber"
          required
          defaultValue=""
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="" disabled>
            Elegir…
          </option>
          {FASES_ORDEN.map((f) => (
            <option key={f.numero} value={f.numero}>
              {f.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dueDate">Fecha límite</Label>
        <Input id="dueDate" name="dueDate" type="date" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="plannedStartDate">Inicio planeado</Label>
        <Input id="plannedStartDate" name="plannedStartDate" type="date" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="plannedEndDate">Fin planeado</Label>
        <Input id="plannedEndDate" name="plannedEndDate" type="date" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Spinner />}
        <Plus className="h-4 w-4" />
        Añadir tarea
      </Button>
      {state.error && <p className="w-full text-sm text-status-bloqueo">{state.error}</p>}
    </form>
  );
}

export function EditarFechasForm({
  requirementId,
  tareas,
}: {
  requirementId: string;
  tareas: TareaParaEdicion[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(guardarFechasPlaneadas, ESTADO_FECHAS_INICIAL);
  const [fechas, setFechas] = useState<Record<string, { inicio: string; fin: string }>>(() =>
    Object.fromEntries(
      tareas.map((t) => [t.id, { inicio: t.plannedStartDate ?? "", fin: t.plannedEndDate ?? "" }])
    )
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  // El estado local de inputs solo se inicializa al montar -- cuando
  // aparece una tarea nueva (tras crearTarea + router.refresh()) o se
  // elimina una, sincronizar sin pisar ediciones no guardadas de las
  // tareas que ya estaban.
  useEffect(() => {
    setFechas((prev) => {
      const next: Record<string, { inicio: string; fin: string }> = {};
      for (const t of tareas) {
        next[t.id] = prev[t.id] ?? { inicio: t.plannedStartDate ?? "", fin: t.plannedEndDate ?? "" };
      }
      return next;
    });
  }, [tareas]);

  const filasJson = useMemo(
    () =>
      JSON.stringify(
        tareas.map((t) => ({
          id: t.id,
          inicio: fechas[t.id]?.inicio || null,
          fin: fechas[t.id]?.fin || null,
        }))
      ),
    [fechas, tareas]
  );

  return (
    <div className="flex flex-col gap-4">
      <NuevaTareaForm requirementId={requirementId} />

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="filas" value={filasJson} />
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-2.5">Tarea</th>
                <th className="p-2.5">Fase</th>
                <th className="p-2.5">Fecha límite (referencia)</th>
                <th className="p-2.5">Inicio planeado</th>
                <th className="p-2.5">Fin planeado</th>
                <th className="p-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {tareas.map((t) => (
                <tr key={t.id}>
                  <td className="max-w-56 truncate p-2.5" title={t.taskName}>
                    {t.taskName}
                  </td>
                  <td className="p-2.5 text-muted-foreground">{t.phaseName}</td>
                  <td className="p-2.5 text-muted-foreground">{formatearFecha(t.dueDate)}</td>
                  <td className="p-2.5">
                    <input
                      type="date"
                      value={fechas[t.id]?.inicio ?? ""}
                      onChange={(e) =>
                        setFechas((prev) => ({
                          ...prev,
                          [t.id]: { ...prev[t.id], inicio: e.target.value },
                        }))
                      }
                      className="h-8 rounded-md border bg-transparent px-2 text-sm"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="date"
                      value={fechas[t.id]?.fin ?? ""}
                      onChange={(e) =>
                        setFechas((prev) => ({
                          ...prev,
                          [t.id]: { ...prev[t.id], fin: e.target.value },
                        }))
                      }
                      className="h-8 rounded-md border bg-transparent px-2 text-sm"
                    />
                  </td>
                  <td className="p-2.5">
                    <BotonEliminarTarea taskId={t.id} taskName={t.taskName} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {state.error && <p className="text-sm text-status-bloqueo">{state.error}</p>}
        {state.success && <p className="text-sm text-success-text">Fechas guardadas.</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            Guardar fechas
          </Button>
        </div>
      </form>
    </div>
  );
}
