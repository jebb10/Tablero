"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getSupabaseClient } from "@/lib/supabase/server";
import { filasFechaSchema } from "@/lib/planeacion-fechas-schema";
import { FASES_ORDEN } from "@/lib/fases-orden";
import { ESTADOS_TAREA } from "@/lib/estados-tarea";

export type GuardarFechasState = { error: string | null; success: boolean };
export type CrearTareaState = { error: string | null; success: boolean };
export type EliminarTareaState = { error: string | null; success: boolean };
export type ActualizarEstadoState = { error: string | null; success: boolean };
export type GuardarFechaLimiteFaseState = { error: string | null; success: boolean };
export type ActualizarTareaState = { error: string | null; success: boolean };

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
  phaseNumber: number,
  _prevState: CrearTareaState,
  formData: FormData
): Promise<CrearTareaState> {
  const profile = await requireAdmin();

  const taskName = formData.get("taskName");
  const dueDateRaw = formData.get("dueDate");
  const inicioRaw = formData.get("plannedStartDate");
  const finRaw = formData.get("plannedEndDate");
  const hoursSpentRaw = formData.get("hoursSpent");

  if (typeof taskName !== "string" || !taskName.trim()) {
    return { error: "El nombre de la tarea es obligatorio.", success: false };
  }
  const fase = FASES_ORDEN.find((f) => f.numero === phaseNumber);
  if (!fase) {
    return { error: "Fase inválida.", success: false };
  }
  if (typeof dueDateRaw !== "string" || !dueDateRaw.trim()) {
    return { error: "La fecha límite es obligatoria.", success: false };
  }

  let hoursSpent: number | null = null;
  if (typeof hoursSpentRaw === "string" && hoursSpentRaw.trim() !== "") {
    const parsed = Number(hoursSpentRaw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { error: "Las horas deben ser un número válido.", success: false };
    }
    if (parsed > 0) hoursSpent = parsed;
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

  const { data: nuevaTarea, error } = await supabase
    .from("requirement_tasks")
    .insert({
      requirement_id: requirementId,
      phase_number: phaseNumber,
      phase_name: fase.nombre,
      task_name: taskName.trim(),
      status: "Pendiente",
      due_date: dueDateRaw,
      planned_start_date: typeof inicioRaw === "string" && inicioRaw ? inicioRaw : null,
      planned_end_date: typeof finRaw === "string" && finRaw ? finRaw : null,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error || !nuevaTarea) {
    return {
      error: "No se pudo crear la tarea (¿ya existe una con ese nombre en esa fase?).",
      success: false,
    };
  }

  if (hoursSpent !== null) {
    await supabase.from("activity_logs").insert({
      requirement_id: requirementId,
      task_id: nuevaTarea.id,
      phase_number: phaseNumber,
      title: "Registro de horas",
      hours_spent: hoursSpent,
      logged_at: dueDateRaw,
      created_by: profile.userId,
    });
  }

  // Unidad C2.4: un requerimiento de los 21 "sin detalle" que recibe su
  // primera tarea pasa a tener detalle real -- has_detail_tracking ya no
  // gatea el acordeón (siempre se consulta), pero sigue determinando el
  // atenuado/badge "Sin detalle" de la card en el Home (dashboard-data.ts).
  await supabase
    .from("requirements")
    .update({ has_detail_tracking: true })
    .eq("id", requirementId)
    .eq("has_detail_tracking", false);

  refresh();
  return { error: null, success: true };
}

export async function actualizarEstadoTarea(
  taskId: string,
  _prevState: ActualizarEstadoState,
  formData: FormData
): Promise<ActualizarEstadoState> {
  await requireAdmin();

  const status = formData.get("status");
  if (typeof status !== "string" || !ESTADOS_TAREA.includes(status as (typeof ESTADOS_TAREA)[number])) {
    return { error: "Estado inválido.", success: false };
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("requirement_tasks").update({ status }).eq("id", taskId);

  if (error) {
    return { error: "No se pudo actualizar el estado.", success: false };
  }

  refresh();
  return { error: null, success: true };
}

// Unidad C2.2 — resto de campos de la tarea (nombre, fecha límite, notas,
// bloqueantes, asignado) que hasta ahora solo se fijaban al crearla en
// crearTarea() y quedaban fijos para siempre.
export async function actualizarTarea(
  taskId: string,
  _prevState: ActualizarTareaState,
  formData: FormData
): Promise<ActualizarTareaState> {
  await requireAdmin();

  const taskName = formData.get("taskName");
  const dueDate = formData.get("dueDate");
  const notes = formData.get("notes");
  const blockers = formData.get("blockers");
  const assignee = formData.get("assignee");

  if (typeof taskName !== "string" || !taskName.trim()) {
    return { error: "El nombre de la tarea es obligatorio.", success: false };
  }
  if (typeof dueDate !== "string" || !dueDate.trim()) {
    return { error: "La fecha límite es obligatoria.", success: false };
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("requirement_tasks")
    .update({
      task_name: taskName.trim(),
      due_date: dueDate,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      blockers: typeof blockers === "string" && blockers.trim() ? blockers.trim() : null,
      assignee: typeof assignee === "string" && assignee.trim() ? assignee.trim() : null,
    })
    .eq("id", taskId);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe otra tarea con ese nombre en esta fase.",
        success: false,
      };
    }
    return { error: "No se pudo actualizar la tarea.", success: false };
  }

  refresh();
  return { error: null, success: true };
}

export async function guardarFechaLimiteFase(
  requirementId: string,
  phaseNumber: number,
  _prevState: GuardarFechaLimiteFaseState,
  formData: FormData
): Promise<GuardarFechaLimiteFaseState> {
  await requireAdmin();

  const dueDate = formData.get("dueDate");
  if (typeof dueDate !== "string" || !dueDate.trim()) {
    return { error: "La fecha es obligatoria.", success: false };
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("requirement_phase_deadlines")
    .upsert(
      { requirement_id: requirementId, phase_number: phaseNumber, due_date: dueDate },
      { onConflict: "requirement_id,phase_number" }
    );

  if (error) {
    return { error: "No se pudo guardar la fecha.", success: false };
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
  // activity_logs.task_id es "on delete cascade" desde el hotfix
  // 20260811030000_fix_cascade_horas_tarea_eliminada.sql -- borrar una
  // tarea borra también su bitácora de horas asociada, para que el total
  // del requerimiento baje correctamente.
  const { error } = await supabase.from("requirement_tasks").delete().eq("id", taskId);

  if (error) {
    return { error: "No se pudo eliminar la tarea.", success: false };
  }

  refresh();
  return { error: null, success: true };
}
