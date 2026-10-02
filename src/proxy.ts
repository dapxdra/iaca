import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Si el request llegó por http, redirige a la misma URL en https.
 *
 * El encabezado `Strict-Transport-Security` (next.config.ts) se encarga de que
 * el navegador nunca vuelva a intentar http, pero solo después de la primera
 * visita: este redirect es lo que cubre ese primer request, el que llega de
 * alguien que escribió el dominio a mano o siguió un enlace viejo.
 *
 * Detrás de un proxy inverso la conexión interna es http, así que el protocolo
 * real viene en `x-forwarded-proto`. Si el encabezado no está, se asume https
 * y no se redirige: preferimos no entrar en un bucle de redirecciones en un
 * entorno que no lo reporta. Vercel ya redirige a https en su capa de red, con
 * lo que esto es un no-op ahí y sirve en cualquier otro host.
 */
function redirectToHttps(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (!forwardedProto) return null;

  // Puede venir como lista ("http,https") si hay varios proxies; el primero es
  // el del cliente.
  const proto = forwardedProto.split(",")[0]?.trim();
  if (proto !== "http") return null;

  // Excepción para el host local. `next start` reporta `x-forwarded-proto: http`
  // cuando no hay proxy delante, así que sin esta salida no se podría probar un
  // build de producción en la máquina: todo request terminaría redirigido a un
  // https://localhost que no existe. No debilita nada — un atacante en la red
  // no puede hacer que el host del request sea localhost.
  const hostname = request.nextUrl.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
    return null;
  }

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  // 308 y no 301: preserva el método, así un POST a una Server Action no se
  // convierte en GET y pierde el cuerpo.
  return NextResponse.redirect(url, 308);
}

// Next.js 16 renombró `middleware.ts` a `proxy.ts` (mismo comportamiento,
// solo cambia el nombre del archivo y de la función exportada).
export function proxy(request: NextRequest) {
  const httpsRedirect = redirectToHttps(request);
  if (httpsRedirect) return httpsRedirect;

  return updateSession(request);
}

export const config = {
  /**
   * Excluye lo que no necesita verificación de sesión. Además de los assets
   * estáticos, quedan fuera los archivos que leen los buscadores
   * (robots.txt, sitemap.xml, el manifest y los iconos): cada request que pasa
   * por acá hace una llamada a Supabase para revalidar el token, y hacerla
   * para servir un archivo público es latencia regalada en el rastreo.
   * `sw.js` (el service worker) tampoco necesita sesión.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|apple-icon|opengraph-image|icon|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
