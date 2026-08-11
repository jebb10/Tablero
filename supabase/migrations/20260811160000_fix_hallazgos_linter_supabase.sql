-- Corrige los hallazgos reales del linter de seguridad de Supabase
-- (Database Linter, corrido por el PO el 2026-08-11 sobre producción):
--
--   1. rls_disabled_in_public (ERROR) en _backup_executed_hours y
--      _backup_activity_logs_horas_huerfanas -- tablas de respaldo
--      one-off de hotfixes ya verificados en producción (C3.3 y PR #16),
--      sin RLS, expuestas por PostgREST a cualquiera con la anon/
--      authenticated key. Ya cumplieron su propósito -- se eliminan.
--   2. function_search_path_mutable (WARN) en 3 funciones sin
--      `search_path` fijo -- riesgo de shadowing de esquema. Se fija
--      explícitamente (mismo patrón que is_admin()/nombre_autor(), que
--      ya lo tenían desde que se escribieron).
--   3. anon_security_definer_function_executable /
--      authenticated_security_definer_function_executable (WARN) en los
--      4 triggers de recálculo de executed_hours -- son `returns
--      trigger`, sin uso legítimo como RPC directo. Se revoca EXECUTE de
--      PUBLIC/anon/authenticated; esto NO afecta el disparo normal del
--      trigger (Postgres no re-valida EXECUTE del rol que hace el DML al
--      disparar un trigger, solo al crearlo).
--
-- NO se tocan is_admin()/nombre_autor(): ambas SÍ necesitan ser
-- ejecutables por `authenticated` a propósito -- is_admin() se llama
-- desde el USING de las policies admin_insert/admin_update/admin_delete
-- (revocar EXECUTE ahí rompería la escritura de cualquier Admin), y
-- nombre_autor() se invoca directo como RPC desde
-- src/lib/actividades-data.ts. El WARN del linter sobre esas 2 es
-- esperado y se acepta.
--
-- Tampoco se toca auth_leaked_password_protection (WARN) -- es un
-- toggle de Supabase Auth (Dashboard → Authentication → Policies →
-- Password Security), no una migración SQL.

-- 1. Tablas de respaldo ya cumplidas
drop table if exists _backup_executed_hours;
drop table if exists _backup_activity_logs_horas_huerfanas;

-- 2. search_path fijo
alter function public.set_updated_at() set search_path = public;
alter function public.trg_incrementar_reopened_count() set search_path = public;
alter function public.rpc_set_planned_dates(jsonb) set search_path = public;

-- 3. Revocar EXECUTE de los 4 triggers sin uso legítimo como RPC. Se
-- revoca de PUBLIC (el default de creación) y explícitamente de
-- anon/authenticated (Supabase suele otorgar EXECUTE ON FUNCTIONS a
-- esos 2 roles vía ALTER DEFAULT PRIVILEGES, aparte del default de
-- PUBLIC) -- sin este segundo revoke el hallazgo del linter no se
-- limpia si ese grant adicional existe.
revoke execute on function public.trg_actualizar_executed_hours_tarea_iu() from public, anon, authenticated;
revoke execute on function public.trg_actualizar_executed_hours_tarea_d() from public, anon, authenticated;
revoke execute on function public.trg_actualizar_executed_hours_requerimiento_iu() from public, anon, authenticated;
revoke execute on function public.trg_actualizar_executed_hours_requerimiento_d() from public, anon, authenticated;

-- ROLLBACK:
-- grant execute on function public.trg_actualizar_executed_hours_tarea_iu() to public, anon, authenticated;
-- grant execute on function public.trg_actualizar_executed_hours_tarea_d() to public, anon, authenticated;
-- grant execute on function public.trg_actualizar_executed_hours_requerimiento_iu() to public, anon, authenticated;
-- grant execute on function public.trg_actualizar_executed_hours_requerimiento_d() to public, anon, authenticated;
-- alter function public.set_updated_at() reset search_path;
-- alter function public.trg_incrementar_reopened_count() reset search_path;
-- alter function public.rpc_set_planned_dates(jsonb) reset search_path;
-- create table _backup_executed_hours as select id, code, executed_hours from requirements;
-- create table _backup_activity_logs_horas_huerfanas (like activity_logs);
