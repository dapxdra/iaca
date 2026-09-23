import {
  businessInfo,
  contactContent,
  faqContent,
  homeContent,
  seoKeywords,
  siteConfig,
} from "@/config/site";

/**
 * Structured data (JSON-LD de schema.org). Es lo que le permite a Google
 * entender *qué* es esta empresa en vez de solo leer su texto: habilita el
 * panel de conocimiento, el resultado enriquecido de preguntas frecuentes y la
 * elegibilidad para el paquete local.
 *
 * Reglas que respeta este archivo:
 *   1. Todo dato declarado acá aparece también en el HTML visible. El
 *      structured data que afirma algo que el usuario no puede ver es motivo de
 *      acción manual de Google (spam de datos estructurados).
 *   2. Nada inventado: si un dato no está confirmado (dirección, horario,
 *      calificaciones) se omite la propiedad en vez de rellenarla.
 *   3. Las respuestas del FAQ salen del mismo `faqContent` que renderiza la
 *      sección visible, así no pueden divergir.
 */

/**
 * Serializa a JSON-LD escapando `<` como `<`. Sin esto, un `</script>`
 * dentro de cualquier texto de `config/site.ts` cerraría la etiqueta antes de
 * tiempo. Hoy no hay entrada de usuario acá, pero el escape es la diferencia
 * entre "seguro" y "seguro mientras nadie edite el config".
 */
function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function Script({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // El contenido es nuestro y va escapado por `jsonLd`; es la forma que
      // documenta Next.js para JSON-LD en el App Router.
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}

/** Identificador estable del negocio, para que los distintos nodos se enlacen. */
const BUSINESS_ID = `${siteConfig.url}/#organizacion`;

/**
 * Datos del negocio + catálogo de servicios. Va en la home.
 */
export function BusinessStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": businessInfo.schemaType,
    "@id": BUSINESS_ID,
    name: businessInfo.legalName,
    alternateName: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    image: `${siteConfig.url}/opengraph-image`,
    logo: `${siteConfig.url}/icon.png`,
    telephone: `+${contactContent.whatsapp.phoneE164}`,
    email: contactContent.email,
    knowsLanguage: businessInfo.availableLanguage,
    areaServed: {
      "@type": "Country",
      name: businessInfo.areaServed,
    },
    // Sin dirección postal confirmada solo se declara el país de operación.
    address: {
      "@type": "PostalAddress",
      addressCountry: businessInfo.countryCode,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: `+${contactContent.whatsapp.phoneE164}`,
        email: contactContent.email,
        availableLanguage: businessInfo.availableLanguage,
      },
    ],
    knowsAbout: [...seoKeywords],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicios de topografía",
      itemListElement: homeContent.services.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.titulo,
          description: s.detalle,
          serviceType: s.titulo,
          areaServed: { "@type": "Country", name: businessInfo.areaServed },
          provider: { "@id": BUSINESS_ID },
        },
      })),
    },
  };

  return <Script data={data} />;
}

/**
 * Preguntas frecuentes. Google puede mostrarlas desplegables bajo el resultado;
 * el texto es exactamente el que se renderiza en la sección `#preguntas`.
 */
export function FaqStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqContent.items.map((item) => ({
      "@type": "Question",
      name: item.pregunta,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.respuesta,
      },
    })),
  };

  return <Script data={data} />;
}

/** Nodo `WebSite`, que asocia el dominio con la organización. */
export function WebSiteStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#sitio`,
    url: siteConfig.url,
    name: businessInfo.legalName,
    description: siteConfig.description,
    inLanguage: "es-CR",
    publisher: { "@id": BUSINESS_ID },
  };

  return <Script data={data} />;
}

/**
 * Migas de pan para páginas internas. Google las usa para mostrar la ruta
 * ("iaca.cr › Política de privacidad") en vez de la URL cruda en el resultado.
 */
export function BreadcrumbStructuredData({
  items,
}: {
  items: { name: string; href: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Inicio", href: "/" },
      ...items,
    ].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.href === "/" ? "" : item.href}`,
    })),
  };

  return <Script data={data} />;
}
