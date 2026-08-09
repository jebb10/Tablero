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
[PASA] 1. Anónimo no lee "document_versions"     — filas devueltas: 0
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

## Pendiente: punto 11

**HTML de Viewer sin el marcador `data-testid="admin-only"` (y con él para Admin).** No se puede
verificar contra producción hasta que el PR de B.5 (`RoleGate`) esté mergeado y desplegado — hoy la
marca ni existe en producción, así que "ausente" no sería evidencia real de que `RoleGate` funciona.

**Verificación pendiente, a mano en el navegador tras el deploy:**
1. Abrir una ventana de incógnito en `https://tablero-pi.vercel.app`, loguearse con una cuenta
   Viewer. Ver código fuente de la página (`Ctrl+U` o "Ver código fuente") y confirmar que el texto
   `data-testid="admin-only"` **no aparece**.
2. Repetir con una cuenta Admin — confirmar que **sí aparece**.
3. Anotar el resultado aquí con fecha, cerrando este runbook.

## Notas de seguridad de esta ejecución

- Las credenciales usadas fueron las cuentas reales del PO (Admin + Viewer), no usuarios
  desechables — decisión explícita del PO.
- La contraseña del Viewer quedó expuesta en texto plano en una sesión de chat durante la
  coordinación de esta prueba (antes de adoptar el método `--env-file`) — **se recomendó al PO
  rotarla** por precaución, independientemente de que el checklist confirme que RLS la protege.
