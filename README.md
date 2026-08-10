# Dashboard 414 — Seguimiento de Requerimientos (Positiva Web)

Dashboard ejecutivo del proyecto Positiva Web 414. Next.js (App Router) +
TypeScript + Tailwind v4 + shadcn/ui, con Supabase (Postgres + API REST)
como fuente de datos.

**Demo desplegada:** [tablero-pi.vercel.app](https://tablero-pi.vercel.app/)

## Estado actual

**Fase B (Supabase Auth + roles Admin/Viewer) completa**: login real, RLS
exige sesión para leer y solo Admin puede escribir, la UI oculta
controles de escritura a los Viewers (`RoleGate`), y la seguridad quedó
verificada con evidencia real contra producción (`supabase/RUNBOOK_AUTH.md`).
**Fase C (pantallas de escritura) completa**: implementada, mergeada a
`main` (PR #9) y verificada en vivo en producción, aprobada por el PO.
**El estado detallado y
siempre vigente vive en [`CLAUDE.md`](./CLAUDE.md) — no se duplica aquí
para evitar que este resumen se desactualice.**

**Toda la documentación real del proyecto vive en [`CLAUDE.md`](./CLAUDE.md)**:
arquitectura, fuente de datos, reglas de negocio, estado actual y roadmap
de fases (`ROADMAP_V2.md`). Empieza ahí.

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
`supabase/MIGRACIONES.md` para el detalle y los dos gotchas de la CLI de
este proyecto.

## Backups

Backup diario automático (GitHub Actions) + procedimiento de restauración
en `supabase/RUNBOOK_BACKUP.md`. Verificación de seguridad (RLS) con
evidencia real en `supabase/RUNBOOK_AUTH.md`.
