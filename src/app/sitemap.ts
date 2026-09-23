import type { MetadataRoute } from "next";
import { legalDocuments, legalNav, siteConfig } from "@/config/site";

/**
 * sitemap.xml generado en `/sitemap.xml` y anunciado desde robots.ts.
 *
 * Solo lleva páginas públicas e indexables: la home y las páginas legales. El
 * panel y /login quedan fuera a propósito — incluir una URL que además está en
 * `Disallow` es una señal contradictoria que Search Console reporta como error.
 *
 * `lastModified` de las páginas legales sale de su fecha real de actualización
 * en config/site.ts, no de `new Date()`: una fecha que cambia en cada build le
 * dice a Google que el contenido cambió cuando no es cierto, y termina
 * ignorando el campo.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const legalPages = legalNav.map((item) => {
    const doc = legalDocuments[item.key];
    return {
      url: `${siteConfig.url}${item.href}`,
      lastModified: new Date(doc.actualizado),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    };
  });

  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...legalPages,
  ];
}
