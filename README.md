# Dashboard 414 — Seguimiento de Requerimientos (Positiva Web)

Dashboard ejecutivo del proyecto Positiva Web 414. Next.js (App Router) +
TypeScript + Tailwind v4 + shadcn/ui, con Supabase (Postgres + API REST)
como fuente de datos.

**Demo desplegada:** [tablero-pi.vercel.app](https://tablero-pi.vercel.app/)

## Estado actual: Fase A (Supabase) y Fase 0 (Fundaciones) — completas

- Desplegado en Vercel, sin autenticación todavía (login es la Fase B
  pendiente).
- Lee de un proyecto Supabase (Postgres + API REST vía
  `@supabase/supabase-js`) — no depende de ningún Excel/Sheet/Drive, ya
  retirado por completo.
- Cubre: vista principal con KPIs, búsqueda/filtros, 4 bloques de estado y
  semáforo por fecha límite; drill-down por requerimiento con línea de
  tiempo de fases; vista `/planeacion` (Gantt); calidad de datos; exportar
  a PDF; manejo de fallos de conexión con caché del último dato bueno.
- Sigue faltando: Fase B (login + roles), Fase C (pantallas de escritura),
  Fase D (documentos versionados) — ver `CLAUDE.md` para el detalle. Fase 0
  (fundaciones) ya está completa.

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
