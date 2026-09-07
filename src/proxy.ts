import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renombró `middleware.ts` a `proxy.ts` (mismo comportamiento,
// solo cambia el nombre del archivo y de la función exportada).
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Excluye assets estáticos: no necesitan verificación de sesión y evita
  // trabajo innecesario en cada request.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
