import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { dashboardNav, defaultRouteForRole, navKeysByRole, type UserRole } from "@/config/site";
import type { Database } from "@/types/database";

const LOGIN_PATH = "/login";

/** Item de `dashboardNav` cuyo `href` coincide con `pathname`, si lo hay. */
function matchNavItem(pathname: string) {
  return dashboardNav.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
}

/**
 * Refresca la cookie de sesión de Supabase en cada request y aplica control
 * de acceso por rol sobre las rutas del dashboard — un `campo` no puede
 * entrar a `/clientes` ni un `cliente` a `/proyectos` aunque escriban la URL
 * a mano (ver `navKeysByRole` en config/site.ts). Es la segunda capa de
 * defensa; la real es RLS (supabase/migrations/0005_...).
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
  const navItem = matchNavItem(pathname);
  const isProtectedRoute = Boolean(navItem);
  const isLoginRoute = pathname.startsWith(LOGIN_PATH);

  if (!isProtectedRoute && !isLoginRoute) {
    return response;
  }

  if (!user) {
    if (isProtectedRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = LOGIN_PATH;
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // Perfil activo → rol real. Sin perfil (usuario desactivado, o el trigger
  // de alta aún no corrió) se trata como sesión inválida para rutas protegidas.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.active) {
    if (isProtectedRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = LOGIN_PATH;
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const role = profile.role as UserRole;

  if (isLoginRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = defaultRouteForRole(role);
    return NextResponse.redirect(redirectUrl);
  }

  if (navItem && !navKeysByRole[role].includes(navItem.key)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = defaultRouteForRole(role);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
