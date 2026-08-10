"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getSupabaseClient } from "@/lib/supabase/server";
import { filasFechaSchema } from "@/lib/planeacion-fechas-schema";
import { FASES_ORDEN } from "@/lib/fases-orden";

export type GuardarFechasState = { error: string | null; success: boolean };
export type CrearTareaState = { error: string | null; success: boolean };
export type EliminarTareaState = { error: string | null; success: boolean };

// Unidad C1.2 — guardado atómico de fechas planeadas vía RPC
// rpc_set_planned_dates (security invoker: hereda RLS del caller, un
// Viewer que la invoque por API directa recibe el mismo rechazo que un
// update directo). Marca planned_dates_confirmed=true en las filas
// tocadas -- unidireccional, nunca se "desconfirma".
export async function guardarFechasPlaneadas(
  _prevState: GuardarFechasState,
  formData: FormData
): Promise<GuardarFechasState> {
  await requireAdmin();

  const raw = formData.get("filas");
  let filas;
  try {
    filas = filasFechaSchema.parse(JSON.parse(String(raw)));
  } catch {
    return { error: "Datos inválidos.", success: false };
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase.rpc("rpc_set_planned_dates", { filas });

  if (error) {
    return { error: "No se pudo guardar.", success: false };
  }

  refresh();
  return { error: null, success: true };
}

// Ampliación de alcance de C1.2 (2026-08-10, pedida por el PO tras revisar
// la pantalla en localhost): crear/eliminar tareas -- un recorte pequeño de
// lo que sería el CRUD completo de la Unidad C2 del roadmap (sin editar
// estimated_hours/assignee/status desde aquí, eso sigue siendo C2).
export async function crearTarea(
  requirementId: string,
  _prevState: CrearTareaState,
  formData: FormData
): Promise<CrearTareaState> {
  await requireAdmin();

  const taskName = formData.get("taskName");
  const phaseNumberRaw = formData.get("phaseNumber");
  const dueDateRaw = formData.get("dueDate");
  const inicioRaw = formData.get("plannedStartDate");
  const finRaw = formData.get("plannedEndDate");

  if (typeof taskName !== "string" || !taskName.trim()) {
    return { error: "El nombre de la tarea es obligatorio.", success: false };
  }
  const phaseNumber = Number(phaseNumberRaw);
  const fase = FASES_ORDEN.find((f) => f.numero === phaseNumber);
  if (!fase) {
    return { error: "Fase inválida.", success: false };
  }

  const supabase = await getSupabaseClient();

  const { data: ultimaTarea } = await supabase
    .from("requirement_tasks")
    .select("sort_order")
    .eq("requirement_id", requirementId)
    .eq("phase_number", phaseNumber)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (ultimaTarea?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("requirement_tasks").insert({
    requirement_id: requirementId,
    phase_number: phaseNumber,
    phase_name: fase.nombre,
    task_name: taskName.trim(),
    status: "Pendiente",
    due_date: typeof dueDateRaw === "string" && dueDateRaw ? dueDateRaw : null,
    planned_start_date: typeof inicioRaw === "string" && inicioRaw ? inicioRaw : null,
    planned_end_date: typeof finRaw === "string" && finRaw ? finRaw : null,
    sort_order: sortOrder,
  });

  if (error) {
    return {
      error: "No se pudo crear la tarea (¿ya existe una con ese nombre en esa fase?).",
      success: false,
    };
  }

  refresh();
  return { error: null, success: true };
}

export async function eliminarTarea(
  _prevState: EliminarTareaState,
  formData: FormData
): Promise<EliminarTareaState> {
  await requireAdmin();

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string" || !taskId) {
    return { error: "Falta el identificador de la tarea.", success: false };
  }

  const supabase = await getSupabaseClient();
  // activity_logs.task_id es "on delete set null" (ver migración
  // 20260810120000_c1_ext_horas_por_tarea.sql) -- borrar una tarea no
  // borra su bitácora de actividades, solo desvincula el task_id.
  const { error } = await supabase.from("requirement_tasks").delete().eq("id", taskId);

  if (error) {
    return { error: "No se pudo eliminar la tarea.", success: false };
  }

  refresh();
  return { error: null, success: true };
}
