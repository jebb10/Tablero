import type { NextRequest } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy-client";

/**
 * Unidad B.1: solo refresca la sesión (cookies de Supabase), sin redirigir a
 * nadie todavía — no hay `/login` ni usuarios reales aún, eso es la Unidad
 * B.3. `getUser()` fuerza la validación/refresco del token contra el
 * servidor de Auth; las cookies actualizadas quedan en `response`.
 */
export default async function proxy(request: NextRequest) {
  const { supabase, response } = createProxyClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // TEMPORAL: quitar tras verificar en logs de Vercel que el proxy corre en producción.
  console.log("[proxy] sesión refrescada para", request.nextUrl.pathname, "user:", user?.id ?? "anon");

  return response;
}

export const config = {
  matcher:
    "/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
};
