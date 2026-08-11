"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { eliminarTarea, type EliminarTareaState } from "@/app/actions/tasks";

export function EliminarTareaButton({
  taskId,
  taskName,
  executedHours,
}: {
  taskId: string;
  taskName: string;
  executedHours: number;
}) {
  const router = useRouter();
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirmar() {
    setEliminando(true);
    setError(null);
    const formData = new FormData();
    formData.append("taskId", taskId);
    const resultado: EliminarTareaState = await eliminarTarea({ error: null, success: false }, formData);
    setEliminando(false);
    if (resultado.error) {
      setError(resultado.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button type="button" size="sm" variant="ghost" disabled={eliminando} />}
        >
          {eliminando ? <Spinner /> : <Trash2 className="h-3.5 w-3.5 text-status-bloqueo" />}
          Eliminar tarea
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tarea</AlertDialogTitle>
            <AlertDialogDescription>
              {executedHours > 0
                ? `¿Eliminar la tarea "${taskName}"? Se perderán ${executedHours}h registradas. Esta acción no se puede deshacer.`
                : `¿Eliminar la tarea "${taskName}"? Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmar}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <span className="text-xs text-status-bloqueo">{error}</span>}
    </div>
  );
}
