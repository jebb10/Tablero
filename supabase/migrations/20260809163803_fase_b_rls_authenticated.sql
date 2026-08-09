-- Unidad B.4 (ROADMAP_V2.md:176-240) — flip de RLS a solo-autenticados.
-- Hasta aquí, cualquiera con la anon key (pública en el bundle del
-- navegador) podía leer projects/requirements/requirement_tasks por
-- PostgREST aunque la UI pidiera login. Esta es la unidad que realmente
-- aporta seguridad: implementa la decisión #1 de ROADMAP_V2.md.
--
-- Precondición dura verificada antes de aplicar: B.3 desplegada y
-- verificada en producción (login/logout/proxy.ts exigiendo sesión).

drop policy if exists "public read projects"          on public.projects;
drop policy if exists "public read requirements"      on public.requirements;
drop policy if exists "public read requirement_tasks" on public.requirement_tasks;

-- Patrón repetible por tabla. "to authenticated" deja al rol anon sin
-- ninguna policy => cero filas. Es preferible a auth.role()='authenticated':
-- se evalúa a nivel de rol, no por fila. Policies explícitas por comando en
-- vez de "for all": "for all" cubre también select y, combinándose por OR
-- con la de lectura, oscurece la intención sin cambiar el resultado.

-- projects: solo lectura. Crear proyectos no está en alcance; el único
-- proyecto real se sembró por DDL en la Fase A.
create policy "read_authenticated" on public.projects
  for select to authenticated using (true);

-- requirements
create policy "read_authenticated" on public.requirements
  for select to authenticated using (true);
create policy "admin_insert" on public.requirements
  for insert to authenticated with check (public.is_admin());
create policy "admin_update" on public.requirements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_delete" on public.requirements
  for delete to authenticated using (public.is_admin());

-- requirement_tasks
create policy "read_authenticated" on public.requirement_tasks
  for select to authenticated using (true);
create policy "admin_insert" on public.requirement_tasks
  for insert to authenticated with check (public.is_admin());
create policy "admin_update" on public.requirement_tasks
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin_delete" on public.requirement_tasks
  for delete to authenticated using (public.is_admin());

-- activity_logs y document_versions: sus policies se definen en C3.1 y
-- D.1 respectivamente — siguen vacías y sin policies hasta entonces.

-- Trigger de updated_at (estaba comentado en schema.sql:118-124; se activa
-- ahora porque a partir de aquí puede haber escrituras). Contradicción #2
-- de ROADMAP_V2.md.
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create trigger trg_requirements_updated_at before update on public.requirements
  for each row execute function public.set_updated_at();

-- requirement_tasks no tenía updated_at y C1/C2 la van a editar
-- constantemente:
alter table public.requirement_tasks add column updated_at timestamptz not null default now();
create trigger trg_requirement_tasks_updated_at before update on public.requirement_tasks
  for each row execute function public.set_updated_at();

-- ROLLBACK:
-- drop trigger if exists trg_requirement_tasks_updated_at on public.requirement_tasks;
-- alter table public.requirement_tasks drop column if exists updated_at;
-- drop trigger if exists trg_requirements_updated_at on public.requirements;
-- drop function if exists public.set_updated_at();
-- drop policy if exists "admin_delete" on public.requirement_tasks;
-- drop policy if exists "admin_update" on public.requirement_tasks;
-- drop policy if exists "admin_insert" on public.requirement_tasks;
-- drop policy if exists "read_authenticated" on public.requirement_tasks;
-- drop policy if exists "admin_delete" on public.requirements;
-- drop policy if exists "admin_update" on public.requirements;
-- drop policy if exists "admin_insert" on public.requirements;
-- drop policy if exists "read_authenticated" on public.requirements;
-- drop policy if exists "read_authenticated" on public.projects;
-- create policy "public read requirement_tasks" on public.requirement_tasks
--   for select using (true);
-- create policy "public read requirements" on public.requirements
--   for select using (true);
-- create policy "public read projects" on public.projects
--   for select using (true);
