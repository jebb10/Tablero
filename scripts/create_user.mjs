// Unidad B.2 (ROADMAP_V2.md) — bootstrap/actualización de usuarios (Admin/Viewer).
//
// Crear usuarios a mano en el Dashboard de Supabase deja fácilmente un
// usuario en auth.users sin fila en profiles (puede loguearse pero no tiene
// rol — estado roto y difícil de diagnosticar). Este script hace ambos pasos
// atómicamente vía la Admin API, que solo acepta la secret key.
//
// Uso (PowerShell):
//   $env:SUPABASE_SECRET_KEY = "sb_secret_..."   # Project Settings > API, nunca en el repo
//   node scripts/create_user.mjs --email correo@dominio.com --role admin --name "Nombre Apellido" --password "..."
//
// Idempotente: si el email ya existe en auth.users, no lo recrea — solo
// hace upsert del rol/nombre en profiles.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nllqrrmxwtmwwxzopzix.supabase.co";

const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_SECRET_KEY) {
  console.error("Falta SUPABASE_SECRET_KEY en el entorno (Project Settings > API > secret key).");
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    const value = argv[i + 1];
    if (!key || value === undefined) {
      throw new Error(`Argumento inválido cerca de "${argv[i] ?? ""}".`);
    }
    args[key] = value;
  }
  return args;
}

const { email, role, name, password } = parseArgs(process.argv.slice(2));

if (!email || !role || !name || !password) {
  console.error("Uso: node scripts/create_user.mjs --email <correo> --role admin|viewer --name \"<nombre>\" --password <contraseña>");
  process.exit(1);
}
if (role !== "admin" && role !== "viewer") {
  console.error(`Rol inválido: "${role}". Debe ser "admin" o "viewer".`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findExistingUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  let user = await findExistingUserByEmail(email);

  if (user) {
    console.log(`Usuario ya existe en auth.users (${user.id}) — no se recrea, solo se actualiza el perfil.`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // evita depender del SMTP compartido de Supabase (rate-limited)
    });
    if (error) throw error;
    user = data.user;
    console.log(`Usuario creado en auth.users: ${user.id}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ user_id: user.id, role, full_name: name }, { onConflict: "user_id" });
  if (profileError) throw profileError;

  console.log(`profiles: ${email} -> role=${role}, full_name="${name}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
