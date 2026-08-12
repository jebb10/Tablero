# Dashboard 414 — Seguimiento de Requerimientos (Positiva Web)

## Objetivo

Herramienta de uso diario para el seguimiento del proyecto de software real
"Positiva Web 414": para cada uno de los 28 requerimientos, muestra en qué
estado va, cuántas horas se han consumido frente a lo estimado, y el detalle
de sus tareas por fase (Requerimientos → Diseño → Desarrollo → QA →
Producción). No es un reporte estático ni un ejercicio de aprendizaje — es
la única fuente de verdad del PO para saber, en cualquier momento, en qué va
cada requerimiento y quién ha registrado qué trabajo.

Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui, con Supabase
(Postgres + API REST + Auth) como fuente de datos y autenticación.

**Desplegado en producción:** [tablero-pi.vercel.app](https://tablero-pi.vercel.app/)

## Qué hace hoy

- **Home** (`/`): KPIs (total de requerimientos, horas ejecutadas/estimadas,
  en curso, reabiertos, con bloqueo activo), 4 bloques de estado, semáforo
  por fecha límite.
- **Detalle de requerimiento** (`/requerimiento/[item]`): link al ambiente
  de desarrollo junto al título; acordeón "Tareas por fase" — encabezado de
  cada fase con estado, fecha límite, conteo de tareas y horas
  estimadas/consumidas de esa fase; cada tarea con estado, fechas (límite +
  planeadas), horas consumidas y bloqueantes, con borde naranja
  institucional si está "En curso" o rojo si está "Bloqueada"; botón
  "Añadir tarea" y "Registrar horas" por fase (Admin); bloque aparte para
  el historial de actividad anterior a la fusión tarea/actividad. Es la
  única pantalla de edición de tareas/fechas — también se llega aquí desde
  el botón "Detalle" de Planeación.
- **Planeación** (`/planeacion`): Gantt navegable (mes/semana/14 días,
  botones "< Hoy >"), semáforo por tarea, hito propio por fase (fecha
  límite de fase, independiente de las tareas). El botón "Detalle" por
  requerimiento navega al Detalle del requerimiento (arriba) para
  crear/editar/eliminar tareas y registrar horas.
- **Login por roles**: Admin (escribe) / Viewer (solo lectura) vía Supabase
  Auth — `/login`, recuperar/restablecer contraseña. RLS exige sesión para
  leer, y solo Admin para escribir; la UI también oculta los controles de
  escritura a un Viewer (`RoleGate`), no solo la base de datos.

## Estado actual

Fases 0 (fundaciones), B (auth/roles), C (pantallas de escritura), C1 (Gantt real), C2 (CRUD de
requerimientos y tareas, completa) y C3 (bitácora de horas) **completas y verificadas en
producción**. No hay trabajo pendiente del roadmap — el proyecto está en ciclo de refinamiento
visual pantalla por pantalla: Home (2026-08-11) y Detalle de requerimiento (2026-08-12) ya
refinadas; Planeación/Gantt pendiente.

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
