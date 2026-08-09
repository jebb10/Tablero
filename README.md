# Dashboard 414 — Seguimiento de Requerimientos (Positiva Web)

Dashboard ejecutivo del proyecto Positiva Web 414. Next.js (App Router) +
TypeScript + Tailwind v4 + shadcn/ui, con Supabase (Postgres + API REST)
como fuente de datos.

**Demo desplegada:** [tablero-pi.vercel.app](https://tablero-pi.vercel.app/)

## Estado actual

Login con Supabase Auth y roles Admin/Viewer ya funcionan (Fase B en
curso); RLS de datos sigue en lectura pública hasta el siguiente paso del
roadmap. **El estado detallado y siempre vigente vive en
[`CLAUDE.md`](./CLAUDE.md) — no se duplica aquí para evitar que este
resumen se desactualice.**

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

Abre [http://localhost:3000](http://localhost:3000).
