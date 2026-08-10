-- Fase C, sección 0 (PLAN_IMPLEMENTACION_FASE_C.md) — campos nuevos de
-- cabecera en requirements/requirement_tasks, contador de reabiertos vía
-- trigger, y activity_logs con autor + RLS append-only.

-- 1. Campos nuevos en requirements
alter table requirements
  add column description text,
  add column client_stakeholder text,
  add column assignees text[],
  add column reopened_count integer not null default 0;

alter table requirements drop column documentation_folder_url;

-- 2. Campos nuevos en requirement_tasks
alter table requirement_tasks
  add column assignee text,
  add column planned_dates_confirmed boolean not null default false;

-- 3. Trigger de reabiertos: EN_CURSO viniendo de ENTREGADO_PRODUCCION o CERRADO_POR_CAMBIO_ALCANCE
create or replace function trg_incrementar_reopened_count()
returns trigger as $$
begin
  if new.status = 'EN_CURSO'
     and old.status in ('ENTREGADO_PRODUCCION', 'CERRADO_POR_CAMBIO_ALCANCE') then
    new.reopened_count := old.reopened_count + 1;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger requirements_reopened_count
  before update on requirements
  for each row
  execute function trg_incrementar_reopened_count();

-- 4. activity_logs: columna de autor + RLS (append-only, mismo patrón que requirements/requirement_tasks)
alter table activity_logs
  add column created_by uuid references auth.users(id);

create policy activity_logs_select_authenticated
  on activity_logs for select
  to authenticated
  using (true);

create policy activity_logs_insert_admin
  on activity_logs for insert
  to authenticated
  with check (public.is_admin());

-- Deliberadamente SIN policy de update/delete: el registro de actividades es
-- append-only, igual que el patrón ya usado para "Cerrado por cambio de
-- alcance" (ver ROADMAP_V2.md) — ni siquiera Admin edita/borra una entrada ya guardada.

-- ROLLBACK:
-- drop policy if exists activity_logs_insert_admin on activity_logs;
-- drop policy if exists activity_logs_select_authenticated on activity_logs;
-- alter table activity_logs drop column if exists created_by;
-- drop trigger if exists requirements_reopened_count on requirements;
-- drop function if exists trg_incrementar_reopened_count();
-- alter table requirement_tasks drop column if exists planned_dates_confirmed;
-- alter table requirement_tasks drop column if exists assignee;
-- alter table requirements add column documentation_folder_url text;
-- alter table requirements drop column if exists reopened_count;
-- alter table requirements drop column if exists assignees;
-- alter table requirements drop column if exists client_stakeholder;
-- alter table requirements drop column if exists description;
