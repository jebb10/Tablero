-- Unidad C3.3 (Fase C3, Bitácora) — requirements.executed_hours pasa de valor
-- estático migrado del Excel a columna derivada, mantenida por trigger a
-- partir de activity_logs (misma decisión y mismo patrón ya usado por la
-- extensión de horas por TAREA de C1, ver
-- 20260810120000_c1_ext_horas_por_tarea.sql — esta unidad opera a nivel de
-- REQUERIMIENTO, no de tarea, y son extensiones independientes).
--
-- El supuesto original de C3.3 ("activity_logs vacía antes del backfill")
-- ya es falso desde Fase C (hay actividades reales en producción desde
-- 2026-08-09). El backfill de abajo NO
-- inserta el valor completo de executed_hours: inserta solo la DIFERENCIA
-- entre ese valor heredado y lo que ya hay sumado en activity_logs, para no
-- duplicar horas ya registradas.

-- 1. Backup de seguridad.
create table if not exists _backup_executed_hours as
select id, code, executed_hours from requirements;

-- 2. Backfill de la brecha, una entrada por requerimiento afectado.
with saldos as (
  select
    r.id as requirement_id,
    r.created_at,
    greatest(coalesce(r.executed_hours, 0) - coalesce(sum(a.hours_spent), 0), 0) as gap
  from requirements r
  left join activity_logs a on a.requirement_id = r.id
  group by r.id, r.created_at, r.executed_hours
)
insert into activity_logs (requirement_id, phase_number, title, notes, hours_spent, logged_at, created_by, event_type)
select
  requirement_id,
  null,
  'Saldo inicial migrado',
  'Horas ejecutadas heredadas de la migración original (Fase A), previas al registro de actividades.',
  gap,
  created_at,
  null,
  'OTRO'
from saldos
where gap > 0;

-- 3. Verificación del invariante antes de activar el trigger: tras el
-- backfill, executed_hours debe coincidir exactamente con
-- la suma real de activity_logs para cada requerimiento.
do $$
declare
  mismatches integer;
begin
  select count(*) into mismatches
  from requirements r
  left join (
    select requirement_id, coalesce(sum(hours_spent), 0) as total
    from activity_logs
    group by requirement_id
  ) a on a.requirement_id = r.id
  where coalesce(r.executed_hours, 0) is distinct from coalesce(a.total, 0);

  if mismatches > 0 then
    raise exception 'Invariante roto: % requerimiento(s) con executed_hours desincronizado tras el backfill', mismatches;
  end if;
end $$;

-- 4. Trigger de sincronización (mismo patrón de dos funciones separadas ya
-- usado en C1, para no ambigüedad de Postgres al referenciar NEW/OLD en una
-- rama que no aplica al tipo de evento).
create or replace function public.trg_actualizar_executed_hours_requerimiento_iu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update requirements
  set executed_hours = coalesce(
    (select sum(hours_spent) from activity_logs where requirement_id = new.requirement_id), 0
  )
  where id = new.requirement_id;

  if tg_op = 'UPDATE' and old.requirement_id is distinct from new.requirement_id then
    update requirements
    set executed_hours = coalesce(
      (select sum(hours_spent) from activity_logs where requirement_id = old.requirement_id), 0
    )
    where id = old.requirement_id;
  end if;

  return new;
end;
$$;

create or replace function public.trg_actualizar_executed_hours_requerimiento_d()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update requirements
  set executed_hours = coalesce(
    (select sum(hours_spent) from activity_logs where requirement_id = old.requirement_id), 0
  )
  where id = old.requirement_id;

  return old;
end;
$$;

create trigger trg_activity_logs_executed_hours_requerimiento_iu
  after insert or update on activity_logs
  for each row
  execute function public.trg_actualizar_executed_hours_requerimiento_iu();

create trigger trg_activity_logs_executed_hours_requerimiento_d
  after delete on activity_logs
  for each row
  execute function public.trg_actualizar_executed_hours_requerimiento_d();

comment on column requirements.executed_hours is
  'DERIVADA: suma de activity_logs.hours_spent para ese requerimiento, mantenida por los triggers trg_activity_logs_executed_hours_requerimiento_{iu,d}. NO escribir a mano. Incluye el backfill "Saldo inicial migrado" (ver migración) para preservar el valor heredado de la migración original (Fase A).';

-- ROLLBACK:
-- drop trigger if exists trg_activity_logs_executed_hours_requerimiento_d on activity_logs;
-- drop trigger if exists trg_activity_logs_executed_hours_requerimiento_iu on activity_logs;
-- drop function if exists public.trg_actualizar_executed_hours_requerimiento_d();
-- drop function if exists public.trg_actualizar_executed_hours_requerimiento_iu();
-- delete from activity_logs where title = 'Saldo inicial migrado' and created_by is null;
-- update requirements r set executed_hours = b.executed_hours from _backup_executed_hours b where b.id = r.id;
-- drop table if exists _backup_executed_hours;
