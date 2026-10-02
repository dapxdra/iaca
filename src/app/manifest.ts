import type { MetadataRoute } from "next";
import { businessInfo, siteConfig } from "@/config/site";

/**
 * Web App Manifest en `/manifest.webmanifest`. Lighthouse lo revisa en la
 * categoría de buenas prácticas móviles y es lo que define el nombre y los
 * colores cuando alguien agrega el sitio a la pantalla de inicio del teléfono.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${businessInfo.legalName} — Servicios de topografía en Costa Rica`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    /**
     * Quien instala la app es casi siempre personal de campo: arranca en la
     * bitácora. Sin sesión el proxy lleva a /login, otro rol va a su propia
     * pantalla, y sin señal el service worker lleva a /campo.
     * `id` fija la identidad de la app en "/" (el start_url anterior): sin
     * él, cambiar start_url haría que una instalación existente se viera
     * como otra app distinta.
     */
    id: "/",
    start_url: "/bitacora",
    display: "standalone",
    lang: "es-CR",
    dir: "ltr",
    background_color: "#fefeda",
    theme_color: "#262f66",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        // `maskable` evita que Android recorte el logo dentro de su máscara.
        purpose: "maskable",
      },
    ],
  };
}
