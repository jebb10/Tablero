-- Rollback listo para ejecutar de la Unidad B.4 (flip de RLS a solo-autenticados).
-- Revierte exactamente supabase/migrations/20260809163803_fase_b_rls_authenticated.sql.
--
-- Uso durante la ventana de despliegue, si el flip rompe la lectura de datos
-- (banner de error para Admin/Viewer autenticados):
--   $env:PATH += ";C:\Program Files\nodejs"
--   $envContent = Get-Content ".env.local" -Raw
--   if ($envContent -match "(?m)^SUPABASE_DB_POOLER_URL=(.+)$") { $env:SUPABASE_DB_POOLER_URL = $matches[1].Trim() }
--   npx supabase db query --db-url $env:SUPABASE_DB_POOLER_URL --file supabase/20260809163803_fase_b_rls_authenticated.down.sql
-- (o pegar este contenido directo en el SQL Editor de Supabase si el comando anterior fallara)
--
-- Objetivo: < 5 minutos desde detectado el problema hasta aplicado.

drop trigger if exists trg_requirement_tasks_updated_at on public.requirement_tasks;
alter table public.requirement_tasks drop column if exists updated_at;
drop trigger if exists trg_requirements_updated_at on public.requirements;
drop function if exists public.set_updated_at();

drop policy if exists "admin_delete" on public.requirement_tasks;
drop policy if exists "admin_update" on public.requirement_tasks;
drop policy if exists "admin_insert" on public.requirement_tasks;
drop policy if exists "read_authenticated" on public.requirement_tasks;

drop policy if exists "admin_delete" on public.requirements;
drop policy if exists "admin_update" on public.requirements;
drop policy if exists "admin_insert" on public.requirements;
drop policy if exists "read_authenticated" on public.requirements;

drop policy if exists "read_authenticated" on public.projects;

create policy "public read projects" on public.projects
  for select using (true);
create policy "public read requirements" on public.requirements
  for select using (true);
create policy "public read requirement_tasks" on public.requirement_tasks
  for select using (true);
