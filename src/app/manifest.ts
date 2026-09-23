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
    start_url: "/",
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
