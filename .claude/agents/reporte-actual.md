# Reporte actual de auditoría — dashboard-414

Este archivo se sobrescribe sección por sección, una sección fija por
agente. Nunca se crea un archivo de reporte nuevo por corrida.

## limpieza-414

_Corrida: 2026-08-12._ (corrida anterior: 2026-08-09, post-Fases 0/B/C/C1/C2/C3 completas y post-cierre técnico pre-refinamiento visual 2026-08-11 — fusión tarea/actividad, eliminación de document_versions, partición de tarea-acciones-admin en directorio con 5 archivos).

### Tokens CSS sin uso

- **Menor.** `src/app/globals.css` define 12 tokens de infraestructura boilerplate de shadcn/ui sin consumidor en archivo `.tsx` actual: 7 tokens `--sidebar-*` (sidebar, sidebar-foreground, sidebar-primary, sidebar-primary-foreground, sidebar-accent, sidebar-accent-foreground, sidebar-border, sidebar-ring) y 5 tokens `--chart-[1-5]`. Se confirma con Grep que ningún archivo .tsx los referencia. Según alcance de auditoría (regla #6), es infraestructura de diseño válida para cuando se agreguen más componentes — se reporta como Menor, no candidato a remover.

### Documentación verificada consistente

Sin hallazgos de documentación desactualizada:

- `CLAUDE.md` y `README.md` están alineados con los cambios del 2026-08-11 (fusión tarea/actividad en línea 36 de README, línea 71 de CLAUDE.md; eliminación de document_versions en línea 79 de CLAUDE.md; partición de tarea-acciones-admin en directorio con 5 archivos, línea 235 de CLAUDE.md).
- Tabla "Archivos clave" de `CLAUDE.md` (líneas 189-251) contiene 62 entradas documentadas; se verificó que todos los archivos mencionados existen y que las referencias a archivos eliminados (como `scripts/migrate_to_supabase.py`, `editar-fechas-form.tsx`, `agregarActividad()`) están documentados como eliminados con contexto histórico clara.
- El punto de control documental de 2026-08-09 que corrigió el hallazgo Crítico sobre "Fase 0 en curso vs. completa" sigue vigente — `README.md` ahora alineado.
- Nótese: Corrida anterior (2026-08-09) reportó `zod` en dependencies sin uso. Hoy se verifica que `zod` SÍ se importa y usa en `src/app/actions/tasks.ts`, `src/app/actions/activity-logs.ts`, `src/app/actions/requirements.ts` (validación de esquemas de Server Actions) — hallazgo anterior ya resuelto de facto.

### Exports/componentes sin uso (shadcn/Base UI)

Se verificó con Grep que los anteriores hallazgos Menores sobre `progress.tsx`, `select.tsx`, `sheet.tsx`, `badge.tsx`, `button.tsx` subcomponentes sin consumidor externo siguen siendo válidos (boilerplate), pero no se reportan de nuevo — se toma como decisión explícita del PO del punto de control 2026-08-09 de no tocarlos (candidatos trackeados para unidad de "andamiaje compartido" del ROADMAP_V2.md, fuera de alcance de limpieza).

### Higiene de git

Sin hallazgos: no hay `desktop.ini`, `Thumbs.db`, `.DS_Store`, `.env*` trackeados. No hay archivos de credenciales reales en archivos trackeados (verificado con `git ls-files | grep -iE '\.env|pem|key|secret|password|token|credentials|local'`). `scripts/migrate_to_supabase.py` fue eliminado correctamente en 2026-08-11 (no existe ni está trackeado).

### Dependencias en package.json

Sin hallazgos: todas las dependencias se usan en el código.

- `tw-animate-css`: importado en `src/app/globals.css` (línea 2).
- `server-only`: importado en 3 archivos (`src/lib/auth/session.ts`, `src/lib/supabase/server.ts`, `src/components/planeacion/planeacion-client.tsx`).
- `vite-tsconfig-paths`: usado en `vitest.config.mts` (línea 2, para resolver alias de TypeScript en tests).
- `@tailwindcss/postcss`: usado en `postcss.config.mjs`.

### Archivos de acciones y Server Actions

Se verificó que todos los Server Actions mencionados en tabla "Archivos clave" están siendo importados y usados correctamente:

- `src/app/actions/activity-logs.ts` (`registrarHoras()`): importado en `registrar-horas-dialog.tsx`, `agregar-tarea-dialog.tsx`.
- `src/app/actions/tasks.ts` (`guardarFechasPlaneadas()`, `crearTarea()`, `eliminarTarea()`): importado en 5 archivos (fecha-planeadas-form, estado-tarea-select, eliminar-tarea-button, editar-tarea-form, agregar-tarea-dialog).
- `src/app/actions/requirements.ts`: importado en `requerimiento-form.tsx` y 3 páginas de formulario.
- `src/app/actions/ui.ts` (`reintentar()`): importado en `error-datos-banner.tsx`.

### Observaciones finales

Proyecto en estado de higiene y documentación muy bueno post-cierre técnico 2026-08-11. No hay Críticos. El único hallazgo Menor (tokens CSS boilerplate) es infraestructura válida.

## buenas-practicas-414

_Corrida: 2026-08-12._ Post-cierre técnico pre-refinamiento visual 2026-08-11 (fusión tarea/actividad, eliminación `document_versions`, partición `tarea-acciones-admin.tsx` en 5 archivos nuevos en directorio `src/components/tarea-acciones-admin/`, nuevo hook `use-cerrar-al-exito.ts`). Se audita contra tabla "Archivos clave" y arquitectura vigentes de `CLAUDE.md`, con énfasis especial en verificar correctitud de `useActionState` en componentes nuevos/partidos (según criterio #4 de la definición del agente).

### Hallazgos críticos

**1 hallazgo Crítico:** uso incorrecto de `useActionState` con dispatch fuera de transición.

- **Crítico.** `src/components/tarea-acciones-admin/estado-tarea-select.tsx` (líneas 24-32): el componente declara `const [estadoState, estadoFormAction] = useActionState(accionEstado, ESTADO_INICIAL)` (línea 25), pero invoca `estadoFormAction(formData)` directamente dentro de `onValueChange` (línea 31), que es un event handler del componente `<Select>`, sin envolverlo en `startTransition()`. Según convención documentada en CLAUDE.md (línea 144-145 — "Server Actions con `refresh()` de `next/cache`, no `router.refresh()`") y la teoría de React 19+, cuando `useActionState` retorna un dispatch y ese dispatch se invoca desde un handler que **no es** el atributo `action` nativo de un `<form>`, debe estar envuelto explícitamente en `startTransition()` para que React sepa que está entrando en transición. Sin esto, pueden ocurrir advertencias de React o comportamiento inconsistente en el renderizado condicional del estado de `pending`. **Ruta exacta y líneas:** `src/components/tarea-acciones-admin/estado-tarea-select.tsx:24-32`.

### Revisión exhaustiva de `useActionState`

Se realizó Grep de todos los usos de `useActionState` en `src/` (10 archivos encontrados). **Solo 1 hallazgo incorrecto (el arriba mencionado)**. Los otros 9 usos son correctos:

- **Correctos (patrón estándar `<form action={formAction}>`):** `fechas-planeadas-form.tsx` (línea 28), `editar-tarea-form.tsx` (línea 37), `registrar-horas-dialog.tsx` (línea 49), `agregar-tarea-dialog.tsx` (línea 46), `fase-fecha-limite-form.tsx` (línea 25), `requerimiento-form.tsx` (línea 63), `login-form.tsx` (línea 17), `recuperar-form.tsx` (línea 46), `restablecer-form.tsx` (línea 20).
- **Nota sobre `eliminar-tarea-button.tsx`:** no usa `useActionState`; en su lugar, llama `await eliminarTarea()` manualmente en un handler asincrónico (línea 39), patrón válido de uso directo de Server Action sin `useActionState`.

**Conclusión de auditoría de `useActionState`:** `estado-tarea-select.tsx` es el único caso de patrón incorrecto en el proyecto.

### Hallazgos menores

**1 hallazgo Menor:** desviación de convención documentada en un Server Action client-side.

- **Menor.** `src/components/tarea-acciones-admin/eliminar-tarea-button.tsx` (línea 44): dentro del handler `onConfirmar()`, después de invocar `await eliminarTarea()`, llama a `router.refresh()` para actualizar la página. Según convención documentada en CLAUDE.md (línea 144-145), los Server Actions de este proyecto deben usar `refresh()` de `next/cache` en lugar de `router.refresh()`. Aunque no rompe el build/lint, se aleja del patrón documentado. Comparar con el patrón correcto usado en `src/app/actions/activity-logs.ts` (línea 47), `src/app/actions/tasks.ts` (líneas 49, 142, 168, 216, 245, 271) y `src/app/actions/ui.ts` (línea 6), que importan `refresh()` de `next/cache` en Server Actions (archivos `"use server"`). La desviación en `eliminar-tarea-button.tsx` es que `refresh()` de `next/cache` se está invocando desde un Client Component (`"use client"`, línea 1) dentro de un handler de usuario — técnicamente válido en Next.js 16.2+, pero se recomienda verificar con la documentación si `refresh()` está diseñado para ser invocado desde client-side handlers o si debe quedar encapsulado en Server Actions. **Ruta exacta:** `src/components/tarea-acciones-admin/eliminar-tarea-button.tsx:44`.

### Separación de responsabilidades

Sin hallazgos. Se verificó:

- Archivos nuevos/partidos de `tarea-acciones-admin/` están bien segregados: `index.tsx` (orquestador), `estado-tarea-select.tsx`, `fechas-planeadas-form.tsx`, `editar-tarea-form.tsx`, `eliminar-tarea-button.tsx`.
- Nuevo hook `use-cerrar-al-exito.ts` (Unidad C2.3) encapsula el patrón de cierre al éxito usado previamente de forma duplicada en 3 componentes — se importa y usa correctamente en `editar-tarea-form.tsx`, `registrar-horas-dialog.tsx`, `agregar-tarea-dialog.tsx`.
- Módulos de datos (`dashboard-data.ts`, `requerimiento-data.ts`, `planeacion-data.ts`) respetan sus responsabilidades sin cruzarse.
- `src/lib/kpis.ts` opera sobre array adaptado sin tocar Supabase directamente — ✓
- No hay rastro de código Excel/xlsx residual, `fs.readFileSync`, o `SHEET_ID` — ✓

### Consistencia roadmap ↔ código

Sin hallazgos. `CLAUDE.md` línea 11 declara "Todas las fases planificadas (0, B, C, C1, C2, C3) están completas y verificadas en producción — no hay trabajo pendiente del roadmap." Grep de palabras clave (`TODO`, `FIXME`, `WIP`, `pendiente`, `incompleto`, `HACK`, `XXX`) retorna solo coincidencias naturales (ej. estado de fase "pendiente" en tipos, "independiente" en comentarios), sin indicar trabajo incompleto documentado.

### Convenciones de Next.js/React específicas del proyecto

Sin hallazgos (excepto los mencionados arriba):

- `params: Promise<...>` con `await`: ✓
- `refresh()` de `next/cache` en Server Actions (`"use server"`): ✓ (excepto nota Menor arriba)
- `RequerimientoIcono` es componente JSX real, no función que devuelve componente: ✓
- Uso de `cn()` para clases condicionales: ✓ (confirmado en `requerimiento-card.tsx`, `dashboard-client.tsx`, y demás)
- `@base-ui/react/*` en lugar de `@radix-ui/*`: ✓
- `next/font/local` en lugar de `next/font/google`: ✓
