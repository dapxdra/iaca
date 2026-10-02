import type { Metadata, Viewport } from "next";
import { Libre_Bodoni, Public_Sans } from "next/font/google";
import { businessInfo, seoKeywords, siteConfig } from "@/config/site";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// Par tipográfico editorial: Bodoni (personalidad, titulares) + Public Sans
// (el sans-serif del design system de gobierno de EE.UU., USWDS — legible y
// con carácter institucional, apropiado para una empresa que tramita ante
// entidades públicas). Ver design-system/MASTER.md.
const libreBodoni = Libre_Bodoni({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-libre-bodoni",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-public-sans",
  display: "swap",
});

/**
 * Metadata base heredada por todas las rutas. Cada página puede sobreescribir
 * lo suyo (las del panel y /login declaran `robots: noindex` — ver sus layouts).
 *
 * `metadataBase` es lo que convierte las rutas relativas de `canonical` y de
 * las imágenes de Open Graph en URLs absolutas. Sale de `NEXT_PUBLIC_APP_URL`:
 * si en producción queda apuntando a localhost, Google indexa canonicals
 * inválidos, así que esa variable es obligatoria en el deploy (ver .env.example).
 */
export const metadata: Metadata = {
  title: {
    // `default` para la home, `template` para el resto: así cada página queda
    // como "Política de privacidad | IACA Topografía" sin repetir la marca.
    default: `${siteConfig.name} Topografía | Levantamientos y planos catastrados en Costa Rica`,
    template: `%s | ${businessInfo.legalName}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  applicationName: businessInfo.legalName,
  keywords: [...seoKeywords],
  authors: [{ name: businessInfo.legalName }],
  creator: businessInfo.legalName,
  publisher: businessInfo.legalName,
  category: "Topografía y agrimensura",
  // Evita que el sitio quede canonicalizado a una variante con parámetros.
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: businessInfo.legalName,
    title: `${businessInfo.legalName} | Levantamientos y planos catastrados en Costa Rica`,
    description: siteConfig.description,
    // La imagen la genera src/app/opengraph-image.tsx — Next la inyecta sola.
  },
  twitter: {
    card: "summary_large_image",
    title: `${businessInfo.legalName} | Topografía en Costa Rica`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Sin límite de longitud en el snippet ni en la vista previa de imagen:
      // deja que Google muestre el fragmento más completo que considere útil.
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  // Evita que Safari en iOS convierta números y direcciones en enlaces que
  // rompen el diseño (y que no son los canales de contacto reales).
  formatDetection: { telephone: false, address: false, email: false },
  // El favicon y el apple-touch-icon los inyecta Next por convención de
  // archivo (src/app/favicon.ico y src/app/apple-icon.png). Declararlos acá
  // también sobreescribiría esa convención, así que no se declaran.
  manifest: "/manifest.webmanifest",
  // Instalada desde Safari ("Agregar a inicio"), abre a pantalla completa y
  // con el nombre corto, no como una pestaña con barra de direcciones.
  appleWebApp: { capable: true, title: siteConfig.name, statusBarStyle: "default" },
  /**
   * Verificación de propiedad en Search Console. Dejar vacío no rompe nada;
   * el método recomendado es el registro DNS TXT, que no requiere tocar código.
   * Si se opta por la etiqueta HTML, pegar acá el token que da Google:
   *   verification: { google: "el-token" }
   */
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sin `maximumScale` ni `userScalable: false`: bloquear el zoom es un fallo
  // de accesibilidad (WCAG 1.4.4) y Lighthouse lo reporta como tal.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fefeda" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1825" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CR"
      className={`h-full antialiased ${libreBodoni.variable} ${publicSans.variable}`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* Salto al contenido: primer elemento enfocable de la página, visible
            solo con teclado. Requisito de WCAG 2.4.1 y lo revisa Lighthouse. */}
        <a
          href="#contenido"
          data-cy="skip-to-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-small focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
        >
          Saltar al contenido
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
