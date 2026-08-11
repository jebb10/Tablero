-- Hotfix (2026-08-11): eliminar una tarea con horas registradas no bajaba
-- el contador de horas del requerimiento (reportado por el PO sobre
-- "estandarización de mapas").
--
-- Causa raíz: activity_logs.task_id tenía `on delete set null` (ver
-- 20260810120000_c1_ext_horas_por_tarea.sql). Al borrar la tarea, Postgres
-- solo desvinculaba sus activity_logs (task_id = null), nunca las borraba
-- -- el trigger de nivel-requerimiento (20260811010000) solo reacciona a
-- cambios en requirement_id/hours_spent, así que el SUM no cambiaba: las
-- horas quedaban huérfanas pero seguían contando. El PO decidió que las
-- horas de una tarea eliminada deben restarse del total, no permanecer.

-- 1. Cambiar la FK a ON DELETE CASCADE: borrar una tarea borra también sus
-- activity_logs, lo que sí dispara el trigger de DELETE existente
-- (trg_activity_logs_executed_hours_requerimiento_d) y baja el total.
alter table activity_logs
  drop constraint if exists activity_logs_task_id_fkey;

alter table activity_logs
  add constraint activity_logs_task_id_fkey
  foreign key (task_id) references requirement_tasks(id) on delete cascade;

-- 2. Reparación de datos ya afectados en producción. La migración de fusión
-- (20260811020000_c3_fusion_tarea_actividad.sql) ya vinculó a una tarea real
-- TODAS las filas con phase_number is not null que existían en ese momento
-- -- por lo tanto cualquier fila hoy con phase_number is not null y
-- task_id is null es necesariamente huérfana por un borrado posterior (a
-- diferencia de "Saldo inicial migrado"/histórico viejo, que tiene
-- phase_number is null y no se toca acá).
--
-- Auditoría corrida antes de escribir este DELETE (2026-08-11, contra
-- producción): único caso, PUNT_HU0001_PuntosdeAtención ("Estandarización
-- Mapas"), 4 filas / 6h huérfanas, executed_hours 21 -> 15 tras reparar.
-- Confirmado con el PO antes de aplicar.
create table if not exists _backup_activity_logs_horas_huerfanas as
select * from activity_logs where task_id is null and phase_number is not null;

delete from activity_logs where task_id is null and phase_number is not null;

-- 3. Verificación del invariante (mismo patrón que C3.3).
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
    raise exception 'Invariante roto: % requerimiento(s) con executed_hours desincronizado tras la reparación', mismatches;
  end if;
end $$;

-- ROLLBACK:
-- insert into activity_logs select * from _backup_activity_logs_horas_huerfanas;
-- drop table if exists _backup_activity_logs_horas_huerfanas;
-- alter table activity_logs drop constraint if exists activity_logs_task_id_fkey;
-- alter table activity_logs add constraint activity_logs_task_id_fkey
--   foreign key (task_id) references requirement_tasks(id) on delete set null;
