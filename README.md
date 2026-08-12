# Dashboard 414 — Seguimiento de Requerimientos

## Objetivo

Herramienta de uso diario para el seguimiento de un proyecto de software real:
para cada requerimiento, muestra en qué estado va, cuántas horas se han
consumido frente a lo estimado (a nivel de requerimiento y por fase), y el
detalle de sus tareas por fase (Requerimientos → Diseño → Desarrollo → QA →
Producción). No es un reporte estático ni un ejercicio de aprendizaje — es
la fuente de verdad del Product Owner para saber, en cualquier momento, en
qué va cada requerimiento y quién ha registrado qué trabajo.

Pensado como una base genérica de seguimiento de requerimientos/tareas por
fase para un proyecto de software — no depende de ningún cliente o dominio
de negocio en particular.

Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui, con Supabase
(Postgres + API REST + Auth) como fuente de datos y autenticación.

**Desplegado en producción:** [tablero-pi.vercel.app](https://tablero-pi.vercel.app/)

## Qué hace hoy

- **Home** (`/`): KPIs (total de requerimientos, horas ejecutadas/estimadas,
  en curso, reabiertos, con bloqueo activo), 4 bloques de estado, semáforo
  por fecha límite.
- **Detalle de requerimiento** (`/requerimiento/[item]`): link al ambiente
  de desarrollo junto al título; acordeón "Tareas por fase" — encabezado de
  cada fase con estado (chip de color junto al título), fecha límite de fase,
  conteo de tareas completadas y horas estimadas/consumidas de esa fase; cada
  tarea con estado, fechas (límite + planeadas), horas ejecutadas editables
  directamente y bloqueantes, con borde de color si está "En curso" o
  "Bloqueada". Es la única pantalla de edición de tareas/fechas — también se
  llega aquí desde el botón "Detalle" de Planeación.
- **Crear/editar requerimiento**: horas totales estimadas más un desglose
  opcional de horas estimadas por fase (no bloqueante frente al total) —
  las horas consumidas por fase se calculan solas, sumando las horas
  ejecutadas de las tareas de esa fase.
- **Planeación** (`/planeacion`): Gantt navegable (mes/semana/14 días,
  botones "< Hoy >"), semáforo por tarea, hito propio por fase (fecha
  límite de fase, independiente de las tareas). El botón "Detalle" por
  requerimiento navega al Detalle del requerimiento (arriba) para
  crear/editar/eliminar tareas y ajustar horas.
- **Login por roles**: Admin (escribe) / Viewer (solo lectura) vía Supabase
  Auth — `/login`, recuperar/restablecer contraseña. RLS exige sesión para
  leer, y solo Admin para escribir; la UI también oculta los controles de
  escritura a un Viewer (`RoleGate`), no solo la base de datos.

## Estado actual

Fases 0 (fundaciones), B (auth/roles), C (pantallas de escritura), C1 (Gantt
real) y C2 (CRUD de requerimientos y tareas) completas y verificadas en
producción. El proyecto está en ciclo de refinamiento continuo pantalla por
pantalla (fuera del roadmap de fases): Home, Detalle de requerimiento y el
modelo de horas (ejecutadas por tarea, estimadas por fase) ya refinados;
Planeación/Gantt pendiente de refinamiento visual.

**El detalle completo y siempre vigente vive en [`CLAUDE.md`](./CLAUDE.md)
— léelo antes de tocar el código.**

## Correr en local

Requiere credenciales de un proyecto Supabase — ver "Fuente de datos" en
`CLAUDE.md` y `supabase/MIGRACIONES.md`.

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Necesitas loguearte con
un usuario real (ver `scripts/create_user.mjs` para crear uno).

## Cómo entrar

Login real vía Supabase Auth en `/login` — pide tu correo/contraseña de
usuario (Admin o Viewer, tabla `profiles`). No hay signup abierto: los
usuarios se crean con `scripts/create_user.mjs` (requiere
`SUPABASE_SECRET_KEY` local, nunca en el repo).

## Cómo hacer un cambio de esquema

Todo cambio de esquema va en `supabase/migrations/` (nunca directo en el
SQL Editor de producción) y se aplica con `npm run db:push` — ver
`supabase/MIGRACIONES.md` para el detalle y los gotchas conocidos de la
CLI de este proyecto.

## Backups

Backup diario automático (GitHub Actions) + procedimiento de restauración
en `supabase/RUNBOOK_BACKUP.md`. Verificación de seguridad (RLS) con
evidencia real en `supabase/RUNBOOK_AUTH.md`.
