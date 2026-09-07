import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { dashboardNav, defaultDashboardRoute } from "@/config/site";
import type { Database } from "@/types/database";

const PROTECTED_PREFIXES = dashboardNav.map((item) => item.href);
const LOGIN_PATH = "/login";

/**
 * Refresca la cookie de sesión de Supabase en cada request y protege las
 * rutas del dashboard. Debe llamarse desde `proxy.ts` en la raíz.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase todavía no configurado (ver README paso 3): no bloquear la app,
  // solo dejar pasar sin verificar sesión.
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // No ejecutar código entre createServerClient y getUser(): getUser()
  // revalida el token contra Supabase (a diferencia de leer la sesión de la
  // cookie) y es lo que realmente refresca la cookie en `response`.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isLoginRoute = pathname.startsWith(LOGIN_PATH);

  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = LOGIN_PATH;
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = defaultDashboardRoute;
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
