import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 *
 * Nota sobre `script-src`: no lleva nonce. La CSP estricta con nonce en Next
 * exige generarlo por request en el proxy, y eso obliga a renderizado dinámico
 * en todas las páginas — el sitio público dejaría de servirse estático y
 * perdería justamente la velocidad de carga que buscamos. Como acá no hay
 * contenido de terceros ni HTML generado por usuarios (el único texto que
 * entra es el del formulario, que se guarda y nunca se vuelve a renderizar en
 * el sitio público), el riesgo de XSS es bajo y el intercambio se justifica.
 *
 * Si algún día se muestran los mensajes recibidos en una página pública, o se
 * integra un script de terceros, hay que volver acá y pasar a nonce.
 *
 * Lo que sí está cerrado, y es lo que más aporta:
 *   - `frame-ancestors 'none'`: nadie puede embutir el sitio en un iframe
 *     (clickjacking). Es el reemplazo moderno de X-Frame-Options.
 *   - `form-action 'self'`: un XSS no podría reapuntar el formulario de
 *     contacto ni el de login a un servidor ajeno.
 *   - `base-uri 'self'`: bloquea el secuestro de URLs relativas vía <base>.
 *   - `object-src 'none'`: sin Flash/applets, vectores muertos pero vigentes.
 *   - `upgrade-insecure-requests`: cualquier subrecurso http:// se pide por
 *     https://, así no hay contenido mixto.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // `unsafe-inline` es necesario para el script de arranque de Next; ver nota.
  "script-src 'self' 'unsafe-inline'",
  // Tailwind y el design system inyectan estilos en línea.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // `data:` y `blob:` para la imagen de Open Graph y las vistas previas de
  // fotos de bitácora antes de subirlas.
  "img-src 'self' data: blob: https://*.supabase.co",
  // Supabase: REST, Storage y Realtime (wss).
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    /**
     * Fuerza HTTPS en el navegador: una vez visto este encabezado, el cliente
     * se niega a hablar http con el dominio durante dos años, incluso si el
     * usuario escribe la URL sin https. Es lo que cierra la ventana del primer
     * request en claro que un redirect 301 no puede cubrir.
     *
     * `preload` lo deja listo para inscribir el dominio en la lista precargada
     * de los navegadores (hstspreload.org), que elimina también ese primer
     * request. Inscribirlo es una decisión con vuelta atrás lenta: hacerlo solo
     * cuando el dominio definitivo ya sirva TODO por https, subdominios
     * incluidos.
     */
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Impide que el navegador adivine el tipo de un archivo y ejecute como
    // script algo servido como texto.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Al salir del sitio se envía solo el origen, y nada si el destino es http.
    // Evita filtrar rutas internas del panel en el Referer.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Redundante con `frame-ancestors`, pero lo leen navegadores viejos.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Nada de esto se usa: se apaga para que ningún script pueda pedirlo.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  // No anunciar la tecnología ni su versión en cada respuesta.
  poweredByHeader: false,

  // Compresión gzip/brotli de las respuestas HTML y de los assets.
  compress: true,

  experimental: {
    // Sin `serverActions.bodySizeLimit`: ninguna Server Action recibe
    // archivos. Los adjuntos de bitácora van directo del navegador a Storage
    // con URL firmada (src/services/storage.service.ts), así que el límite
    // por defecto (1MB) alcanza y achica la superficie de abuso.
    /**
     * Reescribe los imports de barril a imports directos. `lucide-react`
     * exporta más de mil iconos desde un solo índice: sin esto, cada
     * componente que importa uno arrastra el módulo entero al bundle.
     */
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },

  images: {
    /**
     * Formatos de salida del optimizador de Next, en orden de preferencia.
     * AVIF pesa entre 20% y 50% menos que JPEG con calidad equivalente; el
     * navegador que no lo soporte recibe WebP y, si tampoco, el original.
     *
     * Aplica a las imágenes servidas con `next/image`. Hoy el sitio no tiene
     * ninguna imagen de mapa de bits —los gráficos son SVG en línea y un
     * <canvas>—, así que esto queda configurado para cuando se agreguen fotos
     * de trabajos: usar siempre `next/image`, nunca `<img>`, para que pasen
     * por acá y lleguen redimensionadas al tamaño real del hueco.
     */
    formats: ["image/avif", "image/webp"],
    // Un año de caché para las variantes ya optimizadas.
    minimumCacheTTL: 31_536_000,
    // Sin SVG remoto: un SVG puede contener scripts y se sirve desde el mismo
    // origen, así que sería un XSS con otro nombre.
    dangerouslyAllowSVG: false,
  },

  async headers() {
    // En desarrollo se omiten: HSTS ensucia el navegador con una política
    // difícil de revertir para localhost, y la CSP interfiere con el
    // recargado en caliente.
    if (!isProd) return [];

    return [
      {
        // Todas las rutas, incluidas las de assets.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // El service worker (public/sw.js) nunca se sirve de un caché HTTP:
        // si quedara una versión vieja, el modo sin conexión seguiría
        // apuntando a archivos de un deploy anterior.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
