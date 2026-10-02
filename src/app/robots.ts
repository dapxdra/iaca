import type { MetadataRoute } from "next";
import { dashboardNav, siteConfig } from "@/config/site";

/**
 * robots.txt generado en `/robots.txt`.
 *
 * Las rutas prohibidas se derivan de `dashboardNav` (config/site.ts), la misma
 * lista que usa el proxy para proteger el panel: agregar una pantalla nueva ahí
 * la excluye de los buscadores automáticamente, sin tocar este archivo.
 *
 * Nota de seguridad: `Disallow` es una petición, no un control de acceso —
 * quien ignore el archivo puede pedir la URL igual. Lo que realmente protege el
 * panel es la sesión (proxy.ts) y las políticas RLS de Postgres. Esto solo
 * evita que el contenido privado y las pantallas de sesión compitan en el
 * índice con las páginas públicas.
 */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    ...dashboardNav.map((item) => `${item.href}/`),
    "/login",
    // Captura de bitácora sin conexión: no está en dashboardNav (ver
    // offlineCaptureContent en config/site.ts), así que se agrega a mano.
    "/campo",
    // Server Actions y cualquier endpoint interno no deben rastrearse.
    "/api/",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
