-- Cierre técnico pre-refinamiento visual (2026-08-11)
-- Ver AUDITORIA_CORTE_2026-08-11.md en la raíz del repo para el detalle
-- completo de cada hallazgo. Resumen de esta migración:
--   1. Elimina document_versions (Fase D, fuera de alcance, sin datos,
--      RLS sin ninguna policy — se rediseña desde cero cuando se retome).
--   2. ON DELETE explícito en 2 FK que caían en NO ACTION por defecto.
--   3. Índice faltante en activity_logs.task_id (filtrado en cada
--      trigger de suma de horas).
--   4. Trigger de updated_at en requirement_phase_deadlines (le faltaba,
--      a diferencia de requirements/requirement_tasks).
--   5. Protege executed_hours (derivada por trigger) contra UPDATE
--      directo — los triggers que la mantienen ya son security definer
--      (ver 20260810120000_c1_ext_horas_por_tarea.sql y
--      20260811010000_c3_3_executed_hours_requerimiento.sql), así que
--      el REVOKE no rompe su propio recálculo interno.

-- 1. document_versions (Fase D no empezada, 0 filas, sin policies)
drop index if exists idx_document_versions_requirement;
drop table if exists document_versions;

-- 2. ON DELETE SET NULL explícito (referencias opcionales/de auditoría,
-- no de integridad estructural). Nombres de constraint confirmados como
-- los autogenerados (columnas creadas sin nombre explícito en
-- 20260101000000_baseline_fase_a.sql:39 y
-- 20260809192913_fase_c_campos_y_activity_logs.sql:38) — verificar con
-- `select conname from pg_constraint where conrelid = 'requirements'::regclass and contype = 'f';`
-- si esta migración fallara por nombre de constraint no encontrado.
alter table requirements
  drop constraint if exists requirements_parent_requirement_id_fkey,
  add constraint requirements_parent_requirement_id_fkey
    foreign key (parent_requirement_id) references requirements(id) on delete set null;

alter table activity_logs
  drop constraint if exists activity_logs_created_by_fkey,
  add constraint activity_logs_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

-- 3. Índice faltante sobre activity_logs.task_id
create index if not exists idx_activity_logs_task on activity_logs(task_id);

-- 4. Trigger de updated_at en requirement_phase_deadlines
create trigger trg_requirement_phase_deadlines_updated_at
  before update on public.requirement_phase_deadlines
  for each row execute function public.set_updated_at();

-- 5. Proteger executed_hours (derivada) contra UPDATE directo de un Admin
-- fuera del trigger. Los 4 triggers que la mantienen corren como
-- security definer, así que siguen escribiendo sin problema.
revoke update(executed_hours) on requirements from authenticated;
revoke update(executed_hours) on requirement_tasks from authenticated;

-- ROLLBACK:
-- grant update(executed_hours) on requirements to authenticated;
-- grant update(executed_hours) on requirement_tasks to authenticated;
-- drop trigger if exists trg_requirement_phase_deadlines_updated_at on requirement_phase_deadlines;
-- drop index if exists idx_activity_logs_task;
-- alter table activity_logs
--   drop constraint if exists activity_logs_created_by_fkey,
--   add constraint activity_logs_created_by_fkey
--     foreign key (created_by) references auth.users(id);
-- alter table requirements
--   drop constraint if exists requirements_parent_requirement_id_fkey,
--   add constraint requirements_parent_requirement_id_fkey
--     foreign key (parent_requirement_id) references requirements(id);
-- create table document_versions (
--   id             uuid primary key default gen_random_uuid(),
--   requirement_id uuid not null references requirements(id) on delete cascade,
--   document_name  varchar(255) not null,
--   file_url       text not null,
--   version        varchar(20) not null default 'v1.0',
--   uploaded_at    timestamptz not null default now()
-- );
-- create index idx_document_versions_requirement on document_versions(requirement_id);
