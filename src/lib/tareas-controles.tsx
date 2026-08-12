import type { ReactNode } from "react";
import { RoleGate } from "@/components/auth/role-gate";
import { AgregarTareaDialog } from "@/components/agregar-tarea-dialog";
import { TareaAccionesAdmin } from "@/components/tarea-acciones-admin";
import { FaseFechaLimiteForm } from "@/components/fase-fecha-limite-form";
import { FASES_ORDEN } from "@/lib/fases-orden";
import type { Fase } from "@/lib/types";

/** Construye los controles de escritura (solo Admin) para TareasPorFase,
 * compartido entre el Detalle del requerimiento y Planeación → Editar
 * fechas — misma vista, mismos datos, mismos controles en ambas pantallas. */
export function construirControlesTareas(fases: Fase[], requirementId: string) {
  const botonesAgregarTarea: ReactNode[] = FASES_ORDEN.map((f) => (
    <RoleGate role="admin" key={f.numero}>
      <AgregarTareaDialog requirementId={requirementId} phaseNumber={f.numero} />
    </RoleGate>
  ));

  const camposFechaLimiteFase: ReactNode[] = fases.map((fase, i) => (
    <RoleGate role="admin" key={FASES_ORDEN[i].numero}>
      <FaseFechaLimiteForm
        requirementId={requirementId}
        phaseNumber={FASES_ORDEN[i].numero}
        fechaLimiteFase={fase.fechaLimiteFase}
      />
    </RoleGate>
  ));

  const accionesTarea: Record<string, ReactNode> = Object.fromEntries(
    fases.flatMap((f) =>
      f.tareas.map((t) => [
        t.id,
        <RoleGate role="admin" key={t.id}>
          <TareaAccionesAdmin
            taskId={t.id}
            taskName={t.tarea}
            requirementId={requirementId}
            estadoActual={t.estado}
            plannedStartDate={t.plannedStartDate}
            plannedEndDate={t.plannedEndDate}
            executedHours={t.executedHours}
            dueDate={t.fechaLimite}
            notas={t.notas}
            bloqueantes={t.bloqueantes}
            asignado={t.asignado}
          />
        </RoleGate>,
      ])
    )
  );

  return { botonesAgregarTarea, camposFechaLimiteFase, accionesTarea };
}
