# Runbook de verificación de seguridad (Fase B, Unidad B.6)

Evidencia real (no por inspección visual) de que RLS bloquea a un Viewer y a un usuario anónimo,
siguiendo el checklist de 11 puntos de `ROADMAP_V2.md`. Script reutilizable:
`scripts/verificar_seguridad_fase_b.mjs` (lee credenciales de un archivo `--env-file` local,
gitignored — nunca las recibe hardcodeadas ni las escribe a disco).

## Ejecución 2026-08-09 — puntos 1-10, contra producción (`https://tablero-pi.vercel.app` + Supabase prod)

Corrido con las cuentas reales de Admin y Viewer del PO, antes de mergear el PR de B.5/B.6 (los
puntos 1-10 verifican RLS, vigente desde B.4 — no dependen de que B.5 esté desplegada).

```
[PASA] 1. Anónimo no lee "projects"              — filas devueltas: 0
[PASA] 1. Anónimo no lee "requirements"          — filas devueltas: 0
[PASA] 1. Anónimo no lee "requirement_tasks"     — filas devueltas: 0
[PASA] 1. Anónimo no lee "activity_logs"         — filas devueltas: 0
[PASA] 1. Anónimo no lee "document_versions"     — filas devueltas: 0 (tabla eliminada en el cierre técnico de 2026-08-11, ver nota abajo)
[PASA] 2. Login de Viewer exitoso                — email: johan414@yopmail.com
[PASA] 3. Viewer lee requirements                — filas: 1
[PASA] 4. Viewer NO actualiza requirements        — filas actualizadas: 0, título sin cambios ("Sección de Noticias")
[PASA] 5. Viewer NO inserta en activity_logs      — error: new row violates row-level security policy for table "activity_logs"
[PASA] 6. Viewer NO borra requirements            — filas borradas: 0, la fila sigue existiendo
[PASA] 7. Admin SÍ escribe (revertido) y trigger updated_at se movió
         — updated_at antes: 2026-08-06T23:42:17.321193+00:00
         — updated_at después: 2026-08-09T23:21:11.994593+00:00
[PASA] 8. Viewer no puede escalar su propio rol a admin — filas afectadas: 0
[PASA] 9. Signup abierto bloqueado                — error: "Signups not allowed for this instance"
[PASA] 10. Request anónimo a / redirige a /login  — status: 307, location: /login?next=%2F

14/14 puntos en PASA.
```

**Hallazgo adicional confirmado por el punto 5**: `activity_logs`, aunque todavía sin uso real
(vacía, forward-looking para Fase C), **ya tiene RLS activo** — no es una tabla abierta.

## Punto 11 — confirmado 2026-08-09, tras el deploy del PR #8

**HTML de Viewer sin el marcador `data-testid="admin-only"` (y con él para Admin).** Verificado a
mano en el navegador contra `https://tablero-pi.vercel.app` ya con B.5 desplegada: logueado como
Viewer, el indicador "Vista Admin" **no aparece** en el nav; logueado como Admin, **sí aparece**.
Confirmado por el PO.

**11/11 puntos del checklist en PASA. Fase B queda cerrada.**

## Notas de seguridad de esta ejecución

- Las credenciales usadas fueron las cuentas reales del PO (Admin + Viewer), no usuarios
  desechables — decisión explícita del PO.
- La contraseña del Viewer quedó expuesta en texto plano en una sesión de chat durante la
  coordinación de esta prueba (antes de adoptar el método `--env-file`) — **se recomendó al PO
  rotarla** por precaución, independientemente de que el checklist confirme que RLS la protege.
