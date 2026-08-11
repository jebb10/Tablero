-- EXTENSIÓN DE ALCANCE aprobada por el PO junto con C1 (2026-08-10) — FUERA
-- del diseño original de C3 (Fase C3, unidades C3.1/C3.2/C3.3), que
-- solo suma horas ejecutadas a nivel de REQUERIMIENTO (activity_logs no
-- tiene task_id en ese diseño). Esta migración agrega una vía paralela, a
-- nivel de TAREA, con el MISMO patrón que C3.3 ya eligió (columna
-- denormalizada + trigger, nunca editable a mano, nunca sumada en vivo al
-- leer), pero a nivel de tarea.
--
-- IMPORTANTE para quien retome C3 más adelante: el backfill que C3.3 tenía
-- planeado asumía activity_logs vacía antes de correr — ese supuesto YA ES
-- FALSO desde Fase C (PR #9, 2026-08-10): hay actividades reales en
-- producción.

alter table activity_logs
  add column task_id uuid references requirement_tasks(id) on delete set null;

alter table requirement_tasks
  add column executed_hours numeric(6,2) not null default 0;

comment on column requirement_tasks.executed_hours is
  'DERIVADA: suma de activity_logs.hours_spent con task_id correspondiente, mantenida por trigger (trg_activity_logs_executed_hours_tarea). NO escribir a mano. Extensión de C1 (2026-08-10), fuera del diseño original de C3, que solo opera a nivel de requerimiento — ver migración 20260810120000_c1_ext_horas_por_tarea.sql antes de ejecutar C3.1/C3.2/C3.3.';

comment on column activity_logs.task_id is
  'Extensión de C1 (2026-08-10). NULLABLE: filas existentes/nuevas a nivel de requerimiento siguen con task_id=null. Solo se puebla si el registro de actividad se hizo con el selector de tarea opcional del modal "Añadir actividad".';

-- Dos triggers separados (no uno combinado con `when (new... or old...)`)
-- para evitar cualquier ambigüedad de Postgres al referenciar NEW/OLD en
-- una rama que no aplica al tipo de evento.
create or replace function public.trg_actualizar_executed_hours_tarea_iu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.task_id is not null then
    update requirement_tasks
    set executed_hours = coalesce(
      (select sum(hours_spent) from activity_logs where task_id = new.task_id), 0
    )
    where id = new.task_id;
  end if;

  if tg_op = 'UPDATE' and old.task_id is not null and old.task_id is distinct from new.task_id then
    update requirement_tasks
    set executed_hours = coalesce(
      (select sum(hours_spent) from activity_logs where task_id = old.task_id), 0
    )
    where id = old.task_id;
  end if;

  return new;
end;
$$;

create or replace function public.trg_actualizar_executed_hours_tarea_d()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.task_id is not null then
    update requirement_tasks
    set executed_hours = coalesce(
      (select sum(hours_spent) from activity_logs where task_id = old.task_id), 0
    )
    where id = old.task_id;
  end if;

  return old;
end;
$$;

create trigger trg_activity_logs_executed_hours_tarea_iu
  after insert or update on activity_logs
  for each row
  execute function public.trg_actualizar_executed_hours_tarea_iu();

create trigger trg_activity_logs_executed_hours_tarea_d
  after delete on activity_logs
  for each row
  execute function public.trg_actualizar_executed_hours_tarea_d();

-- ROLLBACK:
-- drop trigger if exists trg_activity_logs_executed_hours_tarea_d on activity_logs;
-- drop trigger if exists trg_activity_logs_executed_hours_tarea_iu on activity_logs;
-- drop function if exists public.trg_actualizar_executed_hours_tarea_d();
-- drop function if exists public.trg_actualizar_executed_hours_tarea_iu();
-- alter table requirement_tasks drop column if exists executed_hours;
-- alter table activity_logs drop column if exists task_id;
