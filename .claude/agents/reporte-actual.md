# Reporte actual de auditoría — dashboard-414

Este archivo se sobrescribe sección por sección, una sección fija por
agente. Nunca se crea un archivo de reporte nuevo por corrida.

## limpieza-414

_Corrida: 2026-08-01._

### Exports/componentes sin uso

- **Menor.** `src/components/ui/progress.tsx` exporta `ProgressLabel` y
  `ProgressValue` (líneas 63-91). Confirmado con Grep: ningún archivo de
  `src/` los importa; solo `Progress` se usa (en
  `src/components/requerimiento-card.tsx`). Igual que los tokens de
  sidebar/chart, es boilerplate de shadcn (Base UI) que ship completo con el
  componente — no se recomienda quitarlo, queda como superficie de librería
  disponible para cuando se necesite mostrar label/valor de un progreso en
  otro lugar.
- **Menor.** `src/components/ui/select.tsx` exporta `SelectGroup`,
  `SelectLabel` y `SelectSeparator` (líneas 11-19, 98-109, 139-150).
  Confirmado con Grep: no se importan en ningún otro archivo; el proyecto
  solo usa `Select`, `SelectContent`, `SelectItem`, `SelectTrigger` y
  `SelectValue` (en `dashboard-client.tsx`). Mismo caso: boilerplate del
  primitivo de shadcn/Base UI, no un archivo huérfano propio del proyecto.
- **Menor.** `src/components/ui/badge.tsx` exporta `badgeVariants` y
  `src/components/ui/button.tsx` exporta `buttonVariants` — ninguno de los
  dos se importa fuera de su propio archivo (se usan internamente para
  aplicar clases, pero el `export` en sí no tiene consumidor externo). Mismo
  patrón shadcn: se deja como está, es la convención estándar de la librería
  para permitir componer variantes en otro componente a futuro.

No se encontró ningún export/función "huérfana" de código propio de la
aplicación (todo lo de `src/lib/` y `src/components/*.tsx` fuera de
`ui/` tiene al menos un import real, verificado con Grep uno por uno:
`getKPIs`, `getCalidadDatos`, `getRequerimientos`, `getDetalle`,
`loadWorkbook`, `sheetRows`, `toNumber`, `toText`, `toDate`,
`parseEtiquetaValor`, `slugify`, `cn`, `sincronizar`, `RequerimientoIcono`,
tipos de `types.ts`, etc.).

### Documentación desactualizada

Sin hallazgos. `CLAUDE.md` describe correctamente el estado actual del
código: el `SHEET_ID` hardcodeado en `workbook.ts` (sin variable de entorno
`DASHBOARD_SHEET_ID` — confirmado que no queda ninguna referencia a
`process.env` en `src/`), el flujo de `getDashboardData()` con caché en
memoria y manejo de fallos de red, y el alcance recortado de RN-03 (el
texto de `Notas` no se muestra en ningún componente, verificado). El plan
detallado referenciado al final de `CLAUDE.md`
(`.claude/plans/c-users-usuario-1-documents-tablero-req-lively-russell.md`)
existe. No quedan `.md` de planes/fases sueltos en la raíz del proyecto
fuera de `CLAUDE.md`/`README.md`/`AGENTS.md` — el punto de control MVP y la
Fase 3a ya documentan haberlos limpiado, y se confirmó que no reaparecieron.

### Higiene de git

Sin hallazgos. `git ls-files` no muestra `desktop.ini`, `Thumbs.db`,
`.DS_Store` ni archivos `*.log` trackeados — todos coinciden con patrones ya
presentes en `.gitignore` y efectivamente no están en el índice. Los
archivos sueltos que sí existen en disco (`desktop.ini`, `dev-err.log`,
`dev-out.log`, `tsconfig.tsbuildinfo`, `next-env.d.ts`) están todos
cubiertos por `.gitignore` y confirmados como no trackeados. No se detectó
ningún valor que aparente ser un secreto/credencial en archivos trackeados.

### package.json

- **Menor.** `tw-animate-css` (línea 21) y `shadcn` (línea 19) están en
  `dependencies`, pero ambos se consumen únicamente vía `@import` en
  `src/app/globals.css` (`@import "tw-animate-css";` y
  `@import "shadcn/tailwind.css";`) — confirmado con Grep que ningún archivo
  `.ts`/`.tsx` los importa como módulo JS. Es CSS que se resuelve en tiempo
  de build de Tailwind, igual que `tailwindcss` y `@tailwindcss/postcss`,
  que sí están correctamente en `devDependencies`. Por consistencia con esa
  misma convención ya aplicada en el propio archivo, ambos paquetes
  encajarían mejor en `devDependencies`. No es una desviación crítica
  (Next.js/Vercel instala ambas secciones en build), solo una inconsistencia
  de forma.
- El resto de dependencias está bien ubicado: `@base-ui/react`,
  `class-variance-authority`, `clsx`, `lucide-react`, `tailwind-merge` y
  `xlsx` se importan como módulos JS/TS en tiempo de ejecución (confirmado
  con Grep), correctamente en `dependencies`.

## buenas-practicas-414

_Corrida: 2026-08-01._

### Separación de responsabilidades

Sin hallazgos. Se revisó cada archivo de la tabla "Archivos clave" de
`CLAUDE.md` contra su responsabilidad documentada:

- `src/lib/excel/workbook.ts` solo contiene `loadWorkbook()` (fetch +
  `XLSX.read`) y helpers genéricos de parseo (`sheetRows`, `toNumber`,
  `toText`, `toDate`, `parseEtiquetaValor`, `slugify`) — cero lógica de
  negocio, confirmado.
- `src/lib/excel/dashboard-sheet.ts` concentra correctamente
  `ESTADO_HEURISTICO` y `getRequerimientos(wb)`, con `wb` requerido sin
  default (no puede hacer `await` en un default param, tal como documenta
  `CLAUDE.md`).
- `src/lib/excel/detalle-sheet.ts` sigue el mismo patrón de `wb` requerido.
- `src/lib/kpis.ts` (`getKPIs`, `getCalidadDatos`) opera puramente sobre
  `Requerimiento[]` ya parseado, sin tocar el Excel ni el workbook.
- `src/lib/dashboard-data.ts` es el único punto de entrada usado por
  `src/app/page.tsx`, con try/catch + caché in-memory, tal como se describe.
- `src/lib/icons.tsx` expone `RequerimientoIcono` como componente real (no
  una función que retorna un componente), cumpliendo
  `react-hooks/static-components`.
- `src/components/data-quality-panel.tsx` / `kpis.ts` → `getCalidadDatos`
  filtra por `tieneDetalle`, evaluando solo los 7 requerimientos con hoja de
  detalle real, nunca los 21 heurísticos — confirmado.

### Consistencia roadmap ↔ código

Sin hallazgos. Lo que "Estado actual"/Fase 3a de `CLAUDE.md` declara
coincide con el código:

- `workbook.ts` ya no lee xlsx local (`fs.readFileSync`/`XLSX.readFile`
  ausentes en todo `src/`, confirmado con grep) — descarga vía `fetch` al
  export público de Google Drive con el `SHEET_ID` hardcodeado (línea 3),
  `revalidate: 30` y timeout de 10s vía `AbortController`, un solo intento.
- `types.ts` no tiene el campo `estadoFuente` (eliminado según el punto de
  control MVP) — confirmado.
- `src/app/actions.ts` usa `refresh()` de `next/cache` (no
  `router.refresh()`, ausente en todo `src/`, confirmado con grep).
- `src/app/requerimiento/[item]/page.tsx` usa `params: Promise<{ item:
  string }>` con `await params`, y envuelve la carga del workbook en su
  propio try/catch → `<ArchivoBloqueadoBanner soloBanner />`, igual que
  `page.tsx` — el mecanismo de resiliencia unificado que describe el punto
  de control MVP sí está en el código.

### Convenciones de Next.js/React específicas del proyecto

- **Menor.** `src/components/kpi-strip.tsx` (función interna `Kpi`, líneas
  17-43) arma clases condicionales con template literals y ternarios
  anidados en tres puntos (`acento === "atencion" ? ... : ""` en la línea
  19-21, `acento === "atencion" ? ... : acento ? ... : "text-primary"` en la
  20-30, y de nuevo en la 35-37) en vez de usar `cn()` de
  `src/lib/utils.ts`. Es exactamente el caso que `cn()` existe para resolver
  — el resto de componentes con lógica condicional real
  (`requerimiento-card.tsx`, `fase-stepper.tsx`, `dashboard-client.tsx`,
  todo `components/ui/*`) sí usan `cn()` para esto mismo. No rompe nada hoy
  (Tailwind v4 no tiene el problema de purga de v3 con template literals
  simples), pero es la única inconsistencia real de esta convención
  documentada en `CLAUDE.md`.

Resto de convenciones revisadas sin hallazgos: `params` como
`Promise<...>` con `await` (única página dinámica del proyecto, ya cubierta
arriba), Server Actions con `refresh()`, patrón `fetch` + `XLSX.read` en
`workbook.ts`, componentes de ícono como componente real, y
`components/ui/*.tsx` usando `@base-ui/react/*` (no `@radix-ui/react-*`),
consistente con la variante Base UI documentada.
