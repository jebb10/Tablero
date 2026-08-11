-- HISTÓRICO. No ejecutar. La verdad vigente son supabase/migrations/*.sql
-- (empezando por 20260101000000_baseline_fase_a.sql, que describe el estado
-- ACTUAL de prod verificado en la Unidad 0.0, no la historia de cómo se
-- llegó a él). Este archivo se conserva solo como referencia de cómo se
-- corrió manualmente en el SQL Editor durante la Fase A.
--
-- Fase A — Esquema Supabase para dashboard-414 (Positiva Web 414)
-- HISTÓRICO. Correr una sola vez en el SQL Editor de Supabase
-- (o vía conexión directa con el rol service_role/postgres), en un proyecto nuevo.

create extension if not exists pgcrypto;

create table projects (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(255) not null unique,
  slug        varchar(255) not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create table requirements (
  id                        uuid primary key default gen_random_uuid(),
  project_id                uuid not null references projects(id) on delete cascade,
  code                      varchar(255) not null,
  slug                      varchar(255) not null,
  title                     varchar(255) not null,
  category                  varchar(100),
  complexity                varchar(50),
  month_label               varchar(50),
  status                    varchar(50) not null check (status in (
                              'NO_INICIADO','EN_CURSO','PAUSADO',
                              'ENTREGADO_PRODUCCION','CERRADO_POR_CAMBIO_ALCANCE'
                            )),
  has_detail_tracking       boolean not null default false,
  parent_requirement_id     uuid references requirements(id),
  deadline                  date,
  estimated_hours           numeric(6,2) default 0,
  executed_hours            numeric(6,2) default 0,
  billing_date              text,
  notes                     text,
  documentation_folder_url  text,
  dev_environment_url       text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint requirements_code_unique_per_project unique (project_id, code),
  constraint requirements_slug_unique_per_project unique (project_id, slug)
);
create index idx_requirements_project on requirements(project_id);
create index idx_requirements_parent on requirements(parent_requirement_id);
create index idx_requirements_status on requirements(project_id, status);

create table requirement_tasks (
  id                  uuid primary key default gen_random_uuid(),
  requirement_id      uuid not null references requirements(id) on delete cascade,
  phase_number        int not null check (phase_number between 1 and 5),
  phase_name          varchar(100) not null,
  constraint requirement_tasks_phase_pair check (
    (phase_number = 1 and phase_name = 'Requerimientos') or
    (phase_number = 2 and phase_name = 'Diseño')          or
    (phase_number = 3 and phase_name = 'Desarrollo')      or
    (phase_number = 4 and phase_name = 'QA')              or
    (phase_number = 5 and phase_name = 'Producción')
  ),
  task_name           varchar(255) not null,
  detail              text,
  status              varchar(50) not null default 'Pendiente',
  estimated_hours     numeric(6,2),
  due_date            date,
  completed_date      date,
  planned_start_date  date,
  planned_end_date    date,
  milestone           text,
  blockers            text,
  notes               text,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  constraint requirement_tasks_natural_key unique (requirement_id, phase_number, task_name)
);
create index idx_requirement_tasks_requirement on requirement_tasks(requirement_id);
create index idx_requirement_tasks_planned on requirement_tasks(planned_start_date, planned_end_date);

create table activity_logs (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirements(id) on delete cascade,
  event_type     varchar(50) not null check (event_type in (
                    'SEGUIMIENTO','PRESENTACION_FLUJO','GESTION_DOCUMENTAL',
                    'REFINAMIENTO_TECNICO','OTRO'
                  )),
  title          varchar(255) not null,
  notes          text,
  hours_spent    numeric(5,2) default 0,
  logged_at      timestamptz not null default now()
);
create index idx_activity_logs_requirement on activity_logs(requirement_id);

create table document_versions (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirements(id) on delete cascade,
  document_name  varchar(255) not null,
  file_url       text not null,
  version        varchar(20) not null default 'v1.0',
  uploaded_at    timestamptz not null default now()
);
create index idx_document_versions_requirement on document_versions(requirement_id);

-- RLS: Fase A no tiene Auth todavía. Se habilita ya (buena práctica) con
-- SELECT público; se reemplaza por policies basadas en auth.uid() en Fase B.
-- La migración usa la conexión directa a Postgres (rol service_role), no el anon key.
alter table projects enable row level security;
alter table requirements enable row level security;
alter table requirement_tasks enable row level security;
alter table activity_logs enable row level security;
alter table document_versions enable row level security;

create policy "public read projects" on projects for select using (true);
create policy "public read requirements" on requirements for select using (true);
create policy "public read requirement_tasks" on requirement_tasks for select using (true);
-- activity_logs/document_versions: RLS habilitado sin policy de select pública
-- todavía (sin datos ni consumidores hasta Fase C/D).

insert into projects (name, slug, description)
values ('Positiva Web 414', 'positiva-web-414', 'Proyecto Positiva Web — bolsas de horas 414 (migrado desde Excel)');

-- Nota: updated_at no tiene trigger todavía (no hay escritura desde la app en
-- Fase A); se añade en Fase C junto con las Server Actions de escritura:
--
-- create or replace function set_updated_at() returns trigger as $$
-- begin new.updated_at = now(); return new; end; $$ language plpgsql;
-- create trigger trg_requirements_updated_at before update on requirements
--   for each row execute function set_updated_at();
