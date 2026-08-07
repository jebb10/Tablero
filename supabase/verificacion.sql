-- Unidad 0.0 del ROADMAP_V2.md — queries read-only de verificacion del estado
-- real de la BD contra supabase/schema.sql. NUNCA se ejecutan automaticamente
-- (no hay script ni CI que corra este archivo): se pegan a mano en el SQL
-- Editor de Supabase cuando haga falta re-verificar el esquema o los datos.
--
-- Resultados de la corrida del 2026-08-07 documentados en ROADMAP_V2.md,
-- seccion "Resultado de la Unidad 0.0".

-- 1. Columnas reales de todas las tablas public.*
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- 2. Policies de RLS existentes
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public';

-- 3. Triggers no internos
select tgname, tgrelid::regclass
from pg_trigger
where not tgisinternal;

-- 4. Estados reales de requirement_tasks (bloqueante para C2.1)
select status, count(*)
from requirement_tasks
group by 1
order by 2 desc;

-- 5. Debe ser 0: no hay fechas planeadas cargadas todavia
select count(*) from requirement_tasks where planned_start_date is not null;

-- 6. Deben ser 0: tablas forward-looking siguen vacias
select count(*) from activity_logs;
select count(*) from document_versions;

-- 7. Debe estar vacio: sin buckets de Storage todavia
select id, name from storage.buckets;

-- 8. Fixture de code/slug (usado tal cual en slug.fixtures.json, Unidad 0.6)
select code, slug from requirements order by code;

-- 9. Conteos reales (no asumir 28/185)
select count(*) from requirements;
select count(*) from requirement_tasks;

-- 10. Si da >0, hoy esos requerimientos se muestran mal ("No iniciado")
select count(*) from requirements where status = 'CERRADO_POR_CAMBIO_ALCANCE';
