# Dashboard 414 — Seguimiento de Requerimientos (Positiva Web)

Dashboard ejecutivo del proyecto Positiva Web 414. Next.js (App Router) +
TypeScript + Tailwind v4 + shadcn/ui, sin base de datos, lee un Google Sheet
(export xlsx) como única fuente de verdad.

**Demo desplegada:** [tablero-pi.vercel.app](https://tablero-pi.vercel.app/)

## Estado actual: Fase 3a (Drive como fuente de datos) — completa

- Desplegado en Vercel, sin autenticación todavía (login es la Fase 3
  pendiente).
- Lee un Google Sheet público (export xlsx) vía fetch en cada carga —
  ya no depende de un archivo local.
- Cubre: vista principal con KPIs, búsqueda/filtros y 4 bloques de estado;
  drill-down por requerimiento con línea de tiempo de fases; calidad de
  datos; exportar a PDF; manejo de fallos de conexión con caché del último
  dato bueno.
- Sigue faltando: login (Fase 3), datos del Gantt (Fase 4), validar a
  escala (Fase 5).

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
