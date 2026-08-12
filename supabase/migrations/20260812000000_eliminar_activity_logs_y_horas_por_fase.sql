-- Refinamiento pedido por el PO (2026-08-12): la bitácora `activity_logs`
-- deja de existir -- "horas ejecutadas" pasa a ser un campo editable
-- directamente por tarea (mantenido por la aplicación, no por trigger), y
-- "horas estimadas" deja de calcularse sumando tareas: pasa a ser un dato
-- manual por FASE (no por tarea), diligenciado al crear/editar un
-- requerimiento. Se reutiliza `requirement_phase_deadlines` (ya es "una fila
-- por requerimiento+fase") en vez de crear una tabla nueva.

-- 1. Triggers y funciones que mantenían executed_hours vía activity_logs
-- (ya no hacen falta: el nuevo mecanismo se mantiene desde la aplicación).
drop trigger if exists trg_activity_logs_executed_hours_tarea_iu on activity_logs;
drop trigger if exists trg_activity_logs_executed_hours_tarea_d on activity_logs;
drop trigger if exists trg_activity_logs_executed_hours_requerimiento_iu on activity_logs;
drop trigger if exists trg_activity_logs_executed_hours_requerimiento_d on activity_logs;

drop function if exists public.trg_actualizar_executed_hours_tarea_iu();
drop function if exists public.trg_actualizar_executed_hours_tarea_d();
drop function if exists public.trg_actualizar_executed_hours_requerimiento_iu();
drop function if exists public.trg_actualizar_executed_hours_requerimiento_d();

-- 2. La tabla en sí -- se acepta perder el historial de registros
-- individuales de horas (decisión explícita del PO); solo importan los
-- totales, que de aquí en adelante mantiene la aplicación.
drop table if exists activity_logs cascade;

-- 3. Horas ejecutadas por tarea: deja de ser "derivada, no escribir a
-- mano" -- pasa a ser un campo normal que la aplicación actualiza
-- directamente cuando el Admin edita una tarea.
comment on column requirement_tasks.executed_hours is
  'Horas ejecutadas de la tarea, editable directamente por un Admin desde el detalle del requerimiento. Ya no se deriva de activity_logs (eliminada 2026-08-12) -- requirements.executed_hours se recalcula en la aplicación como la suma de esta columna para todas las tareas del requerimiento.';

-- requirement_tasks.estimated_hours queda intacta y sin uso (nunca fue
-- editable desde ningún formulario) -- el PO decidió no eliminarla para no
-- correr riesgo de romper nada; simplemente deja de leerse en la UI.
comment on column requirement_tasks.estimated_hours is
  'SIN USO desde 2026-08-12: las horas estimadas pasaron a manejarse por FASE (ver requirement_phase_deadlines.estimated_hours), no por tarea. Columna conservada sin lectura/escritura en la UI para no romper el esquema existente.';

-- 4. Horas estimadas por fase: nuevo dato manual, opcional, independiente
-- de las tareas y del total del requerimiento (sin validación de suma). Se
-- diligencia desde RequerimientoForm (crear/editar), donde todavía no
-- existe necesariamente una fecha límite de fase -- due_date deja de ser
-- obligatoria para poder guardar solo horas sin fecha.
alter table requirement_phase_deadlines
  alter column due_date drop not null;

alter table requirement_phase_deadlines
  add column estimated_hours numeric(6,2);

comment on column requirement_phase_deadlines.estimated_hours is
  'Horas estimadas manuales para esta fase de este requerimiento, diligenciadas al crear/editar el requerimiento (RequerimientoForm). Opcional, independiente del total en requirements.estimated_hours -- no hay validación de que la suma de fases coincida con el total.';

comment on column requirement_phase_deadlines.due_date is
  'Fecha límite de la fase, ahora opcional (2026-08-12): esta tabla pasó a guardar también estimated_hours, que puede diligenciarse antes de que exista una fecha límite.';

-- ROLLBACK:
-- alter table requirement_phase_deadlines drop column if exists estimated_hours;
-- delete from requirement_phase_deadlines where due_date is null;
-- alter table requirement_phase_deadlines alter column due_date set not null;
-- (activity_logs y sus triggers no son recuperables desde este rollback --
-- restaurar desde el backup diario si hiciera falta, ver supabase/RUNBOOK_BACKUP.md)
