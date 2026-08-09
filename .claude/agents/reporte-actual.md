# Reporte actual de auditoría — dashboard-414

Este archivo se sobrescribe sección por sección, una sección fija por
agente. Nunca se crea un archivo de reporte nuevo por corrida.

## limpieza-414

_Corrida: 2026-08-08._ (corrida anterior: 2026-08-01, antes de la migración
a Supabase de la Fase A — findings de esa fecha reemplazados en su mayoría
por lo de abajo, el código cambió sustancialmente).

### Documentación desactualizada

- **Crítico.** `README.md` completo describe el estado **anterior a la
  Fase A**: dice "sin base de datos, lee un Google Sheet (export xlsx) como
  única fuente de verdad", "Estado actual: Fase 3a (Drive como fuente de
  datos)" y "Sigue faltando: login (Fase 3), datos del Gantt (Fase 4)". Nada
  de esto es cierto hoy — la fuente de datos es Supabase/Postgres desde el
  2026-08-06, el Gantt (`/planeacion`) ya existe, y el roadmap vigente es
  `ROADMAP_V2.md` (Fase 0/B/C/D), no las viejas Fases 3/4/5. `README.md` es
  la puerta de entrada del repo (`CLAUDE.md` mismo le dice al lector "empieza
  ahí" solo para la sección de documentación, pero el resto del README
  contradice a `CLAUDE.md`) — un desarrollador nuevo que solo lea el README
  concluiría que debe buscar/configurar un Google Sheet, cuando en realidad
  necesita credenciales de Supabase. Induce a un error real de setup.
- **Crítico.** `CLAUDE.md` (líneas 77 y 133) referencia `supabase/schema.sql`
  como "el DDL completo... correr una sola vez en el SQL Editor de
  Supabase". Ese archivo ya no existe en esa ruta: confirmado con `git
  ls-files` y con `supabase/MIGRACIONES.md`, que documenta que se movió a
  `supabase/legado/schema-fase-a.sql` con un encabezado explícito
  "HISTÓRICO. No ejecutar" — la fuente de verdad vigente es
  `supabase/migrations/20260101000000_baseline_fase_a.sql` vía
  `npm run db:push`. Un desarrollador nuevo que siga la instrucción literal
  de `CLAUDE.md` no encontraría el archivo, o peor, encontraría el histórico
  en `legado/` y podría ejecutarlo contra una base que ya tiene ese esquema
  aplicado — exactamente el error de setup que `MIGRACIONES.md` previene con
  su advertencia.
- **Menor.** `CLAUDE.md` referencia tres veces (líneas 92, 150, 153) el
  componente `archivo-bloqueado-banner.tsx` / `<ArchivoBloqueadoBanner
  soloBanner />`. Ese archivo/componente fue renombrado: hoy es
  `src/components/error-datos-banner.tsx` / `ErrorDatosBanner` (confirmado
  con Grep — cero referencias a "ArchivoBloqueadoBanner" en `src/`, y
  `error-datos-banner.tsx` sí se usa en `page.tsx`, `dashboard-client.tsx`,
  `requerimiento/[item]/page.tsx` y `planeacion/page.tsx`). Un desarrollador
  que busque el nombre viejo no lo va a encontrar.
- **Menor.** La fila de `src/app/requerimiento/[item]/page.tsx` en "Archivos
  clave" dice que esa página "Consulta `requirements`+`requirement_tasks` en
  Supabase por `slug`; envuelto en try/catch propio". Ya no es así: la
  consulta se extrajo a `src/lib/requerimiento-data.ts`
  (`getRequerimientoDetalle()`, con su propio try/catch) — confirmado
  leyendo ambos archivos. `page.tsx` hoy solo llama a esa función y revisa
  `error`/`requerimiento`. `requerimiento-data.ts` no aparece en la tabla de
  "Archivos clave" en absoluto.
- **Menor.** "Roadmap de fases" describe la Fase 0 como "pendiente,
  bloqueante para B/C/D" sin matiz. Pero `ROADMAP_V2.md` y
  `supabase/MIGRACIONES.md` (ambos fechados 2026-08-07) documentan la
  Unidad 0.0 (verificación de la BD real) y la Unidad 0.1 (Supabase CLI +
  migraciones versionadas) como ✅ completadas, y en disco ya existen
  `vitest.config.mts` + `src/lib/*.test.ts` + `.github/workflows/ci.yml`
  (tests/CI, probablemente Unidad 0.3) y `src/app/error.tsx` /
  `global-error.tsx` / `loading.tsx` / `not-found.tsx` (robustez del
  app-shell) — ninguno de estos archivos nuevos aparece en la tabla
  "Archivos clave" de `CLAUDE.md`. No es tan grave como los dos Críticos de
  arriba porque no induce una acción incorrecta, pero "Estado actual" ya no
  reproduce fielmente lo que hay en disco.
- **Menor.** `CLAUDE.md` referencia al final
  `.claude/plans/c-users-usuario-1-documents-tablero-req-lively-russell.md`
  como plan histórico de las Fases 0 a 3a. Confirmado con Glob: ese archivo
  ya no existe en `~/.claude/plans/`. Solo afecta a quien busque contexto
  histórico detallado de esas fases ya ejecutadas, no a la operación del
  código actual.

### Exports/componentes sin uso

Mismo patrón que la corrida anterior — boilerplate de shadcn (Base UI) que
ship completo con cada primitivo; se re-confirma con Grep uno por uno, no se
recomienda quitar ninguno:

- **Menor.** `src/components/ui/progress.tsx`: `ProgressLabel` y
  `ProgressValue` sin ningún import fuera del archivo (solo `Progress` se
  usa, en `requerimiento-card.tsx`).
- **Menor.** `src/components/ui/select.tsx`: `SelectGroup`, `SelectLabel` y
  `SelectSeparator` sin uso externo (`dashboard-client.tsx` solo importa
  `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`).
- **Menor.** `src/components/ui/badge.tsx` (`badgeVariants`) y
  `src/components/ui/button.tsx` (`buttonVariants`) sin consumidor externo
  del export en sí (se usan internamente para clases).
- **Menor (nuevo, no estaba en la corrida anterior — `sheet.tsx` es un
  componente nuevo de la Fase A para el drawer mobile de `/planeacion`).**
  `src/components/ui/sheet.tsx` exporta `SheetClose`, `SheetFooter` y
  `SheetDescription`; confirmado con Grep que `planeacion-client.tsx` (único
  consumidor de `sheet.tsx`) solo importa `Sheet`, `SheetContent`,
  `SheetHeader`, `SheetTitle` y `SheetTrigger`.

No se encontró ningún export huérfano de código propio de la aplicación:
`src/lib/` completo (`dashboard-data.ts`, `fases.ts`, `icons.tsx`,
`kpis.ts`, `planeacion-data.ts`, `project.ts`, `requerimiento-data.ts`,
`semaforo.ts`, `types.ts`, `utils.ts`, `supabase/server.ts`,
`supabase/database.types.ts`) y todos los `.tsx` fuera de `ui/` tienen al
menos un import real confirmado con Grep. `src/lib/excel/*` y la dependencia
`xlsx` ya no existen (borrados en la Fase A, tal como documenta `CLAUDE.md`
correctamente).

### Higiene de git

Sin hallazgos. `git ls-files` no muestra `desktop.ini`, `Thumbs.db`,
`.DS_Store` ni ningún `.env*` trackeado. La `anon`/`publishable` key
hardcodeada en `src/lib/supabase/server.ts` (línea 15) no cuenta como
secreto expuesto: está documentada explícitamente en `CLAUDE.md` como
diseñada para viajar al navegador, protegida por RLS — no se encontró
ninguna `service_role`/`secret key` en ningún archivo trackeado.

### package.json

Sin hallazgos nuevos — el hallazgo Menor de la corrida anterior
(`tw-animate-css`/`shadcn` en `dependencies`) ya está resuelto: ambos
paquetes están hoy en `devDependencies` (líneas 37 y 40), donde corresponde
por consumirse solo vía `@import` de CSS. Se confirmó con Grep el resto de
paquetes:

- `dependencies`: `@base-ui/react`, `@supabase/supabase-js`,
  `class-variance-authority`, `clsx`, `lucide-react`, `next`, `react`,
  `react-dom`, `tailwind-merge` — todos importados como módulo JS/TS en
  tiempo de ejecución, correctamente ubicados.
- `devDependencies`: `@tailwindcss/postcss`, `@types/*`, `eslint*`,
  `shadcn`, `supabase` (la CLI, solo usada en los scripts `db:*` de
  `package.json`, nunca importada en código de la app), `tailwindcss`,
  `tw-animate-css`, `typescript`, `vite-tsconfig-paths` (usado en
  `vitest.config.mts`), `vitest` — todos herramientas de build/test/dev,
  correctamente ubicados.

## buenas-practicas-414

_Corrida: 2026-08-08._ Post-migración a Supabase (Fase A, completa
2026-08-06) y post-"Unidad 0.x" (CLI de Supabase, tipos generados,
Vitest+CI, robustez del app-shell, extracción de
`src/lib/requerimiento-data.ts`, 2026-08-07). El código cambió de fondo
respecto a la corrida anterior (era-Excel); se re-auditó desde cero contra
la versión actual de `CLAUDE.md`.

### Separación de responsabilidades

Sin hallazgos de lógica mal ubicada. Se revisó cada archivo vigente de
`src/` contra su fila en la tabla "Archivos clave" de `CLAUDE.md`:

- `src/lib/supabase/server.ts` solo expone `getSupabaseClient()`, sin lógica
  de negocio.
- `src/lib/dashboard-data.ts`, `src/lib/planeacion-data.ts` y
  `src/lib/requerimiento-data.ts` consultan Supabase y adaptan el shape,
  tal como describe (o debería describir, ver abajo) `CLAUDE.md`; el
  cálculo de KPIs sigue aislado en `src/lib/kpis.ts` y el semáforo en
  `src/lib/semaforo.ts`, sin duplicarse dentro de los componentes de
  presentación.
- `src/lib/icons.tsx` (`RequerimientoIcono`) sigue siendo un componente
  real que retorna JSX directamente, no una función que devuelve un
  componente — cumple `react-hooks/static-components`.
- `src/components/data-quality-panel.tsx` / `getCalidadDatos` en `kpis.ts`
  siguen evaluando solo los requerimientos con `tieneDetalle`, confirmado.
- **Menor.** `FASES_ORDEN` (el array de 5 fases con `numero`/`nombre`) está
  definido de forma idéntica tanto en `src/lib/fases.ts` (líneas 4-10) como
  en `src/lib/planeacion-data.ts` (líneas 27-33). No es lógica mal ubicada
  (ambos archivos la necesitan para su propia responsabilidad), pero es una
  duplicación literal que un cambio futuro en el orden de fases podría
  desincronizar.
- **Menor.** El patrón "obtener `projects.id` por `slug`" (mismo bloque de
  3-4 líneas contra Supabase) se repite casi idéntico en
  `dashboard-data.ts`, `planeacion-data.ts` y `requerimiento-data.ts`. No
  contradice ninguna responsabilidad documentada hoy, pero es candidato
  natural al "andamiaje compartido" que `ROADMAP_V2.md` ya prevé para la
  Fase 0.

### Consistencia roadmap ↔ código

- **Menor.** La tabla "Archivos clave" de `CLAUDE.md` no incluye
  `src/lib/requerimiento-data.ts` (`getRequerimientoDetalle()`, único punto
  de entrada del drill-down, extraído el 2026-08-07 según el contexto de
  esta corrida) ni `src/lib/supabase/database.types.ts` (tipos generados
  vía el script `types:db` en `package.json`). Ambos archivos existen y se
  usan en producción (`requerimiento-data.ts` es importado por
  `src/app/requerimiento/[item]/page.tsx`; `database.types.ts` es importado
  por los tres módulos de `src/lib/*-data.ts`), pero no aparecen descritos.
- **Menor.** `CLAUDE.md` marca toda la "Fase 0 — Fundaciones" como
  "pendiente, bloqueante para B/C/D" sin matizar que varias piezas ya están
  en el código: tipos generados (`database.types.ts` + script `types:db`),
  tests con Vitest (`src/lib/fases.test.ts`, `kpis.test.ts`,
  `semaforo.test.ts`, confirmados con Glob) y scripts de migraciones vía
  Supabase CLI (`db:new`, `db:push`, `db:list`, `db:dump` en
  `package.json`). No se encontró carpeta `.github/workflows/` en el repo,
  así que el "CI" de la Unidad 0.x no está confirmable desde el código
  (podría vivir en la integración nativa Supabase↔GitHub u otro lado fuera
  de este árbol) — se señala solo el desfase de la sección "Fase 0", no la
  ausencia de CI en sí (fuera de alcance).
- **Menor.** La tabla "Archivos clave" describe
  `src/components/archivo-bloqueado-banner.tsx` / componente
  `ArchivoBloqueadoBanner`, pero ese archivo ya no existe con ese nombre:
  hoy es `src/components/error-datos-banner.tsx` / `ErrorDatosBanner`. El
  comportamiento descrito (banner + botón "Reintentar" que solo llama
  `reintentar()` → `refresh()`, usado standalone o embebido) sigue siendo
  exacto — solo cambió el nombre del archivo/componente sin actualizar la
  tabla.
- Sin hallazgos en el resto: no queda ningún rastro de `src/lib/excel/*` ni
  de la dependencia `xlsx` en `src/` (confirmado, coincide con "se
  borraron" en `CLAUDE.md`); no hay botón "Sincronizar" en
  `dashboard-client.tsx` (confirmado, coincide con RN-05 superada); el
  banner de error sigue existiendo con el único botón "Reintentar" que
  describe la Fuente de datos.

### Convenciones de Next.js/React específicas del proyecto

Sin hallazgos nuevos — el único hallazgo de la corrida anterior
(`kpi-strip.tsx` armando clases condicionales con template literals/
ternarios en vez de `cn()`) ya no aplica: el archivo actual usa `cn()` de
`src/lib/utils.ts` en los tres puntos condicionales (líneas 20-23, 26-33,
38-41).

- `params` como `Promise<{ item: string }>` con `await params`: confirmado
  en la única página dinámica (`src/app/requerimiento/[item]/page.tsx`).
- Server Actions con `refresh()` de `next/cache` (no `router.refresh()`):
  confirmado en `src/app/actions.ts`; sin ninguna referencia a
  `router.refresh()` en todo `src/` (grep).
- Componentes de ícono como componente real (no función que retorna un
  componente): confirmado en `RequerimientoIcono` (`src/lib/icons.tsx`) y en
  el patrón `icono={Clock}` + `<Icono />` de `kpi-strip.tsx`.
- Uso de `cn()` en vez de concatenación manual: confirmado en todos los
  componentes con clases condicionales reales (`requerimiento-card.tsx`,
  `fase-stepper.tsx`, `dashboard-client.tsx`, `kpi-strip.tsx`,
  `gantt-sidebar.tsx`, `gantt-timeline.tsx`, `planeacion-client.tsx`, todo
  `components/ui/*`). Único uso de template literal para clases es en
  `dashboard-client.tsx` (línea 151, `` `h-2.5 w-2.5 rounded-full ${dot}` ``)
  y `pdf-report.tsx` (`` `${td} font-bold` ``), pero en ambos casos es una
  sustitución de variable sin condicional booleana — no es el caso que la
  convención de `cn()` busca cubrir, no se marca como hallazgo.
- `components/ui/*.tsx` sigue usando `@base-ui/react/*`, no
  `@radix-ui/react-*` (confirmado con grep), consistente con la variante
  Base UI documentada.
