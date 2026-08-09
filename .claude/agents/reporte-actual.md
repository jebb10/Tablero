# Reporte actual de auditoría — dashboard-414

Este archivo se sobrescribe sección por sección, una sección fija por
agente. Nunca se crea un archivo de reporte nuevo por corrida.

## limpieza-414

_Corrida: 2026-08-09._ (corrida anterior: 2026-08-08, post-migración a
Supabase Fase A y post-Unidad 0.x — se re-audita exhaustivamente desde cero
sin asumir resoluciones previas).

### Documentación desactualizada

- **Crítico.** `README.md` (línea 20) dice "Sigue faltando: Fase 0
  (fundaciones — en curso" pero `CLAUDE.md` (línea 8) declara claramente
  "Estado actual: Fase 0 (Fundaciones) — ✅ completa (2026-08-09)". Un
  desarrollador nuevo consultando el README concluiría que Fase 0 está en
  marcha, cuando la verdad es que está terminada y el equipo está listo para
  Fase B. Induce a confusión sobre el estado actual del proyecto.

### Exports/componentes sin uso

Boilerplate de shadcn (Base UI) que ship completo con cada primitivo; se
re-confirma con Grep, no se recomienda quitar ninguno:

- **Menor.** `src/components/ui/progress.tsx` exporta `ProgressLabel` y
  `ProgressValue` sin consumidor externo confirmado con Grep (solo `Progress`
  se importa en otros archivos).
- **Menor.** `src/components/ui/select.tsx` exporta `SelectGroup`,
  `SelectLabel` y `SelectSeparator` sin consumidor externo (solo `Select`,
  `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` se usan).
- **Menor.** `src/components/ui/sheet.tsx` exporta `SheetClose`,
  `SheetFooter` y `SheetDescription` sin consumidor externo (solo `Sheet`,
  `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetTrigger` se usan).
- **Menor.** `src/components/ui/badge.tsx` exporta `badgeVariants` sin
  consumidor externo (solo usado internamente dentro de `badge.tsx`).
- **Menor.** `src/components/ui/button.tsx` exporta `buttonVariants` sin
  consumidor externo (solo usado internamente dentro de `button.tsx`).

No se encontró ningún export huérfano de código propio de la aplicación
(`src/lib/` completo con usos confirmados) ni rastro de `src/lib/excel/*` o
dependencia `xlsx` — ambos borrados correctamente en la Fase A.

### Dependencias sin uso

- **Menor.** `zod` en `dependencies` de `package.json` (línea 29) pero sin
  ningún `import` en el código fuente actual. Según `ROADMAP_V2.md`, `zod`
  fue instalado como parte de la Unidad 0.6 (andamiaje compartido) y su uso
  real pertenece a las Fases C y D (validación de esquemas en pantallas de
  escritura y otras operaciones de administración) — está preparado pero no
  consumido hoy.

### Higiene de git

Sin hallazgos. `git ls-files` no muestra `desktop.ini`, `Thumbs.db`,
`.DS_Store` ni `.env*` trackeados. La `anon`/`publishable` key en
`src/lib/supabase/server.ts` está documentada como diseñada para navegador
(RLS protege) — no se encontró ninguna `service_role`/`secret key` en
archivos trackeados.

### Observaciones sobre corridas anteriores

Los dos hallazgos Críticos de 2026-08-08 sobre `schema.sql` y
`archivo-bloqueado-banner.tsx` han mejorado su documentación:

- `CLAUDE.md` (líneas 82–84 y tabla "Archivos clave" línea 136) ahora
  claramente enuncia que `supabase/schema.sql` quedó archivado en
  `supabase/legado/schema-fase-a.sql` ("HISTÓRICO. No ejecutar"), separando
  con énfasis la fuente de verdad vigente (`supabase/migrations/` vía `npm
  run db:push`). La referencia es clara, no hay riesgo de que un desarrollador
  ejecute el histórico por error.
- Referencias a `archivo-bloqueado-banner.tsx` completamente eliminadas del
  código (`src/`); el componente renombrado a `error-datos-banner.tsx` está
  correctamente referenciado en `CLAUDE.md` (línea 95).

## buenas-practicas-414

_Corrida: 2026-08-09._ Post-Fase 0 (Fundaciones) completa según `CLAUDE.md`
línea 11 (2026-08-09). Se re-audita exhaustivamente desde cero: `CLAUDE.md`
ha actualizado la tabla "Archivos clave" (ahora incluye `requerimiento-data.ts`
y `database.types.ts`) y el roadmap (Fase 0 marcada ✅ completa), así que se
revisa si el código y la documentación mantienen consistencia.

### Separación de responsabilidades

Sin hallazgos en el código. Se revisó cada archivo vigente de `src/` contra la
tabla "Archivos clave" actualizada de `CLAUDE.md`:

- `src/lib/supabase/server.ts` solo expone `getSupabaseClient()`, sin lógica
  de negocio.
- `src/lib/dashboard-data.ts`, `src/lib/planeacion-data.ts` y
  `src/lib/requerimiento-data.ts` consultan Supabase y adaptan shapes; KPIs e
  iconos están aislados en sus módulos sin duplicación.
- `src/lib/icons.tsx` (`RequerimientoIcono`) es un componente real (JSX
  directo), cumple `react-hooks/static-components`.
- No hay rastro de `src/lib/excel/*`, `xlsx` imports, botón "Sincronizar" ni
  `fs`/`path` en componentes cliente — confirmado.
- `FASES_ORDEN` duplicado en `fases.ts` y `planeacion-data.ts` sigue siendo
  candidato de refactor, pero no es error de separación (ambos la necesitan
  para su responsabilidad real).
- El patrón "proyecto por slug" (3-4 líneas Supabase) repetido en 3 archivos
  es candidato natural del "andamiaje compartido" de Fase 0, pero ya existe en
  el código sin conflicto.

### Consistencia roadmap ↔ código

**1 Hallazgo Crítico:**

- **Crítico.** `README.md` línea 20 dice "Sigue faltando: Fase 0 (fundaciones
  — en curso, ver `CLAUDE.md`)" pero `CLAUDE.md` línea 11 declara "Estado
  actual: Fase 0 (Fundaciones) — ✅ completa (2026-08-09)". Un desarrollador
  nuevo consultando el README (entry point del repo) interpretará que Fase 0
  sigue en marcha, cuando la verdad según la fuente de verdad vigente
  (`CLAUDE.md`) es que terminó. Mismo desfase que reportó `limpieza-414` hoy
  (2026-08-09, su sección de "Documentación desactualizada").

- **Crítico adicional**: README.md línea 9 dice "Estado actual: Fase A
  (Supabase) — completa" — nomenclatura distinta a CLAUDE.md que usa "Fase 0
  (Fundaciones)" como estado actual. Genera inconsistencia en el nombre de la
  fase que podría confundir a lectores.

Sin otros hallazgos: `requerimiento-data.ts`, `database.types.ts` y el
renombramiento a `error-datos-banner.tsx` ya están correctamente documentados
en `CLAUDE.md` (líneas 139, 150, 159).

### Convenciones de Next.js/React específicas del proyecto

Sin hallazgos nuevos en el código:

- `params: Promise<{ item: string }>` con `await` en `src/app/requerimiento/[item]/page.tsx`: ✓
- `refresh()` de `next/cache` en `src/app/actions.ts`, sin `router.refresh()`: ✓
- Componentes de ícono reales (JSX directo), no funciones que retornan componentes: ✓
- Uso de `cn()` en clases condicionales booleanas: confirmado en todos los
  componentes (`requerimiento-card.tsx`, `fase-stepper.tsx`,
  `dashboard-client.tsx` línea 94-97, `kpi-strip.tsx` líneas 20-23/26-33/38-41,
  `gantt-sidebar.tsx` líneas 23-26/44-49, `gantt-timeline.tsx` línea 80,
  `planeacion-client.tsx` líneas 40/73-78).
- No hay imports de `@radix-ui/*`, se usa `@base-ui/react/*` (Base UI): ✓
- No hay uso de `next/font/google`, se usa `next/font/local` en `layout.tsx`: ✓
