# Plan: Limpieza y consolidación documental de dashboard-414 (post-B.3)

**Estado: ejecutado y pusheado a `main` el 2026-08-09 (commit `b8b69c2`).**
Este archivo queda como registro histórico de lo decidido y hecho en esa
sesión. **Próximo paso real del roadmap: Unidad B.4** (flip de RLS) —
diseño completo en `ROADMAP_V2.md`, decisiones ya fijadas más abajo en este
documento para no tener que re-preguntarlas.

## Contexto

El PO acaba de terminar la Unidad B.3 (login/logout/recuperar-restablecer
contraseña con Supabase Auth) y el PR ya está mergeado a `main`. Antes de
seguir con el roadmap, pidió: (1) correr toda la auditoría de solo lectura
del proyecto, (2) revisar todos los documentos sueltos de planeación
buscando contradicciones/desactualizaciones, y (3) un cuestionario profundo
de refinamiento (se corrieron 20 preguntas en 5 rondas).

**Durante el cuestionario, el alcance de esta sesión se redefinió**: el PO
decidió explícitamente posponer la Unidad B.4 (flip de RLS) a una sesión
futura, y en cambio concentrar esta sesión en **dejar toda la documentación
consistente, mínima y bien mapeada** — su objetivo declarado es que el
dashboard se convierta en su única fuente de verdad y quiere dejar de tener
"archivos sueltos" y documentación que Claude Code tenga que leer sin
necesitarla (desperdicio de tokens en sesiones futuras). Ese fue el
verdadero entregable de esta sesión, no la ejecución de B.4.

## Hallazgos de la auditoría (equivalente a `limpieza-414` + `buenas-practicas-414`, corridos manualmente por no poder invocarse por nombre desde ese cwd)

- **Crítico** (corregido): `README.md` decía "sin autenticación todavía" — falso, todo el sitio ya exige login desde B.3.
- (Corregido) `CLAUDE.md` se contradecía internamente: "Estado actual" ya estaba al día, pero "Arquitectura" y la fila de `src/proxy.ts` en "Archivos clave" describían el comportamiento anterior a B.3.
- (Corregido) Tabla "Archivos clave" de `CLAUDE.md`: faltaban filas para los archivos nuevos de B.3.
- (Corregido) `ROADMAP_V2.md` no tenía el bloque `### ✅ Unidad B.3 completada` — agregado en `ROADMAP_HISTORIAL.md`.
- (Corregido) `supabase/MIGRACIONES.md`: el ledger no tenía la fila de la migración de B.2.
- (Corregido) `PLAN_B1.md`: eliminado, ya redundante.
- Código de B.3: sin hallazgos de arquitectura/convenciones. shadcn/ui + tokens de Claude Design en login/layout **sí cumple** la regla del PO (no es placeholder genérico, ya llegaron los tokens reales).
- Rol Admin/Viewer hoy es solo cosmético (`RoleBadge` visual) — confirmado como comportamiento esperado por el PO, no un bug.
- **Pendiente señalado por el PO, aún sin resolver**: el flujo de recuperar contraseña no ha sido probado por él manualmente todavía (aparte del límite de envíos SMTP ya documentado que impidió la verificación en vivo).

## Qué se ejecutó

1. **`README.md`** — corregido el hallazgo Crítico y reducida la duplicación: la sección de estado ahora es un párrafo corto que apunta a `CLAUDE.md` como fuente de verdad, para no volver a desactualizarse.
2. **`CLAUDE.md`** — corregidas las contradicciones internas (Arquitectura, fila de `proxy.ts`), agregadas filas de "Archivos clave" para todo lo nuevo de B.3, y actualizado el Roadmap de fases apuntando a `ROADMAP_HISTORIAL.md`.
3. **`ROADMAP_V2.md`** — separado en dos:
   - `ROADMAP_V2.md` se quedó liviano (843 líneas / ~58 KB, antes 1487 líneas / ~103 KB): cabecera de autoridad, decisiones/contradicciones aún relevantes, tabla compacta de estado por unidad, y el diseño completo solo de lo pendiente (B.4 en adelante).
   - **`ROADMAP_HISTORIAL.md` (nuevo)**: bitácoras completas de las unidades ya cerradas (Fase 0 entera, B.1, B.2, B.3 con su cierre formal recién agregado, incluyendo resultado real de `typecheck`/`lint`/`test` 41/41/`build`, todos en verde sobre el commit de esta limpieza).
4. **`supabase/MIGRACIONES.md`** — agregada la fila de `20260808233430_fase_b_profiles.sql` al ledger.
5. **Eliminado `PLAN_B1.md`** (aprobado explícitamente por el PO).
6. **No se tocó**: `PLAN_UNIDAD_B3.md`, `AGENTS.md`, `design/*.dc.html`, `supabase/RUNBOOK_BACKUP.md`.

Commit único `b8b69c2`, pusheado directo a `main` (sin PR, autorizado explícitamente por el PO para este alcance 100% documental — no aplica a B.4).

## Decisiones de la Unidad B.4 (diseño ya discutido con el PO — no volver a preguntar)

- Alcance de tablas: **solo `requirements`, `requirement_tasks`, `projects`** (no `activity_logs`/`document_versions`, que siguen vacías/forward-looking para Fase C/D).
- Diferenciación por rol: el PO quiere que las policies **ya distingan Admin de Viewer** a nivel de RLS desde B.4, no solo autenticado-vs-anónimo.
- Verificación: **probar contra la base de datos real vía Session Pooler local antes de mergear** — no verificar directo en producción tras el flip.
- Rollback: el PO quiere el **script de reversión (volver a policy pública) ya preparado de antemano**, no solo un plan de diagnóstico.
- B.5 (RoleGate) queda pospuesta también, después de B.4.
- Git: a partir de B.4 se retoma el flujo normal de la Fase B (rama + PR), salvo que el PO diga lo contrario en su momento — la excepción de "push directo sin PR" fue solo para esta limpieza documental.

## Explícitamente fuera de alcance de esta sesión (siguen pendientes)

- Unidad B.4 (flip de RLS) y B.5 (RoleGate).
- Configurar SMTP propio y la redirect URL de producción en Supabase.
- Probar en vivo el flujo de recuperar contraseña.
- Refinamiento del Gantt (`/planeacion`) — el PO lo marcó como prioridad *después* de esta limpieza.
- Escribir el resultado de la auditoría en `reporte-actual.md`/`historico-auditorias.md` — el PO confirmó que no hacía falta esta vez.
