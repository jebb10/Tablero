-- Unidad C1.1 (ROADMAP_V2.md) — semillado one-off de planned_start_date/
-- planned_end_date en requirement_tasks. Verificado en vivo por el PO
-- (SQL Editor, 2026-08-10): 164/164 filas con planned_start_date NULL,
-- 88/164 (54%) con estimated_hours NULL. Idempotente: solo toca filas con
-- planned_start_date is null, así que reintentarla no duplica ni corrompe
-- nada si ya se corrió parcialmente. planned_dates_confirmed se deja en su
-- default (false) para toda fila sembrada aquí — son estimaciones, no
-- fechas confirmadas por el equipo; solo la RPC de C1.2 las marca
-- confirmed=true cuando un Admin las edita a mano.

with duracion as (
  -- 1. Duración estimada por tarea (criterio mixto aprobado por el PO):
  --    estimated_hours/6 (tope 20, mínimo 1 día) cuando existe; si no,
  --    duración fija por fase (Requerimientos 2, Diseño 4, Desarrollo 15,
  --    QA 6, Producción 1 día — ajustado por el PO al tamaño real de sus
  --    fases, distinto del default original del roadmap).
  select
    rt.id,
    rt.requirement_id,
    rt.phase_number,
    rt.sort_order,
    rt.due_date,
    case
      when rt.estimated_hours is not null
        then least(20, greatest(1, ceil(rt.estimated_hours / 6.0)))::int
      else
        case rt.phase_number
          when 1 then 2   -- Requerimientos
          when 2 then 4   -- Diseño
          when 3 then 15  -- Desarrollo
          when 4 then 6   -- QA
          when 5 then 1   -- Producción
          else 5
        end
    end as dias_duracion
  from requirement_tasks rt
  where rt.planned_start_date is null
),
ancla as (
  -- 2. Fecha ancla por requerimiento (Regla B, tareas sin due_date):
  --    min(due_date) propio → deadline - 30 → current_date.
  select
    r.id as requirement_id,
    coalesce(
      (select min(t2.due_date) from requirement_tasks t2 where t2.requirement_id = r.id),
      r.deadline - 30,
      current_date
    ) as fecha_ancla
  from requirements r
),
secuencia as (
  -- 3. Offset acumulado de días previos (solo relevante para Regla B)
  --    dentro del mismo requerimiento, en el orden real del Gantt.
  select
    d.*,
    -- sum(int) devuelve bigint en Postgres; "date + bigint" no es un
    -- operador válido (solo "date + integer") -- castear explícitamente.
    coalesce(
      sum(d.dias_duracion) over (
        partition by d.requirement_id
        order by d.phase_number, d.sort_order
        rows between unbounded preceding and 1 preceding
      ),
      0
    )::int as dias_previos
  from duracion d
),
calculado as (
  select
    s.id,
    case
      when s.due_date is not null
        then s.due_date - (s.dias_duracion - 1)                        -- Regla A
      else a.fecha_ancla + s.dias_previos                               -- Regla B
    end as nuevo_inicio,
    case
      when s.due_date is not null
        then s.due_date                                                 -- Regla A
      else a.fecha_ancla + s.dias_previos + (s.dias_duracion - 1)       -- Regla B
    end as nuevo_fin
  from secuencia s
  join ancla a on a.requirement_id = s.requirement_id
)
update requirement_tasks rt
set
  planned_start_date = calculado.nuevo_inicio,
  planned_end_date = calculado.nuevo_fin
from calculado
where rt.id = calculado.id
  and rt.planned_start_date is null;

-- 4. Reporte de verificación (informativo, no falla la migración).
do $$
declare
  n_null int;
  n_invertidas int;
  n_absurdas int;
begin
  select count(*) into n_null from requirement_tasks where planned_start_date is null or planned_end_date is null;
  select count(*) into n_invertidas from requirement_tasks where planned_end_date < planned_start_date;
  select count(*) into n_absurdas from requirement_tasks where planned_end_date - planned_start_date > 60;
  raise notice 'C1.1 verificación: % filas con fecha NULL, % con fin<inicio, % con ventana >60 días', n_null, n_invertidas, n_absurdas;
end $$;

-- ROLLBACK (deja solo las filas NO confirmadas por un Admin en NULL de
-- nuevo; las que un Admin ya haya confirmado a mano vía C1.2 se preservan):
-- update requirement_tasks set planned_start_date = null, planned_end_date = null where planned_dates_confirmed = false;
