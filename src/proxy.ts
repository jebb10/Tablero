import { NextResponse, type NextRequest } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy-client";

// Rutas alcanzables sin sesión: /login y sus subrutas (recuperar,
// restablecer) y /auth/callback (intercambia el código del email de
// recuperación por una sesión — todavía no hay usuario cuando esta ruta se
// pide).
const RUTAS_PUBLICAS = ["/login", "/auth"];

function esRutaPublica(pathname: string) {
  return RUTAS_PUBLICAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
}

/**
 * Unidad B.3: protección optimista de todas las rutas, con RLS todavía en
 * modo público (si algo falla aquí, los datos siguen siendo legibles vía
 * PostgREST — el flip real de seguridad es la Unidad B.4).
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, response } = createProxyClient(request);

  // Antes de llamar a getUser(): si ya existía una cookie de sesión de
  // Supabase, un fallo de getUser() significa "sesión expirada", no
  // "primera visita" — distinción que se pierde después de la llamada
  // (getUser() puede limpiar/refrescar cookies).
  const teniaCookieDeSesion = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !esRutaPublica(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    if (teniaCookieDeSesion) {
      url.searchParams.set("msg", "expired");
    }

    const redirectResponse = NextResponse.redirect(url);
    // Gotcha crítico: copiar las cookies que el cliente de Supabase escribió
    // en `response` sobre la respuesta de redirección, o el token
    // refrescado se pierde y se produce un bucle (ERR_TOO_MANY_REDIRECTS).
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher:
    "/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
};
