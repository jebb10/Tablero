import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/**
 * Cliente de Supabase para usar únicamente desde `src/proxy.ts`. A diferencia
 * del cliente de `server.ts` (que lee/escribe cookies vía `next/headers`),
 * este lee de `NextRequest` y escribe en `NextResponse` — es la única forma
 * de reescribir cookies fuera de un Server Component/Server Function.
 */
export function createProxyClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  return { supabase, response };
}
