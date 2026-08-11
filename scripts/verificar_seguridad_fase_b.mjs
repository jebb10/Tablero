// Unidad B.6 (Fase B, ver supabase/RUNBOOK_AUTH.md) — checklist de verificación de seguridad con evidencia real.
//
// Corre contra producción (https://tablero-pi.vercel.app + Supabase prod), usando las cuentas
// reales de Admin y Viewer del PO. No crea usuarios de prueba ni toca datos que no revierta de
// inmediato. Cubre los puntos 1-9 del checklist (capa de datos, vía REST/supabase-js) y el punto
// 10 (sesión anónima). El punto 11 (HTML sin marcador admin-only para un Viewer real logueado en
// el navegador) es un chequeo visual rápido, documentado aparte en supabase/RUNBOOK_AUTH.md — no
// automatizable sin un navegador headless.
//
// Uso (PowerShell), sin comitear ninguna credencial:
//   $env:VIEWER_EMAIL = "..."
//   $env:VIEWER_PASSWORD = "..."
//   $env:ADMIN_EMAIL = "..."
//   $env:ADMIN_PASSWORD = "..."
//   node scripts/verificar_seguridad_fase_b.mjs
//
// Imprime cada punto del checklist con su resultado (PASA/FALLA) y el detalle de la respuesta —
// volcar la salida completa a supabase/RUNBOOK_AUTH.md con la fecha de ejecución.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nllqrrmxwtmwwxzopzix.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8uaiC0n3MJ2nTojAFNFE8A_gBsJ2lyT";
const APP_URL = "https://tablero-pi.vercel.app";

const { VIEWER_EMAIL, VIEWER_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!VIEWER_EMAIL || !VIEWER_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "Faltan credenciales en el entorno: VIEWER_EMAIL, VIEWER_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD.",
  );
  process.exit(1);
}

// document_versions se eliminó por completo en el cierre técnico de
// 2026-08-11 (scaffolding vacío, sin policies, de un diseño descartado).
const TABLES = ["projects", "requirements", "requirement_tasks", "activity_logs"];

const results = [];
function record(punto, descripcion, pasa, detalle) {
  results.push({ punto, descripcion, pasa, detalle });
  console.log(`[${pasa ? "PASA" : "FALLA"}] ${punto}. ${descripcion}\n    ${detalle}`);
}

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signIn(email, password) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login falló para ${email}: ${error.message}`);
  return client;
}

async function main() {
  // 1. Anónimo no lee ninguna de las 5 tablas.
  const anon = anonClient();
  for (const table of TABLES) {
    const { data, error } = await anon.from(table).select("id").limit(1);
    const pasa = !error && Array.isArray(data) && data.length === 0;
    record(
      "1",
      `Anónimo no lee "${table}"`,
      pasa,
      error ? `error: ${error.message}` : `filas devueltas: ${data?.length ?? "?"}`,
    );
  }

  // 2. Obtener JWT de Viewer y 3. Viewer lee.
  const viewer = await signIn(VIEWER_EMAIL, VIEWER_PASSWORD);
  record("2", "Login de Viewer exitoso", true, `email: ${VIEWER_EMAIL}`);

  const { data: viewerRead, error: viewerReadError } = await viewer
    .from("requirements")
    .select("id, title, updated_at")
    .limit(1);
  record(
    "3",
    "Viewer lee requirements",
    !viewerReadError && (viewerRead?.length ?? 0) > 0,
    viewerReadError ? `error: ${viewerReadError.message}` : `filas: ${viewerRead?.length}`,
  );

  if (!viewerRead || viewerRead.length === 0) {
    console.error("No se pudo leer ninguna fila de requirements con Viewer — abortando 4-8.");
    return finish();
  }
  const target = viewerRead[0];

  // 4. Viewer NO actualiza (0 filas, sin error) + confirmar que el valor no cambió.
  const { data: viewerUpdate, error: viewerUpdateError } = await viewer
    .from("requirements")
    .update({ title: `${target.title} [INTENTO-VIEWER]` })
    .eq("id", target.id)
    .select();
  const { data: afterUpdate } = await viewer
    .from("requirements")
    .select("title")
    .eq("id", target.id)
    .maybeSingle();
  const punto4Pasa =
    !viewerUpdateError && (viewerUpdate?.length ?? 0) === 0 && afterUpdate?.title === target.title;
  record(
    "4",
    "Viewer NO actualiza requirements (RLS filtra silenciosamente, valor no cambió)",
    punto4Pasa,
    `filas actualizadas: ${viewerUpdate?.length ?? "?"}, título tras intento: "${afterUpdate?.title}"`,
  );

  // 5. Viewer NO inserta en activity_logs.
  const { error: viewerInsertError } = await viewer
    .from("activity_logs")
    .insert({ requirement_id: target.id, event_type: "intento-viewer", title: "Intento Viewer" });
  record(
    "5",
    "Viewer NO inserta en activity_logs",
    !!viewerInsertError,
    viewerInsertError ? `error: ${viewerInsertError.message}` : "insertó sin error (FALLA)",
  );

  // 6. Viewer NO borra.
  const { data: viewerDelete, error: viewerDeleteError } = await viewer
    .from("requirements")
    .delete()
    .eq("id", target.id)
    .select();
  const { data: stillExists } = await viewer.from("requirements").select("id").eq("id", target.id);
  record(
    "6",
    "Viewer NO borra requirements (fila sigue existiendo)",
    !viewerDeleteError && (viewerDelete?.length ?? 0) === 0 && (stillExists?.length ?? 0) === 1,
    `filas borradas: ${viewerDelete?.length ?? "?"}, sigue existiendo: ${stillExists?.length === 1}`,
  );

  // 7. Admin SÍ escribe (y revierte de inmediato) + confirmar trigger updated_at.
  const admin = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
  const { data: before } = await admin
    .from("requirements")
    .select("title, updated_at")
    .eq("id", target.id)
    .maybeSingle();
  const { data: adminUpdate, error: adminUpdateError } = await admin
    .from("requirements")
    .update({ title: `${before.title} [PRUEBA-ADMIN]` })
    .eq("id", target.id)
    .select();
  const trigger =
    !adminUpdateError && adminUpdate?.[0]?.updated_at && adminUpdate[0].updated_at !== before.updated_at;
  // Revertir de inmediato.
  await admin.from("requirements").update({ title: before.title }).eq("id", target.id);
  record(
    "7",
    "Admin SÍ escribe (revertido) y trigger updated_at se movió",
    !!adminUpdate?.length && trigger,
    `updated_at antes: ${before.updated_at}, después: ${adminUpdate?.[0]?.updated_at}`,
  );

  // 8. Escalada de privilegio bloqueada.
  const { data: viewerUser } = await viewer.auth.getUser();
  const { data: escalation, error: escalationError } = await viewer
    .from("profiles")
    .update({ role: "admin" })
    .eq("user_id", viewerUser.user.id)
    .select();
  record(
    "8",
    "Viewer no puede escalar su propio rol a admin",
    !escalationError && (escalation?.length ?? 0) === 0,
    `filas afectadas: ${escalation?.length ?? "?"}`,
  );

  // 9. Sin signup abierto.
  const signupClient = anonClient();
  const { error: signupError } = await signupClient.auth.signUp({
    email: `sonda-${Date.now()}@example.com`,
    password: "Sonda123456!",
  });
  record(
    "9",
    "Signup abierto bloqueado",
    !!signupError,
    signupError ? `error: ${signupError.message}` : "signup permitido (FALLA)",
  );

  // 10. Sesión: navegador anónimo redirige a /login.
  const resp = await fetch(APP_URL, { redirect: "manual" });
  const location = resp.headers.get("location") ?? "";
  const punto10Pasa = [307, 308, 302].includes(resp.status) && location.includes("/login");
  record(
    "10",
    "Request anónimo a / redirige a /login",
    punto10Pasa,
    `status: ${resp.status}, location: ${location}`,
  );

  await finish();

  async function finish() {
    const fallidos = results.filter((r) => !r.pasa);
    console.log(`\n${results.length - fallidos.length}/${results.length} puntos en PASA.`);
    if (fallidos.length > 0) {
      console.error(`Puntos en FALLA: ${fallidos.map((f) => f.punto).join(", ")}`);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
