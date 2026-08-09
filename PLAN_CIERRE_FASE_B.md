# Plan: Cerrar Fase B (Unidades B.5 + B.6) — Tablero 414 / dashboard-414

> Próximo paso al retomar: si este documento sigue existiendo, Fase B todavía no está cerrada —
> seguir la lista de esta sección más los checklists de B.5/B.6 abajo. Cuando ambas unidades queden
> mergeadas y verificadas, borrar este archivo (su contenido de cierre pasa a `ROADMAP_HISTORIAL.md`)
> y seguir con Fase C (`ROADMAP_V2.md`).

## Contexto

Fase B (autenticación/roles con Supabase Auth) tiene B.1–B.4 cerradas y mergeadas a `main`
(confirmado por `git log`, no solo por memoria). El PO no puede pasar a Fase C (pantallas de
escritura, que es donde por fin va a *sentir* avance visible en la herramienta — ver
`feedback_reportar_progreso_tablero_414`) hasta que Fase B quede completamente cerrada. Faltan
exactamente dos unidades, ninguna con trabajo iniciado (0 commits, 0 ramas, 0 archivos):

- **B.5** — `<RoleGate>`: el mecanismo (todavía no construido) con el que Fase C ocultará
  controles de escritura a los Viewers. Definición completa en `ROADMAP_V2.md` líneas 193–215.
- **B.6** — Verificación de seguridad con evidencia real (no por inspección visual) de que RLS
  bloquea a un Viewer, + cierre de documentación de toda la Fase B. Definición completa en
  `ROADMAP_V2.md` líneas 218–252.

Este documento es autocontenido: puede ejecutarlo una sesión futura sin el contexto de esta
conversación (patrón de este proyecto, ver `feedback_plan_handoff_tablero_414`).

## Decisiones tomadas con el PO en esta sesión (no volver a preguntar)

1. **Una sola rama y un solo PR** para B.5+B.6 (no dos PRs separados como en B.1–B.4) — se sienten
   como un solo "cerrar Fase B". Nombre de rama sugerido: `fase-b/b5-b6-cierre-fase-b` (mismo patrón
   que `fase-b/b4-rls-authenticated`).
2. **El checklist de B.6 corre contra producción real** (`https://tablero-pi.vercel.app` + Supabase
   prod), no contra el pooler local — es la evidencia que realmente cuenta.
3. **Credenciales de prueba del checklist: las cuentas reales existentes** del PO (Admin real +
   un Viewer real), no usuarios desechables nuevos. El PO las tendrá a mano cuando se ejecute el
   checklist (login vía `signInWithPassword` desde un script local de un solo uso, como sugiere el
   propio roadmap).
4. **Quien ejecuta el checklist: Claude Code**, directamente vía script local (PowerShell/Node) que
   golpea la API REST de producción con los JWTs obtenidos — no el PO manualmente. Toda escritura de
   prueba se revierte de inmediato dentro del mismo script (ver puntos 4 y 7 del checklist).
5. **`SUPABASE_SECRET_KEY` se rota al final de todo**, después de correr el checklist y documentar
   todo lo demás — para no invalidar a mitad de camino ninguna credencial que el checklist necesite.
   Confirmado por grep: esa llave **solo** se usa en `.env.local` (leída por `scripts/create_user.mjs`
   y `scripts/migrate_to_supabase.py`, ambos ejecutados solo localmente) — nunca en Vercel ni en
   GitHub Actions. Rotar = cambiar en el Dashboard de Supabase + actualizar `.env.local`, nada más.
6. **El indicador solo-Admin de B.5 es un texto/badge inerte** junto al `RoleBadge` existente en el
   nav (`src/app/layout.tsx` línea 49), sin link a ninguna pantalla real — es la sonda que pide el
   roadmap (`data-testid="admin-only"`), no una feature de Fase C adelantada. No requiere ningún
   componente nuevo de Claude Design: reutiliza los tokens ya integrados en B.3
   (`design-system-auth.dc.html`).
7. **El test de B.5 introduce el primer mock de Supabase del proyecto** (hoy solo existe
   `src/lib/__tests__/slug.test.ts`, sobre una función pura). Se usa `vi.mock` simple de Vitest,
   sin librerías nuevas (no MSW).
8. **README para uso propio entre sesiones**, no para un tercero externo sin contexto — mismo tono
   que `CLAUDE.md`.
9. **Los pendientes colaterales de B.3 quedan así**: el PO confirmó que el Redirect URL de
   `/auth/callback` en producción **ya está whitelisteado** y que el flujo de recuperar/restablecer
   contraseña **ya se probó en producción** (no solo localhost) — esto corrige a `CLAUDE.md`, que
   todavía los listaba como pendientes/sin confirmar. **Configurar SMTP propio en Supabase queda
   explícitamente pospuesto hasta después de cerrar Fase C** (decisión del PO) — no se toca en esta
   unidad, y debe seguir documentado como pendiente conocido (no perdido).

## Alcance de B.5 — `<RoleGate>`

1. **`src/components/auth/role-gate.tsx`** (Server Component, sin `"use client"`):
   ```ts
   export async function RoleGate({
     role = "admin",
     children,
     fallback = null,
   }: {
     role?: Role;
     children: React.ReactNode;
     fallback?: React.ReactNode;
   })
   ```
   Resuelve con `getCurrentProfile()` (`src/lib/auth/session.ts`, ya existe). Si no hay perfil o el
   rol no coincide, renderiza `fallback`; si coincide, renderiza `children`.
2. **Estrenarlo en `src/app/layout.tsx`**: envolver un nuevo `<span data-testid="admin-only">` (texto
   inerte, ej. "Vista Admin") con `<RoleGate>`, ubicado junto al `RoleBadge` existente (línea 49).
3. **Tests unitarios nuevos** para `src/lib/auth/session.ts` (`src/lib/auth/__tests__/session.test.ts`
   o similar), mockeando `getSupabaseClient` vía `vi.mock("@/lib/supabase/server")`:
   - sin usuario autenticado → `getCurrentProfile()` devuelve `null`.
   - usuario autenticado sin fila en `profiles` → `null`.
   - `requireAdmin()` con rol `viewer` → redirige (verificar llamada a `redirect("/")`, mockeando
     `next/navigation`).
4. **Aceptación**: `curl`/`Invoke-RestMethod` (o test de integración) al HTML de `/` con cookie de
   sesión Viewer no debe contener el literal del `data-testid`; con cookie Admin sí. `npm run test`
   en verde.

## Alcance de B.6 — Verificación de seguridad + cierre de documentación

1. **Checklist de 11 puntos contra producción** (texto exacto en `ROADMAP_V2.md` líneas 224–244):
   anónimo no lee ninguna de las 5 tablas; Viewer lee pero no actualiza/inserta/borra (confirmando
   con una lectura posterior que nada cambió); Admin sí escribe y revierte de inmediato (confirmando
   que el trigger `updated_at` de B.4 se movió); escalada de privilegio de Viewer→Admin bloqueada;
   signup abierto bloqueado; sesión expira/redirige a `/login`; HTML de Viewer sin el marcador de
   B.5. Ejecutar con un script de un solo uso (PowerShell o Node, `.mjs` como `create_user.mjs`) que
   NO se comitea con credenciales embebidas — lee el JWT/contraseña de variables de entorno locales.
2. **Guardar la evidencia en `supabase/RUNBOOK_AUTH.md` (nuevo)**, con fecha, cada uno de los 11
   puntos y su resultado literal (status code / body relevante), siguiendo el formato narrativo de
   `supabase/RUNBOOK_BACKUP.md` como referencia de estilo.
3. **Actualizar `CLAUDE.md`**:
   - "Estado actual" → Fase B completa (quitar "Falta B.5... B.6...").
   - Reemplazar (no solo anotar) la sección obsoleta "Fase 3 — Acceso" (Auth.js + Google, plan
     abandonado) dentro de "Roadmap de fases".
   - Tabla de "Archivos clave": agregar `src/components/auth/role-gate.tsx`,
     `supabase/RUNBOOK_AUTH.md`.
   - Documentar la regla "toda Server Action empieza con `requireAuth()`/`requireAdmin()`" (para que
     Fase C la siga desde el primer commit).
   - Corregir los dos puntos ya resueltos del punto 9 de las decisiones (redirect URL, prueba en
     producción) — dejar solo SMTP como pendiente explícito, con nota de que se retoma después de
     Fase C.
4. **Reescribir `README.md`** (hoy describe la arquitectura pre-Supabase/Google Sheet): qué es, stack
   real, cómo correrlo (`npm run dev`, variables de entorno), cómo hacer un cambio de esquema
   (`supabase/migrations/` + `npm run db:push`), cómo entrar (login real), dónde está el backup.
   Tono: para el propio PO entre sesiones, no para un tercero externo.
5. **Marcar Fase B completa en `ROADMAP_V2.md`** y anotar cualquier desviación real de ejecución
   respecto al diseño (mismo patrón que B.1–B.4, cuyo detalle de cierre vive en
   `ROADMAP_HISTORIAL.md`) — mover el detalle de cierre de B.5/B.6 a `ROADMAP_HISTORIAL.md` si
   `ROADMAP_V2.md` empieza a crecer demasiado (patrón ya usado el 2026-08-09).
6. **Rotar `SUPABASE_SECRET_KEY`** en el Dashboard de Supabase (Project Settings → API) y actualizar
   `.env.local` — último paso, después de 1–5. Instrucciones manuales paso a paso para el PO en la
   sección de Verificación abajo (es la única acción que Claude Code no puede ejecutar directamente,
   requiere el Dashboard web de Supabase).

## Archivos críticos a tocar

- **Nuevo**: `src/components/auth/role-gate.tsx`, `src/lib/auth/__tests__/session.test.ts`,
  `supabase/RUNBOOK_AUTH.md`, script de un solo uso para el checklist (ej.
  `scripts/verificar_seguridad_fase_b.mjs`, no comiteado con secretos).
- **Editar**: `src/app/layout.tsx` (agregar el `<RoleGate>`), `CLAUDE.md`, `README.md`,
  `ROADMAP_V2.md`, `.env.local` (fuera de git, solo local).
- **Reutilizar sin modificar**: `src/lib/auth/session.ts` (`getCurrentProfile`/`requireAdmin` ya
  existen), `src/components/auth/role-badge.tsx` (referencia de estilo para el nuevo indicador).

## Fuera de alcance de esta unidad

- SMTP propio de Supabase (pospuesto explícitamente hasta después de Fase C).
- Cualquier pantalla real de administración (eso es Fase C).
- Selector de rol en la UI para simular vistas (no lo pide el roadmap).

## Verificación end-to-end

1. `npm run typecheck && npm run lint && npm run test && npm run build` en verde antes de abrir el PR.
2. Prueba manual local: con sesión Viewer, `/` no debe mostrar el `data-testid="admin-only"`; con
   sesión Admin, sí.
3. Mergear el PR a `main` y esperar el deploy de Vercel (no hay previews por PR en este proyecto).
4. Correr el script del checklist de B.6 contra producción con las credenciales reales del PO;
   confirmar los 11 puntos y volcar la evidencia a `supabase/RUNBOOK_AUTH.md`.
5. **Acción manual del PO, paso a paso** (rotación de la llave, al final de todo):
   1. Entrar a `https://supabase.com/dashboard` → proyecto `positiva-web-414` → **Project Settings**
      → **API**.
   2. En la sección **Secret keys**, click en **Generate new secret key** (o "Roll" si la UI lo
      llama así) para `sb_secret_...`. Confirmar la acción.
   3. Copiar la nueva llave mostrada (solo se ve una vez).
   4. Abrir `.env.local` en la raíz de `dashboard-414/` y reemplazar el valor de
      `SUPABASE_SECRET_KEY` por la nueva llave.
   5. Confirmar que `scripts/create_user.mjs` sigue funcionando con la llave nueva (ej. correrlo con
      un email de prueba y revertir, o simplemente confirmar que no tira error de autenticación).
6. Confirmar en `ROADMAP_V2.md`/`CLAUDE.md` que Fase B queda marcada como completa, y que Fase C
   queda como "siguiente paso" explícito.
