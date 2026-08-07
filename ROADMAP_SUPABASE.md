> **Fase A: ✅ ejecutada y verificada (2026-08-06).** Ver "Cierre de Fase A" justo debajo de este bloque para el resumen completo (qué se decidió, qué cambió respecto al plan, y qué queda pendiente). **Próximo paso para la siguiente sesión: Fase B** (§ más abajo) — Supabase Auth + roles Admin/Viewer. El punto pendiente más importante que dejó abierto Fase A **no es de Auth, es refinar la vista `/planeacion`** (ver "Cierre de Fase A" — hoy usa `due_date` como marcador de un día porque no hay fechas planeadas reales todavía).

## Cierre de Fase A (2026-08-06)

**Ejecutada de punta a punta en una sola sesión**, con el PO confirmando las 5 preguntas de §10 en vivo (respuestas: enum de `status` se queda igual, umbrales de semáforo 3/10 días confirmados, semáforo y borde de "bloqueado" **conviven**, riesgo de pausa por inactividad de Supabase free **aceptado** sin ping preventivo, botón "Sincronizar" **retirado** por completo, no re-etiquetado).

**Punto bloqueante §10.6 resuelto durante la ejecución**: se inspeccionaron las 4 hojas Gantt ocultas del Excel real. El match por nombre exacto de tarea **no fue viable** (nombres genéricos tipo "Socialización de Requerimiento", repetidos entre requerimientos, sin correspondencia con `task_name` de las hojas de detalle; EDT con tipos de dato mixtos/sucios). Se activó el fallback ya previsto en §4.4: `planned_start_date`/`planned_end_date` quedaron `NULL` para las 185 tareas migradas, y `/planeacion` usa `due_date` como marcador de un día.

**Desviaciones respecto al DDL original de §2** (documentadas aquí porque no estaban previstas):
- `requirement_tasks.milestone` se cambió de `varchar(255)` a `text` — un hito real de la hoja "Wompi" tenía 264 caracteres y rompió la migración. Ya corregido en `supabase/schema.sql` y en la base de datos real.
- El script de migración (`scripts/migrate_to_supabase.py`) **no usa `psycopg2`/conexión directa a Postgres como decía §5** — se reescribió para usar `supabase-py` sobre la API REST con la `secret key` del proyecto. Motivo: evitar que el PO tuviera que compartir la contraseña de la base de datos por chat: la `secret key` (equivalente a `service_role`) alcanza para escribir vía REST sin necesitar el wire protocol de Postgres. El DDL (`supabase/schema.sql`) sigue corriéndose manualmente en el SQL Editor de Supabase — eso si requiere acceso directo, pero es una acción manual del PO, no del script.

**Verificación real ejecutada** (no solo el reporte del script): 28 requerimientos migrados, 7 con `has_detail_tracking`, conteos de tareas por hoja coinciden con el Excel (Siniestros 47, Viajeros 16, Página Noticias 13, Directorio Médico 33, Puntos de Atención 15, Wompi 39, Rediseño +Salud 22). Dashboard, drill-down y `/planeacion` probados en `npm run dev` contra la base de datos real (no mocks) — sin banner de error, datos reales visibles.

**El `.xlsx` legado (`legado/REQUERIMIENTOS BOLSAS DE HORAS 414.xlsx`) y el Google Sheet que lo alimentaba ya NO son la fuente de datos de la app ni requieren mantenimiento** — nadie necesita seguir editándolos, sincronizándolos, ni preocuparse por el gotcha de fórmulas sin recalcular (`Ctrl+S` pendiente) documentado en fases anteriores. **El archivo `.xlsx` se borró físicamente el 2026-08-06** (decisión explícita del PO, una vez la migración quedó verificada) — a diferencia de lo que decía la sección "Rollback" de Decisiones tomadas arriba, ya **no** existe como respaldo de rollback; ese plan quedó desactualizado por esta decisión. **Pendiente real y sin resolver: definir una estrategia de backup para los datos de Supabase** (el `.xlsx` cumplía ese rol informalmente) — ver la nota en `CLAUDE.md` ("Pendiente por definir: estrategia de backup"). No se automatizó nada todavía.

**La atención de aquí en adelante debe estar en refinar el diagrama de Gantt (`/planeacion`), no en el Excel** (que ya no existe): con `planned_start_date`/`planned_end_date` en `NULL`, las barras del Gantt son todas marcadores de un día (sin duración real), lo cual es una aproximación temporal, no el diseño final. Opciones para una sesión futura, en orden de esfuerzo creciente: (a) pedirle al PO que capture fechas de inicio/fin planeadas directamente en Supabase una vez exista la pantalla de escritura de tareas (Fase C) — la única opción viable ya que el Excel de origen no existe más; (b) aceptar el fallback de `due_date` indefinidamente si el PO no lo considera prioritario frente a Fases B/C/D. (La opción de matching heurístico fuzzy contra las hojas Gantt ocultas del Excel, que se había considerado, **ya no aplica** — el archivo fuente fue borrado.)

# Roadmap — Tablero 414: migración de Excel a Supabase (multi-proyecto, auth por roles, escritura real, documentos versionados)

> **Este es un documento de HOJA DE RUTA, no un plan final cerrado.** Se ejecuta por sesiones separadas: cada fase (A/B/C/D) se retoma, se refina con más detalle en el momento de ejecutarla, y luego se implementa. Este documento debe ser suficiente para que una sesión futura, sin memoria de esta conversación, entienda el contexto completo y pueda retomar cualquier fase.

## Contexto: por qué este cambio

El dashboard "Positiva Web 414" (`C:\Users\Usuario 1\Documents\Tablero Requerimientos\dashboard-414`, Next.js 16) hoy es una app **100% de solo lectura** contra un Google Sheet exportado como `.xlsx`, sin base de datos, sin auth, sin escritura, sin soporte multi-proyecto — todas estas eran decisiones explícitas de fases anteriores ("Fase 5": *"sin BD, sin cache, sin multi-proyecto, no lo cuestiones sin que el PO lo pida"*).

El PO ahora **revierte esas decisiones explícitamente**: propuso un esquema SQL (Postgres) con `projects`, `requirements`, `activity_logs`, `requirement_tasks`, `document_versions` como base para convertir esto en una aplicación real, multi-proyecto, con login por roles y escritura, porque el objetivo es que se sienta como "una aplicación" (funcionalidad completa: multi-usuario, historial, permisos) y no como "un visor de un Excel". Es una mejora continua sin fecha límite fija, y se trabajará en sesiones cortas y frecuentes.

Este roadmap fue construido tras **más de 30 preguntas de descubrimiento** con el PO (ver §Decisiones tomadas) — no adivines respuestas a las preguntas ahí resueltas; sí sigue preguntando si una sesión de ejecución encuentra un caso no cubierto aquí.

## Decisiones tomadas (no volver a preguntar esto)

- **Alcance**: reemplaza Excel/Drive por completo. El código Excel actual (`src/lib/excel/*`, dependencia `xlsx`, botón "Sincronizar", `SHEET_ID` hardcodeado) se **elimina** en la Fase A una vez migrado y verificado — no se guarda como fallback.
- **Proveedor**: **Supabase** (Postgres + Auth + Storage en un solo servicio), elegido sobre InsForge (más nuevo, RBAC menos maduro) por estabilidad/ecosistema/documentación. Login con **Supabase Auth nativo**, sin NextAuth.
- **Multi-proyecto**: es real (no solo un contenedor técnico), pero hoy solo existe "Positiva Web 414". No se construye selector de proyecto en la UI hasta que exista un 2º proyecto real — el modelo de datos ya queda listo para eso.
- **Lectura + escritura**: este roadmap incluye pantallas de escritura reales (crear/editar requerimientos, loguear horas, actualizar tareas, subir documentos), no solo migrar el esquema.
- **Roles**: exactamente 2 — **Admin** (todo) y **Viewer** (solo lectura), roles globales (no por proyecto todavía). Primer Admin se crea manualmente vía script (no hay signup abierto). Login con email+password para ambos roles (ver Fase B, razón documentada ahí).
- **21 requerimientos heurísticos** (sin hoja de detalle real): migran solo con su `status` heurístico, **sin** filas de `requirement_tasks`, no clickeables — igual que hoy.
- **Horas ejecutadas**: pasan a ser la **suma de `activity_logs`** (append-only, sin edición de entradas existentes — una corrección se hace con una nueva entrada compensatoria, visible en el historial). Solo Admin loguea horas por ahora.
- **Cambios de alcance** (`parent_requirement_id`): pasan seguido en la práctica. El Admin cierra el requerimiento viejo y crea el nuevo **manualmente** — no hay wizard automático, solo un selector de "requerimiento padre" en el formulario y un banner de "reemplazado por" en el requerimiento cerrado.
- **Documentos**: el problema real a resolver es "encontrar rápido la versión vigente" (no es prioritario el historial de auditoría, aunque sale gratis). Se decide **subida real de archivos a Supabase Storage** (cambia el hábito actual de subir a Drive), con un flag `is_latest` explícito en `document_versions`. 4+ documentos por requerimiento, cambian seguido — ver el flag de free-tier en Fase D.
- **Tarea: estado rico**, no booleano — se mantiene texto libre como hoy (`pendiente`/`en-curso`/`bloqueada`/`completada`/etc.), no se colapsa a `is_completed`.
- **Una sola fecha límite** por requerimiento (no `flex_deadline`/`critical_integration_deadline` separadas) — el PO solo piensa en una fecha en la práctica.
- **Semáforo real** (rojo/ámbar/verde por proximidad de fecha) y **vista Gantt en sidebar colapsable** (por proyecto, basada en `planned_start_date/end_date` de tareas — mismo concepto que las 4 hojas Gantt ocultas del Excel legado, sin tabla nueva) quedan incluidos en la Fase A.
- **Categoría** (`category`): solo informativa, sin filtro UI propio (a diferencia de `complejidad`, que sí tiene filtro hoy).
- **Notificaciones**: pasivas por ahora — el PO entra a revisar, sin email/push automático.
- **Presupuesto**: preferencia por quedarse en capas gratuitas de Supabase/Vercel mientras sea posible; avisar si alguna fase se acerca a un límite (ver flags de free-tier en Fase A §3 y Fase D).
- **Rollback**: ~~confiar en los backups existentes (`.xlsx` en `legado/` + point-in-time recovery de Supabase)~~ — **desactualizado**: el `.xlsx` se borró el 2026-08-06 una vez verificada la migración (decisión del PO). Point-in-time recovery de Supabase sigue en pie, pero no es lo mismo que un backup propio — ver "Cierre de Fase A" para el pendiente real de estrategia de backup.
- **Testing**: no es prioridad en la Fase A (script de migración one-time, admin-run, se verifica con conteos/spot-checks). Sí se quiere un mínimo de pruebas automatizadas en Fase C (Server Actions de escritura) — Vitest con cliente Supabase mockeado, sin Docker/Supabase local.
- **PDF actual**: sigue útil tal cual, no se toca en este roadmap.
- **"Claude design"**: se refiere a mantener consistencia con el sistema de diseño ya establecido del proyecto (branding/`DESIGN_SYSTEM.md` de la Fase 2, shadcn+Tailwind), no una herramienta/integración nueva.

## Orden de las fases

**A → B → C → D**, cada una ejecutable en sesiones separadas:

- **Fase A** — Esquema Supabase + migración de datos del Excel + dashboard leyendo desde la BD (multi-proyecto, sigue de solo lectura) + semáforo + vista Gantt.
- **Fase B** — Supabase Auth + roles Admin/Viewer + rutas protegidas.
- **Fase C** — Pantallas de escritura: crear/editar requerimientos, loguear horas, actualizar estado de tareas, cambios de alcance.
- **Fase D** — Subida y versionado de documentos.

---

# FASE A — Migración a Supabase, multi-proyecto (solo lectura), semáforo, Gantt

## 0. Alcance de Fase A

- Crear el esquema Supabase (DDL final en §2).
- Escribir y ejecutar un script de migración one-time que lee el `.xlsx` actual (`REQUERIMIENTOS BOLSAS DE HORAS 414.xlsx`, hoja `Dashboard Principal` + 7 hojas de detalle) e inserta todo en Supabase. Sembrar el único proyecto (`projects` con 1 fila: "Positiva Web 414").
- Reemplazar la capa de datos de Next.js para leer de Supabase en vez de Excel, tocando lo mínimo posible los componentes de presentación.
- Añadir el semáforo (rojo/ámbar/verde) por proximidad de fecha límite.
- Añadir la vista Gantt con sidebar colapsable (`/planeacion`), responsive.
- Borrar código Excel legado una vez verificada la migración.
- **NO incluye**: Supabase Auth (Fase B), pantallas de escritura (Fase C), carga de documentos a Storage (Fase D). `document_versions` y `activity_logs` se crean ahora (forward-looking) pero quedan vacías.

## 1. Ajustes obligatorios al esquema propuesto por el PO

El DDL original del PO le faltan columnas para datos que **hoy sí existen y se muestran** en el dashboard. Ajustes con razón:

| Campo actual (`types.ts`/Excel) | Ajuste |
|---|---|
| `item` (código de negocio) | Añadir `requirements.code` (clave natural, única por proyecto) |
| `slug` (usado en URL) | Añadir `requirements.slug` (único por proyecto), calculado con la misma función `slugify` actual |
| `mes` | Añadir `requirements.month_label` |
| `complejidad` (tiene filtro UI hoy) | Añadir `requirements.complexity` |
| `fechaCobro` | Añadir `requirements.billing_date` (TEXT, no DATE — no siempre es fecha parseable) |
| `notas` a nivel de requerimiento | Añadir `requirements.notes` |
| `bloqueado` (derivado de notas) | NO añadir columna — sigue derivado en la app, igual que hoy |
| `horasEjecutadas` | Añadir `requirements.executed_hours` en la migración inicial; en Fase C pasa a ser `sum(activity_logs.hours_spent)` |
| `horasPorEjecutar`, `porcentajeAvance`, `overbudget` | NO añadir columnas — siguen derivados en la app |
| `tieneDetalle` (7 reales vs 21 heurísticos) | Añadir `requirements.has_detail_tracking BOOLEAN` — congela la distinción de negocio, independiente de cuántas tareas existan después |
| `category` (nueva) | Nullable; se deriva del prefijo del `code` cuando aplica un patrón claro, si no `NULL` |
| Tarea: `detalle`, `estado` rico, `horas`, `fechaLimite`, `fechaReal`, `hito`, `notas`, `bloqueantes` | `requirement_tasks` gana `detail`, `status` (texto, no boolean), `estimated_hours`, `due_date`, `completed_date`, `milestone`, `blockers`, `notes`, `sort_order` |
| Orden de tareas en una fase | Añadir `requirement_tasks.sort_order INT` |
| `flex_deadline` + `critical_integration_deadline` | Colapsar a una sola `requirements.deadline DATE NULL` |

**`requirements.status`**: los datos reales tienen exactamente 4 valores (`"En curso"`, `"Pausado"`, `"No iniciado"`, `"Entregado en producción"`); el draft del PO tenía `SOPORTE`/`CERRADO` que no existen hoy. Enum final propuesto:
```
NO_INICIADO | EN_CURSO | PAUSADO | ENTREGADO_PRODUCCION | CERRADO_POR_CAMBIO_ALCANCE
```
**Flag para el PO**: confirmar si `SOPORTE`/`CERRADO` eran intención real a futuro antes de fijar el CHECK (agregar después es trivial, pero mejor confirmarlo ahora).

`activity_logs`/`document_versions` se crean tal cual el draft (con índices) pero **no se pueblan** en la migración — no hay fuente 1:1 en el Excel hoy.

## 2. DDL final (Postgres/Supabase)

```sql
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
  milestone           varchar(255),
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
```

Nota: `updated_at` no tiene trigger todavía (no hay escritura desde la app en Fase A); añadir en Fase C:
```sql
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
create trigger trg_requirements_updated_at before update on requirements
  for each row execute function set_updated_at();
```

## 3. Riesgos de free tier

- Volumen de datos irrelevante (~150-350 filas totales) — muy por debajo de los 500 MB del free tier de Supabase.
- **Riesgo real**: un proyecto Supabase free se pausa automáticamente tras ~7 días sin tráfico. Si el PO no visita el dashboard un fin de semana largo, puede quedar pausado (se despierta manual en 1 clic desde el panel). **Resuelto (2026-08-06): el PO acepta el riesgo, sin ping preventivo.**
- Vercel free tier: sin cambios de riesgo respecto a hoy.
- Auth de Supabase (Fase B): 50k MAU free, irrelevante para este equipo.

## 4. Migración: mapeo de campos origen → destino

Fuente: `REQUERIMIENTOS BOLSAS DE HORAS 414.xlsx`, hoja `Dashboard Principal` (28 filas) + 7 hojas de detalle (Siniestros, Viajeros, Página Noticias, Directorio Médico, Puntos de Atención, Wompi, Rediseño +Salud).

### 4.1 `Dashboard Principal` → `requirements`

| Origen | Destino | Transformación |
|---|---|---|
| `Estado` | `status` | Si poblado: mapear Español→enum. Si vacío: `ESTADO_HEURISTICO[item]` o `NO_INICIADO` |
| `ITEM` | `code` | trim |
| `Requerimiento` | `title` | tal cual |
| (derivado) | `slug` | `slugify(item)` o `slugify(nombre)` — portar la función `slugify` de `workbook.ts` |
| `Mes del Requerimiento` | `month_label` | tal cual |
| `Complejidad` | `complexity` | tal cual |
| (derivado de `code`) | `category` | prefijo antes del primer `_` si matchea el patrón `PREFIJO_HU####_...`; si no, `NULL` — **verificar el patrón real en el script, no asumir** |
| `Horas estimadas` | `estimated_hours` | tal cual, 0 si vacío |
| `Horas Ejecutadas` | `executed_hours` | tal cual, 0 si vacío |
| `Fecha cobro` | `billing_date` | texto libre |
| `Notas` | `notes` | tal cual |
| `Hoja Detalle` | (no se guarda) | solo usado para decidir si parsear detalle |
| (derivado) | `has_detail_tracking` | `true` si `hojaDetalle` no nulo (7 filas) |
| (derivado) | `deadline` | recalculado tras insertar tareas para las 7 con detalle; `NULL` para las 21 heurísticas |
| — | `parent_requirement_id`, `documentation_folder_url`, `dev_environment_url` | `NULL` en la migración inicial |

`overbudget`/`porcentajeAvance`/`horasPorEjecutar`/`bloqueado`/`sinTareas` **no se migran** — siguen derivados en la app.

### 4.2 Las 7 hojas de detalle → `requirement_tasks`

Parsear igual que `detalle-sheet.ts` hoy: marcador `▶`/`►` en columna A → nueva fase (normalizar nombre → `phase_number` 1-5). Filas siguientes con columna C no vacía → fila de `requirement_tasks`:

| Columna hoja detalle | Destino |
|---|---|
| Tarea | `task_name` |
| Detalle | `detail` |
| Estado | `status` (texto libre — **imprimir el set de valores distintos encontrados** para verificar, no forzar CHECK rígido) |
| Horas | `estimated_hours` |
| Fecha límite | `due_date` |
| Fecha real | `completed_date` |
| Hito | `milestone` |
| Notas | `notes` |
| Bloqueantes | `blockers` |
| (índice de fila) | `sort_order` |
| **NUEVO** (ver §4.4) | `planned_start_date`, `planned_end_date` |

Fases `▶` sin tareas debajo → no generan fila, igual que hoy.

### 4.3 Los 21 requerimientos heurísticos

Solo fila de `requirements`: `status` = `ESTADO_HEURISTICO[code]` traducido o `NO_INICIADO`; `has_detail_tracking = false`; `deadline = NULL`; **cero filas en `requirement_tasks`**.

### 4.4 Las 4 hojas Gantt ocultas → `planned_start_date`/`planned_end_date`

**Punto abierto — requiere un spike antes de escribir esta parte del script**: no se ha inspeccionado la estructura real de `NO USAR - <Mes> 2026` (Agosto/Julio/Junio/Mayo). Antes de programar:
1. Abrir/leer el Excel en modo exploratorio: ¿hay una fila por tarea con fechas inicio/fin planeadas? ¿se referencia la tarea por nombre exacto (match contra `task_name`) o por posición/semana?
2. Si el match por nombre es viable: parsear DESPUÉS de insertar `requirement_tasks`, hacer `UPDATE ... WHERE requirement_id=... AND task_name=...`.
3. **Fallback si no es viable**: dejar `planned_start_date`/`planned_end_date` en `NULL`, y que el Gantt use `due_date` como marcador de un día (`start = end = due_date`) mientras no haya plan real — no bloquear toda la Fase A por este punto.

## 5. Migración: diseño del script

- **Python + `openpyxl`** (consistente con `legado/scripts/*.py` ya existentes) — `scripts/migrate_to_supabase.py`, en `dashboard-414`, no en `legado/`.
- Leer con `data_only=True`; verificar antes si el PO hizo el `Ctrl+S` pendiente para recalcular fórmulas (gotcha ya documentado del proyecto).
- Fuente: mismo export xlsx de Drive que usa `workbook.ts` (mismo `SHEET_ID`) o ruta local si el PO prefiere no depender de red.
- Conexión directa a Postgres (`psycopg`/`psycopg2`, `SUPABASE_DB_URL` con rol `service_role`, NO `anon key`) — transacción única.
- **Idempotencia**: `INSERT ... ON CONFLICT (project_id, code) DO UPDATE` para requirements, `ON CONFLICT (requirement_id, phase_number, task_name) DO UPDATE` para tasks. Alternativa de reset documentada en el header del script (`DELETE` por `project_id` antes de reinsertar). Todo en una transacción (`ROLLBACK` automático si algo falla).
- **Reporte de verificación al final** (sustituye tests pesados — es admin-run, no escritura de usuario final):
  1. `count(requirements) = 28` (falla el script si no).
  2. `count(requirements WHERE has_detail_tracking) = 7`.
  3. Conteo de tareas por requerimiento (comparar a ojo contra el Excel).
  4. Set de valores distintos de `status` en tareas.
  5. Spot-check de 2-3 `code` conocidos: imprimir `estimated_hours`/`executed_hours`/`status`/`deadline` insertados vs. Excel abierto.
- **Test unitario liviano** (`pytest`, sin BD real) para las funciones puras portadas (`slugify`, normalización de fase, mapeo Español→enum de status, extracción de `category`).

## 6. Semáforo (rojo/ámbar/verde)

No es columna almacenada ni generated column (no deterministas con `now()`). Se calcula en el servidor, mismo patrón que `kpis.ts` ya usa para `overbudget`. Nuevo `src/lib/semaforo.ts`:

```ts
export type Semaforo = "rojo" | "amarillo" | "verde" | "sin-fecha";
const UMBRAL_ROJO_DIAS = 3;
const UMBRAL_AMARILLO_DIAS = 10;
export function calcularSemaforo(deadline: Date | null, hoy = new Date()): Semaforo {
  if (!deadline) return "sin-fecha";
  const dias = Math.ceil((deadline.getTime() - hoy.getTime()) / 86_400_000);
  if (dias < 0 || dias <= UMBRAL_ROJO_DIAS) return "rojo";
  if (dias <= UMBRAL_AMARILLO_DIAS) return "amarillo";
  return "verde";
}
```

**Resuelto (2026-08-06): el PO confirmó los umbrales 3/10 días tal cual.** Se aplica tanto a `requirements.deadline` como a `requirement_tasks.due_date` (reutilizable en el Gantt y en `fase-stepper.tsx`).

## 7. Capa de datos Next.js: cambios por archivo

Principio: minimizar cambios en componentes de presentación — toda la traducción DB(inglés)→dominio(Español) vive en una capa de adaptación nueva.

| Archivo | Cambio |
|---|---|
| `src/lib/excel/workbook.ts`, `dashboard-sheet.ts`, `detalle-sheet.ts` | **Borrar** |
| `package.json` | quitar `xlsx`; añadir `@supabase/supabase-js` |
| `src/lib/supabase/server.ts` (nuevo) | cliente `anon`, coherente con RLS de lectura pública |
| `src/lib/dashboard-data.ts` | reescrito: consulta `requirements` por `project_id`, adapta cada fila DB → `Requerimiento` (mismo shape de retorno para no tocar `page.tsx`/`dashboard-client.tsx`) |
| `src/lib/kpis.ts` | sin cambios de lógica |
| `src/lib/types.ts` | sin cambios en los tipos de dominio; opcionalmente añadir `semaforo: Semaforo` a `Requerimiento` |
| `src/app/requerimiento/[item]/page.tsx` | reescrito: consulta `requirements`+`requirement_tasks`, reconstruye `Fase[]` (helper nuevo `src/lib/fases.ts`, reusado por el Gantt) |
| `src/app/actions.ts` | borrar `sincronizar()` — **flag para el PO**: ¿se retira el botón o se re-etiqueta como "Actualizar" con otro propósito? |
| `src/components/dashboard-client.tsx` | quitar/re-etiquetar botón "Sincronizar"; resto sin cambios (shape de `Requerimiento` no cambió) |
| `src/components/requerimiento-card.tsx` | opcional: pintar borde/dot con `req.semaforo` — **flag**: ¿reemplaza visualmente el borde de "bloqueado" o convive? |
| `.env.local` / Vercel env vars | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (runtime); `SUPABASE_DB_URL` solo para el script de migración, nunca como `NEXT_PUBLIC_*` |

Nota: a diferencia del `SHEET_ID`, las env vars de Supabase SÍ deben ir en `.env.local`/Vercel — la limitación de Vercel free documentada en `CLAUDE.md` era sobre env vars *distintas por ambiente*, una sola env var consistente en todos los ambientes es gratis. Reconfirmar en el momento de ejecutar, por si cambió.

## 8. Vista Gantt (`/planeacion`) con sidebar colapsable

- Ruta nueva `src/app/planeacion/page.tsx` (Server Component) — carga requerimientos con `has_detail_tracking = true` (los 21 heurísticos no aportan) + sus tareas (con `planned_start_date/end_date`, o fallback de `due_date`).
- Shape de datos agrupado en servidor: `{ id, code, title, fases: [{ phaseNumber, phaseName, tareas: [{ id, taskName, status, start, end, semaforo }] }] }[]`.
- Componentes: `src/components/planeacion/gantt-sidebar.tsx` + `gantt-timeline.tsx`, orquestados por `planeacion-client.tsx`.
  - Sidebar: lista de requerimientos, colapsable (desktop: `aside` con transición de ancho; mobile: drawer off-canvas — requiere `npx shadcn add sheet` con Base UI, no existe hoy en `src/components/ui/`).
  - Timeline: grid CSS por semana/mes, sin librería externa de Gantt en Fase A (volumen de datos trivial); reevaluar librería solo si se vuelve difícil de mantener a mano.
  - Tareas sin `start`/`end` se muestran en la lista pero no generan barra — no romper el layout por datos ausentes.
- Nav: añadir link "Planeación" en el header (hoy no hay nav, solo un `<header>` estático).

## 9. Multi-proyecto: alcance real en Fase A

Modelo soporta multi-proyecto real, pero solo una fila sembrada. No se construye selector de proyecto todavía (sería UI sin usuario real). `getDashboardData()`/`/planeacion` reciben el slug del proyecto activo con un default hardcodeado (`"positiva-web-414"`) en un solo lugar (`src/lib/project.ts`). Cuando exista un 2º proyecto, se agrega el switcher — el modelo de datos no necesita cambios para eso.

## 10. Preguntas para confirmar antes de ejecutar Fase A — todas resueltas (2026-08-06)

1. ¿`SOPORTE`/`CERRADO` en el enum de `status` eran intención real a futuro? → **No**, el enum se dejó con los 5 valores del roadmap.
2. Umbrales del semáforo (§6): ¿3/10 días está bien, o hay un número real (ej. ciclo de facturación)? → **Confirmados 3/10 tal cual.**
3. ¿El semáforo reemplaza el borde de "bloqueado" en la card, o conviven? → **Conviven** (dos señales distintas).
4. ¿Se acepta el riesgo de pausa por inactividad de Supabase free, o se implementa el ping preventivo ya en Fase A? → **Se acepta el riesgo**, sin ping.
5. Botón "Sincronizar": ¿se retira o se re-etiqueta? → **Se retira por completo.**
6. **Bloqueante para §4.4/§8 con datos reales**: inspeccionar las 4 hojas Gantt ocultas antes de escribir esa parte del script. → **Resuelto**: match por nombre no viable, se usó el fallback de `due_date` (ver "Cierre de Fase A" al inicio del documento — esto es lo que queda pendiente de refinar, no el Excel).

## 11. Orden de ejecución sugerido

1. Crear proyecto Supabase, correr DDL de §2 (incluye semilla del proyecto).
2. Configurar env vars (`.env.local` + Vercel).
3. Resolver la pregunta 6 de §10 (estructura real de las 4 hojas Gantt).
4. Escribir y correr `scripts/migrate_to_supabase.py` (§5). Verificar con el reporte de conteos.
5. Reescribir la capa de datos (§7): borrar `src/lib/excel/*` y reescribir `actions.ts`.
6. Confirmar que `page.tsx`/`dashboard-client.tsx`/`requerimiento-card.tsx` siguen funcionando sin tocar su lógica interna.
7. Añadir `src/lib/semaforo.ts` e integrarlo en la card (según pregunta 3).
8. Construir `/planeacion` (§8): `npx shadcn add sheet` primero, luego sidebar + timeline.
9. Quitar `xlsx` de `package.json`, build completo, verificar cero referencias a `src/lib/excel/*`.
10. Actualizar `CLAUDE.md` con el nuevo estado ("Fase A completa") — el documento vigente describe la arquitectura Excel-only, queda obsoleto.

### Archivos críticos
`src/lib/dashboard-data.ts`, `src/lib/excel/dashboard-sheet.ts`, `src/lib/excel/detalle-sheet.ts`, `src/lib/types.ts`, `src/app/requerimiento/[item]/page.tsx`, `CLAUDE.md`.

---

# FASE B — Supabase Auth + roles (Admin/Viewer)

## Hallazgos previos relevantes
No existe auth ni middleware hoy. **Next.js 16 (canary) renombra `middleware.ts` a `proxy.ts`** (ver `AGENTS.md`/`CLAUDE.md` del proyecto) — cualquier guard de rutas debe apuntar a `proxy.ts`, no a la API de `middleware.ts` que asumen la mayoría de guías de Supabase Auth. `CLAUDE.md` tiene una sección "Fase 3 — Acceso" con un plan **abandonado** (Auth.js + Google OAuth, sin roles) — al ejecutar esta fase, reemplazar esa sección, no agregarla como una fase más.

## Approach

`@supabase/ssr` (helpers cookie-based) sobre `@supabase/supabase-js` (ya añadido en Fase A). Dos clientes: browser (login form) y server (Server Components/Actions/guard).

**Rol vía tabla `profiles`**, no custom JWT claims (más simple de consultar/unir desde RLS y Server Components):

```sql
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','viewer')),
  full_name text,
  created_at timestamptz not null default now()
);
```

Roles **globales/app-wide** (no por proyecto) — simplificación deliberada; revisar si un 2º proyecto con admins distintos aparece (en ese punto, `profiles` necesitaría `project_id` o una tabla `project_members`). No construir eso ahora, pero escribir las policies de RLS referenciando `profiles.role` directamente, sin asumir un solo proyecto en otro lado.

**RLS (patrón repetible)**:
```sql
create function is_admin() returns boolean
language sql security definer as $$
  select exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin');
$$;

create policy "read_all_authenticated" on public.requirements
  for select using (auth.role() = 'authenticated');
create policy "write_admin_only" on public.requirements
  for all using (is_admin()) with check (is_admin());
```
Repetir el par lectura/escritura por cada tabla añadida en Fase C/D.

**Creación de usuarios**: sin signup abierto. Primer Admin vía `supabase.auth.admin.createUser` (script one-off, no feature del repo) + `insert into profiles` manual — documentado como runbook, no código.

**Login — recomendación: email+password para ambos roles, no split por rol.** Magic-link para Viewers ahorra una contraseña pero introduce un segundo flujo (entrega de email, expiración de link) solo para usuarios infrecuentes — más simple mantener un solo flujo con "olvidé mi contraseña". **Flag explícito para el PO**: si de verdad quiere cero-contraseña para Viewers, `signInWithOtp` (magic-link) es válido, pero la recomendación por defecto es password+reset para ambos.

**Rutas protegidas / ocultar UI de escritura**:
- `proxy.ts` verifica sesión vía cliente server de Supabase; redirige no-autenticados a `/login`.
- El ocultamiento por rol pasa a nivel de Server Component (no solo el proxy): `getCurrentProfile()` en `src/lib/auth/session.ts`, y un wrapper `<RoleGate role="admin">` que omite el JSX/bundle de controles de escritura para Viewers — no solo deshabilita un botón. RLS es el backstop real.

## Piezas a construir
`src/lib/supabase/server.ts`/`client.ts` (variantes SSR), `src/lib/auth/session.ts` (`getCurrentProfile()`, `requireAdmin()`), `proxy.ts`, `src/app/login/page.tsx` + Server Action de login, migración SQL de `profiles`+RLS+`is_admin()`, Server Action de logout.

## Preguntas abiertas
- Roles globales vs por-proyecto (revisitar si aparece un 2º proyecto con admins distintos).
- Password vs magic-link para Viewers — recomendado password+reset, confirmar con el PO.
- Compatibilidad `proxy.ts` + `@supabase/ssr` en esta versión canary de Next no está garantizada por la documentación upstream (escrita para `middleware.ts`) — verificar contra `node_modules/next/dist/docs/` antes de asumir la API, según instrucción vigente de `AGENTS.md`.

### Archivos críticos
`src/app/actions.ts`, `CLAUDE.md` (reemplazar sección "Fase 3 — Acceso").

---

# FASE C — Pantallas de escritura (CRUD)

## Approach
Server Actions en `src/app/actions/` (dividido del `actions.ts` único actual: `requirements.ts`, `tasks.ts`, `activity-logs.ts`), cada una empezando con `await requireAdmin()`. RLS es el backstop real; `requireAdmin()` es el fallo rápido/amigable.

**Formulario crear/editar requerimiento**: ruta nueva (no modal, por la cantidad de campos) `src/app/requerimiento/[item]/editar/page.tsx` — incluye selector de "requerimiento padre" (combobox sobre requerimientos del mismo proyecto, opcional, solo valida "no puede ser él mismo"), y el campo `deadline` (confirmar nombre exacto contra el esquema real de Fase A antes de implementar).

**Requerimiento reemplazado**: en un requerimiento cerrado, si otro apunta a él vía `parent_requirement_id`, banner de solo lectura "reemplazado por [link]" — pura consulta, sin Server Action nueva.

**Edición de estado de tarea inline** (en `fase-stepper.tsx`): para Admin, reemplazar el `<span>` estático de estado por un `<Select>` ligado a `updateTaskStatus(taskId, status)` (patrón `useTransition`+`refresh()`, igual que `sincronizar` hoy). Fechas como inputs inline, no modal separado — mantiene el stepper como fuente única de verdad. Viewers ven el mismo stepper sin los controles interactivos (renderizado server-side sin ellos).

**Bitácora de actividad ("Modal All-In-One")**: filas append-only en `activity_logs` (`requirement_id`, `hours_spent`, `event_type`, `title`, `notes`, `logged_at`, `created_by`). Un Dialog (Base UI) disparado desde el detalle del requerimiento, con `logActivity()` que solo inserta — no existe Server Action de update/delete para esta tabla (ni siquiera se escribe la función), reforzado también por RLS (`insert`/`select` únicamente). Lista de historial debajo/cerca del modal (`select * from activity_logs where requirement_id=:id order by logged_at desc`) — una corrección es una nueva entrada compensatoria, visible en esa misma lista, nunca una edición oculta.

`horasEjecutadas` (KPI strip, card, detalle) pasa a ser `sum(activity_logs.hours_spent)` — query simple al leer, no vista materializada (28+ requerimientos es volumen trivial; revisar solo si se mide como cuello de botella real).

## Testing
Vitest, unit-testing Server Actions con cliente Supabase mockeado (sin Docker/Supabase local). Cubrir: `requireAdmin()` rechaza no-admins, `logActivity()` inserta con shape correcto, `updateTaskStatus()` rechaza valores de status inválidos, el guard de auto-referencia del padre. Primera vez que hay tests automatizados en el repo — añadir `vitest.config.ts` + script `test`.

## Piezas a construir
`src/app/actions/{requirements,tasks,activity-logs}.ts`, `src/app/requerimiento/[item]/editar/page.tsx` + formulario, Dialog de bitácora (Base UI), variante editable de `fase-stepper.tsx` (gateada por rol), `src/lib/queries/activity-logs.ts`, `vitest.config.ts`.

## Preguntas abiertas
- Nombre exacto de columna `deadline` y valores del enum de `status` de tarea — confirmar contra el esquema real ejecutado en Fase A antes de codear.
- `sum()` en vivo vs vista/columna mantenida por trigger — no es problema al volumen actual, revisar solo si se vuelve medible.
- `useOptimistic` vs `useTransition`+revalidate para edición de tareas — empezar simple con el segundo (uso de un solo Admin, ediciones infrecuentes).

### Archivos críticos
`src/app/actions.ts`, `src/lib/types.ts`, `src/components/fase-stepper.tsx`, `src/app/requerimiento/[item]/page.tsx`.

---

# FASE D — Documentos versionados

## Approach
El problema real: "cuál es la versión vigente de cada documento" — diseñar para que esa pregunta tenga respuesta rápida y obvia; el historial de versiones sale gratis, no es el driver principal.

**Esquema**:
```sql
create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  document_name text not null,
  version int not null,
  storage_path text not null,
  file_name text not null,
  is_latest boolean not null default true,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now()
);
create unique index one_latest_per_doc on document_versions (requirement_id, document_name) where is_latest;
```

**"Vigente" = flag explícito `is_latest`**, no "más reciente por `uploaded_at`" — hace la consulta de "versión actual" trivial e indexada, independiente de colisiones de reloj, y permite forzar el invariante ("exactamente una vigente por documento") a nivel de BD vía el índice único parcial de arriba. Subir una nueva versión = transacción: `update ... set is_latest=false where ... and is_latest` + `insert ... is_latest=true, version=anterior+1`.

**Storage**: un bucket (`requirement-documents`), ruta `{project_slug}/{requirement_id}/{document_name_slug}/v{version}-{file_name}` (prefijo de proyecto aunque hoy solo haya uno, coherente con el diseño multi-proyecto de Fase A).

**Flujo de subida**: signed upload URL (Server Action `getUploadUrl()`, Admin-only) → el navegador sube directo a Storage → segunda Server Action `confirmDocumentVersion()` escribe la fila. Dos pasos (no rutear los bytes por la Server Action) para no limitar tamaño de archivo por el body de la Server Action.

**UI en detalle del requerimiento**: sección "Documentos" — por cada `document_name` distinto: última versión (nombre, quién, cuándo, botón Descargar vía signed URL) + botón "Subir nueva versión" (Admin-only) + "ver historial" colapsable (patrón ya usado en `data-quality-panel.tsx`) con todas las versiones previas, solo lectura para ambos roles.

**Acceso**: Viewer puede ver/descargar vigente y también el historial completo (sin razón para ocultarlo, solo la escritura es Admin-only). RLS: `select` para cualquier autenticado, `insert`/`update` solo Admin vía `is_admin()`. Policies del bucket de Storage reflejan lo mismo.

## Flag de free tier (pedido explícitamente por el PO)
Supabase free: **1 GB Storage, 2 GB egress/mes** (reconfirmar en el momento, estos números cambian). Estimado conservador: 28+ requerimientos × 4+ documentos × ~3-5 versiones × ~3 MB promedio ≈ **1.3 GB** — ya por encima del free tier antes de que el proyecto crezca más. **Decisión pendiente del PO antes de implementar Fase D**: (a) presupuestar Supabase Pro (~$25/mes), (b) conservar solo las últimas N versiones por documento (contradice "el historial sale gratis", pero limita el storage), o (c) excluir assets pesados no versionados (exports de Figma, videos) de Storage y dejarlos como link de Drive vía `documentation_folder_url` (columna ya existente y deliberadamente separada de `document_versions`).

## Piezas a construir
Tabla + RLS + bucket + policies de Storage (migración SQL), `src/app/actions/documents.ts` (`getUploadUrl()`, `confirmDocumentVersion()`, `getDownloadUrl()`), `src/components/document-list.tsx`, `src/components/document-upload-widget.tsx`, helper de slug de ruta (reusar/extender `slugify`).

## Preguntas abiertas
- Techo de Storage free (arriba) — decisión del PO antes de que esta fase se implemente, no solo durante.
- Confirmado: Viewers ven historial completo, no solo vigente (bajo riesgo, útil) — validar con el PO si aún no lo confirmó explícitamente en la sesión de ejecución.
- `document_name` como texto libre (no enum fijo) al inicio — revisar solo si el naming se vuelve inconsistente en la práctica.

### Archivos críticos
`src/app/requerimiento/[item]/page.tsx`, `package.json`.

---

## Verificación end-to-end (aplica a toda ejecución de este roadmap)

- Cada fase termina con `npm run lint` y `npx tsc --noEmit` limpios (recordar `$env:PATH += ";C:\Program Files\nodejs"` al iniciar la sesión de PowerShell).
- Fase A: verificar visualmente que el dashboard en `npm run dev` muestra los mismos 28 requerimientos, mismas horas/estados, que el Excel — usar el reporte de conteos del script de migración como primera pasada, luego smoke-test manual en el navegador.
- Fase B: probar login como Admin y como Viewer (dos usuarios de prueba), confirmar que Viewer no ve ningún control de escritura y que un intento directo de mutación vía RLS falla.
- Fase C: crear/editar un requerimiento de prueba, loguear una entrada de actividad, cambiar el estado de una tarea — confirmar que `horasEjecutadas` se actualiza como suma, y correr los tests de Vitest.
- Fase D: subir dos versiones de un documento de prueba, confirmar que solo la última tiene `is_latest=true` y que el historial muestra ambas.
