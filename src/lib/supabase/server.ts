import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Hardcodeadas como constantes (no env vars) — mismo caso que el antiguo
 * SHEET_ID: configurar env vars distintas por ambiente en Vercel requiere
 * un plan de pago que el PO no tiene. Sin problema de seguridad nuevo: la
 * "publishable key" está diseñada para viajar al navegador (queda en el
 * bundle igual con NEXT_PUBLIC_*); la protección real es RLS en Supabase,
 * no mantener este valor en secreto. Si el proyecto Supabase cambia, hay
 * que editar estas constantes y hacer deploy — no hay forma de cambiarlo
 * sin tocar código.
 */
const SUPABASE_URL = "https://nllqrrmxwtmwwxzopzix.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8uaiC0n3MJ2nTojAFNFE8A_gBsJ2lyT";

export function getSupabaseClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
