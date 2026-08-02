# Dashboard 414 — Seguimiento de Requerimientos (Positiva Web)

Dashboard ejecutivo del proyecto Positiva Web 414. Next.js (App Router) +
TypeScript + Tailwind v4 + shadcn/ui, sin base de datos, lee un Google Sheet
(export xlsx) como única fuente de verdad.

**Toda la documentación real del proyecto vive en [`CLAUDE.md`](./CLAUDE.md)**:
arquitectura, reglas de negocio, estado actual y roadmap de fases. Empieza
ahí.

## Correr en local

Requiere internet (la fuente de datos es Google Drive, no hay modo offline).

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

- `DASHBOARD_SHEET_ID`: ID del Google Sheet que sirve como fuente de datos
  (ver CLAUDE.md, sección "Fuente de datos"). Requerido tanto en desarrollo
  local (`.env.local`) como en producción (Vercel → Project Settings →
  Environment Variables).
