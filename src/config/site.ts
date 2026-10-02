/**
 * Configuración central de textos y navegación del sitio.
 *
 * Todo string visible al usuario (nombre de la app, títulos, menús, copys)
 * vive aquí. Los componentes solo importan y renderizan — para renombrar la
 * app o cambiar un texto no hace falta tocar ningún componente.
 */

/**
 * Dominio de producción. De acá salen los `canonical`, el `sitemap.xml`, el
 * `robots.txt` y las URLs absolutas de las imágenes de vista previa.
 *
 * El respaldo depende del entorno a propósito. Si en producción faltara
 * `NEXT_PUBLIC_APP_URL`, un respaldo a localhost haría que Google indexara
 * `http://localhost:3000/...` y el sitio sencillamente no aparecería; con el
 * dominio real como respaldo, olvidar la variable es inofensivo. En desarrollo
 * el respaldo sigue siendo localhost, para no generar enlaces a producción
 * mientras se trabaja.
 *
 * `NEXT_PUBLIC_APP_URL` sigue teniendo prioridad: es lo que permite que los
 * despliegues de vista previa se apunten a sí mismos.
 */
const PRODUCTION_URL = "https://topografiaiaca.com";

const fallbackUrl =
  process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000";

export const siteConfig = {
  name: "IACA",
  fullName: "IACA — Servicios de Topografía",
  /**
   * Descripción del *sitio público* (la que lee Google en el `<meta name="description">`
   * de la home). Antes describía la plataforma interna de gestión, que es
   * invisible para quien busca en Google — lo que se indexa es la empresa y sus
   * servicios. 150-160 caracteres es lo que Google muestra sin truncar.
   */
  description:
    "Servicios de topografía en Costa Rica: levantamientos topográficos, agrimensura, amojonamiento, planos catastrados y trámites ante el Catastro Nacional.",
  /** Descripción de la plataforma interna (login/dashboard, `noindex`). */
  appDescription:
    "Plataforma de gestión de proyectos, campo, cálculo, dibujo y entrega para servicios de topografía en Costa Rica.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? fallbackUrl,
  /** Dominio canónico, sin protocolo — para mostrarlo en texto. */
  domain: PRODUCTION_URL.replace(/^https?:\/\//, ""),
  locale: "es_CR",
} as const;

/**
 * Palabras clave objetivo del sitio, ordenadas por intención de búsqueda real
 * en Costa Rica. Alimentan `metadata.keywords` y — más importante para el
 * ranking — deben aparecer de forma natural en el contenido visible (títulos,
 * servicios, FAQ). Google ignora la meta `keywords` desde 2009: posiciona por
 * el texto de la página, así que la lista de acá es la guía editorial, no el
 * mecanismo. No agregar términos que el sitio no cubra de verdad: keyword
 * stuffing irrelevante hunde el ranking en vez de subirlo.
 */
export const seoKeywords = [
  "topografía Costa Rica",
  "topógrafo Costa Rica",
  "levantamiento topográfico",
  "servicios de topografía",
  "agrimensura",
  "amojonamiento de linderos",
  "plano catastrado",
  "plano de catastro",
  "medición de terrenos",
  "curvas de nivel",
  "estudio topográfico",
  "trámites Catastro Nacional",
  "visado municipal de planos",
  "CR-SIRGAS CRTM05",
  "deslinde de propiedad",
  "topografía para construcción",
] as const;

export type DashboardNavItem = {
  /** Identificador corto usado en data-cy y como llave de `dashboardPages`. */
  key: string;
  href: string;
  label: string;
};

export type NavItem = {
  key: string;
  href: string;
  label: string;
};

// Ancla a cada <section id="..."> del sitio público (src/app/page.tsx).
export const publicNav: NavItem[] = [
  { key: "servicios", href: "#servicios", label: "Servicios" },
  { key: "proceso", href: "#proceso", label: "Proceso" },
  { key: "confianza", href: "#confianza", label: "Nosotros" },
  { key: "preguntas", href: "#preguntas", label: "Preguntas" },
  { key: "contacto", href: "#contacto", label: "Contacto" },
];

/**
 * Páginas legales. Son rutas reales (no anclas) porque Google las indexa por
 * separado y porque un enlace a "Política de privacidad" desde el footer de
 * todas las páginas es un requisito de confianza que los buscadores evalúan.
 * `sitemap.ts` las lee de acá, así que agregar una entrada la publica sola.
 */
export const legalNav: NavItem[] = [
  { key: "privacidad", href: "/privacidad", label: "Política de privacidad" },
  { key: "terminos", href: "/terminos", label: "Términos y condiciones" },
];

/**
 * Roles del sistema (docs/REQUIREMENTS.md sección 3). Se repite acá como
 * unión de strings (en vez de importar el enum de Supabase) para que
 * `config/site.ts` no dependa de `types/database` — es config pura.
 */
export type UserRole = "admin" | "oficina" | "campo" | "cliente";

// Lista completa: define todas las rutas protegidas del dashboard (el proxy
// las usa para saber qué proteger), independientemente de quién las vea en
// su sidebar — eso lo decide `navKeysByRole` de abajo.
export const dashboardNav: DashboardNavItem[] = [
  { key: "proyectos", href: "/proyectos", label: "Proyectos" },
  { key: "cobros", href: "/cobros", label: "Cobros" },
  { key: "clientes", href: "/clientes", label: "Clientes" },
  { key: "bitacora", href: "/bitacora", label: "Bitácora de campo" },
  { key: "tramites", href: "/tramites", label: "Trámites" },
  { key: "kpi", href: "/kpi", label: "Reportes KPI" },
  { key: "mis-proyectos", href: "/mis-proyectos", label: "Mis proyectos" },
];

/**
 * Qué `key` de `dashboardNav` ve cada rol en su sidebar, y a qué rutas puede
 * entrar (el proxy y cada página lo validan — ver `src/lib/auth.ts`).
 * Único lugar que hay que tocar para cambiar el alcance de un rol.
 */
export const navKeysByRole: Record<UserRole, string[]> = {
  admin: ["proyectos", "cobros", "clientes", "bitacora", "tramites", "kpi"],
  oficina: ["proyectos", "cobros", "clientes", "bitacora", "tramites", "kpi"],
  // Campo solo hace bitácora de campo (docs/REQUIREMENTS.md sección 3).
  campo: ["bitacora"],
  // Cliente es de solo lectura sobre sus propios proyectos.
  cliente: ["mis-proyectos"],
};

export function dashboardNavForRole(role: UserRole): DashboardNavItem[] {
  const allowed = new Set(navKeysByRole[role]);
  return dashboardNav.filter((item) => allowed.has(item.key));
}

/** Página a la que se manda a cada rol tras iniciar sesión (y desde /login ya autenticado). */
export function defaultRouteForRole(role: UserRole): string {
  return dashboardNavForRole(role)[0]?.href ?? "/login";
}

// Usado por el proxy antes de conocer el rol (ver src/lib/supabase/proxy.ts).
export const defaultDashboardRoute = dashboardNavForRole("admin")[0].href;

export type DashboardPageContent = {
  title: string;
  description: string;
  docsRef: string;
};

// Una entrada por cada `key` de dashboardNav.
export const dashboardPages: Record<string, DashboardPageContent> = {
  proyectos: {
    title: "Proyectos",
    description:
      "Listado de proyectos y subproyectos con filtros por ID, cliente, zona y estado (Contacto → Campo → Cálculo → Dibujo → Entrega).",
    docsRef: "docs/REQUIREMENTS.md sección 4.2",
  },
  cobros: {
    title: "Cobros",
    description:
      "Monto a cobrar y pagos registrados por proyecto, con saldo pendiente calculado automáticamente. Registro interno, no genera comprobantes fiscales.",
    docsRef: "docs/REQUIREMENTS.md sección 4.10",
  },
  clientes: {
    title: "Clientes",
    description:
      "Control de clientes (personas físicas y jurídicas) y su historial de proyectos.",
    docsRef: "docs/REQUIREMENTS.md sección 4.1",
  },
  bitacora: {
    title: "Bitácora de campo",
    description:
      "Registro diario de actividades de los trabajadores de campo, con carga de fotos.",
    docsRef: "docs/REQUIREMENTS.md sección 4.3",
  },
  tramites: {
    title: "Trámites gubernamentales",
    description:
      "Registro de envíos de documentos a entidades (Catastro Nacional, municipalidades, etc.), con fecha de envío y alertas de proyectos sin revisión.",
    docsRef: "docs/REQUIREMENTS.md sección 4.5",
  },
  kpi: {
    title: "Reportes KPI",
    description:
      "Indicadores por proyecto, zona y trabajador (tiempos de ciclo, proyectos a tiempo, volumen por zona).",
    docsRef: "docs/REQUIREMENTS.md sección 4.6",
  },
  "mis-proyectos": {
    title: "Mis proyectos",
    description:
      "Seguimiento de tus proyectos con IACA: estado actual y fechas. Vista de solo lectura.",
    docsRef: "docs/REQUIREMENTS.md sección 3 (rol cliente)",
  },
};

export const homeContent = {
  loginLabel: "Acceder",
  contactCtaLabel: "Contáctanos",
  heroTitle: "Servicios de topografía en Costa Rica",
  heroSubtitle:
    "Levantamientos, cálculo, dibujo y trámites topográficos, referenciados al sistema oficial CR-SIRGAS.",
  footerText: `${siteConfig.name} — Servicios de topografía`,
  // `detalle` es texto indexable: cada uno menciona de forma natural los
  // términos de `seoKeywords` que le corresponden. Nada de listas de keywords
  // sueltas — son frases que un cliente entiende.
  services: [
    {
      key: "levantamientos",
      titulo: "Levantamientos topográficos",
      detalle:
        "Medición de terrenos y captura de puntos en campo con estación total y GPS, referenciados al sistema oficial CR-SIRGAS (CRTM05).",
    },
    {
      key: "agrimensura",
      titulo: "Agrimensura y amojonamiento",
      detalle:
        "Deslinde y demarcación de linderos, cálculo de áreas y colocación de mojones según la normativa del Catastro Nacional.",
    },
    {
      key: "curvas-nivel",
      titulo: "Curvas de nivel y modelado de terreno",
      detalle:
        "Planos topográficos con curvas de nivel y perfiles para estudios de sitio, diseño de obra y proyectos de construcción.",
    },
    {
      key: "tramites",
      titulo: "Planos catastrados y trámites",
      detalle:
        "Elaboración de planos de catastro y gestión del trámite completo ante el Catastro Nacional, municipalidades y otras entidades.",
    },
  ],
} as const;

/**
 * Preguntas frecuentes. Doble propósito: responden dudas reales de compra y
 * alimentan el structured data `FAQPage` (`src/components/structured-data.tsx`),
 * que es lo que habilita el resultado enriquecido desplegable en Google. El
 * texto de la respuesta debe ser el mismo que se muestra en pantalla — Google
 * penaliza el structured data que no coincide con el contenido visible.
 */
export const faqContent = {
  heading: "Preguntas frecuentes",
  description:
    "Dudas habituales sobre levantamientos, planos catastrados y trámites topográficos en Costa Rica.",
  items: [
    {
      key: "que-es-plano-catastrado",
      pregunta: "¿Qué es un plano catastrado y cuándo lo necesito?",
      respuesta:
        "Es el plano oficial de una propiedad, inscrito en el Catastro Nacional, que define su forma, medidas y linderos. Se necesita para inscribir o traspasar una finca, segregar o unir lotes, solicitar un permiso de construcción, tramitar un crédito hipotecario y para cualquier gestión municipal sobre el inmueble.",
    },
    {
      key: "zonas",
      pregunta: "¿En qué zonas de Costa Rica trabajan?",
      respuesta:
        "Damos cobertura en todo el territorio nacional. Para coordinar un levantamiento fuera del Valle Central conviene avisar con algunos días de anticipación, porque la visita de campo se agenda según la ubicación y el acceso al terreno.",
    },
    {
      key: "cuanto-tarda",
      pregunta: "¿Cuánto tarda un levantamiento topográfico?",
      respuesta:
        "El trabajo de campo de un lote urbano normalmente se hace en una visita. El tiempo total hasta la entrega del plano depende del tamaño del terreno, la vegetación, la claridad de los linderos y, cuando aplica, de los plazos de revisión de la entidad donde se presenta el trámite.",
    },
    {
      key: "que-necesito",
      pregunta: "¿Qué documentos debo tener antes de contratar?",
      respuesta:
        "Ayuda mucho contar con el número de finca o el plano catastrado anterior si existe, y saber quién es el propietario registral. Si no tiene ninguno de los dos, igual podemos empezar: se hace primero el estudio registral de la propiedad.",
    },
    {
      key: "cr-sirgas",
      pregunta: "¿Qué significa que el levantamiento esté referenciado a CR-SIRGAS?",
      respuesta:
        "CR-SIRGAS (proyección CRTM05) es el sistema geodésico oficial de Costa Rica. Que un levantamiento esté referenciado a él significa que sus coordenadas son las mismas que usa el Catastro Nacional, requisito para que el plano sea inscribible y para que encaje con los planos de las propiedades vecinas.",
    },
    {
      key: "costo",
      pregunta: "¿Cómo se cotiza el servicio?",
      respuesta:
        "Cada trabajo se cotiza según el área del terreno, su ubicación, las condiciones de acceso y el tipo de entregable que necesita. Escríbanos por WhatsApp o por el formulario de contacto con esos datos y le enviamos una cotización sin costo.",
    },
  ],
} as const;

// Flujo real de trabajo (docs/REQUIREMENTS.md sección 5), mostrado como
// línea de tiempo en la sección "Proceso" del sitio público.
export const processSteps = [
  {
    key: "contacto",
    titulo: "Contacto",
    detalle: "Se registra el cliente y los datos iniciales de la solicitud.",
  },
  {
    key: "campo",
    titulo: "Campo",
    detalle: "Se agenda y ejecuta el levantamiento en sitio.",
  },
  {
    key: "calculo",
    titulo: "Cálculo",
    detalle: "La oficina procesa los datos topográficos capturados.",
  },
  {
    key: "dibujo",
    titulo: "Dibujo",
    detalle: "Se elabora el plano o entregable final.",
  },
  {
    key: "entrega",
    titulo: "Entrega",
    detalle: "Se entrega al cliente y, si aplica, se tramita ante entidades.",
  },
] as const;

export const confianzaContent = {
  heading: "Precisión con respaldo técnico",
  description:
    "Cada levantamiento se referencia al sistema geodésico oficial de Costa Rica, y a cada trámite se le da seguimiento hasta su cierre.",
  // Hechos verificables del dominio — nunca cifras o testimonios inventados
  // (ver design-system/MASTER.md).
  signals: [
    "Referenciado a CR-SIRGAS (CRTM05)",
    "Trámites ante Catastro Nacional",
    "Cobertura nacional",
  ],
} as const;

/**
 * Canales de contacto confirmados por el cliente: WhatsApp y correo. La
 * dirección física sigue pendiente (docs/REQUIREMENTS.md sección 12) — cuando
 * la confirmen, agregarla acá y en `businessInfo.address` habilita el
 * structured data de dirección, que es lo que permite aparecer en el paquete
 * local de Google Maps. No inventarla.
 */
export const contactContent = {
  heading: "Contacto",
  description:
    "Escríbanos por WhatsApp o déjenos sus datos en el formulario para agendar un levantamiento, pedir una cotización o resolver dudas.",
  whatsapp: {
    /** Número en formato E.164 sin "+", como lo requiere la URL de wa.me. */
    phoneE164: "50670563640",
    displayNumber: "+506 7056-3640",
    prefilledMessage: "Hola, quisiera más información sobre sus servicios de topografía.",
  },
  email: "iacatopografia@gmail.com",
  emailLabel: "Correo electrónico",
} as const;

export function buildWhatsAppUrl(message: string = contactContent.whatsapp.prefilledMessage) {
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${contactContent.whatsapp.phoneE164}?${params.toString()}`;
}

/** Textos del formulario público de contacto (`src/components/contact-form.tsx`). */
export const contactFormContent = {
  heading: "Solicitar una cotización",
  description:
    "Cuéntenos qué necesita y le respondemos al correo o al teléfono que nos indique.",
  nombreLabel: "Nombre completo",
  emailLabel: "Correo electrónico",
  telefonoLabel: "Teléfono",
  telefonoHint: "Opcional. Incluya el código de país si está fuera de Costa Rica.",
  servicioLabel: "Servicio de interés",
  servicioPlaceholder: "Seleccione un servicio",
  ubicacionLabel: "Ubicación del terreno",
  ubicacionHint: "Opcional. Provincia y cantón nos ayudan a estimar la visita de campo.",
  mensajeLabel: "Mensaje",
  mensajePlaceholder:
    "Describa el terreno y qué necesita: área aproximada, si tiene plano catastrado, para qué va a usar el plano…",
  submitLabel: "Enviar solicitud",
  submitPendingLabel: "Enviando…",
  successTitle: "Solicitud enviada",
  successMessage: "Gracias. Le respondemos a la brevedad por el medio que nos indicó.",
  privacyNotice: "Al enviar acepta nuestra",
  // Etiqueta del honeypot: invisible para personas, pero los lectores de
  // pantalla la anuncian, así que tiene que decir la verdad.
  honeypotLabel: "No complete este campo",
} as const;

/** Opciones del select de servicio; el `value` es lo que se guarda. */
export const servicioOptions = homeContent.services.map((s) => ({
  value: s.key,
  label: s.titulo,
}));

/**
 * Datos del negocio para el structured data JSON-LD (schema.org). Google los
 * usa para entender qué es la empresa, dónde opera y qué ofrece — es lo que
 * alimenta el panel de conocimiento y los resultados enriquecidos.
 *
 * Regla: solo hechos verificables. Un dato inventado acá (una dirección, un
 * horario, una calificación) es motivo de acción manual de Google contra el
 * sitio, además de mentirle al cliente. Lo que no esté confirmado se omite.
 */
export const businessInfo = {
  legalName: "IACA Topografía",
  /** `ProfessionalService` es el tipo de schema.org para servicios técnicos B2B/B2C. */
  schemaType: "ProfessionalService",
  areaServed: "Costa Rica",
  /** Código ISO 3166-1 alpha-2 del país de operación. */
  countryCode: "CR",
  /** Idioma en que se atiende. */
  availableLanguage: ["es"],
  /** Sin dirección física confirmada todavía — ver nota en `contactContent`. */
  address: null,
  /** Sin horario confirmado todavía. */
  openingHours: null,
} as const;

export type LegalSection = {
  key: string;
  titulo: string;
  parrafos?: readonly string[];
  lista?: readonly string[];
};

export type LegalDocument = {
  titulo: string;
  /** Meta description propia de la página (Google indexa cada una por separado). */
  descripcion: string;
  /** Fecha ISO de última actualización, mostrada al usuario y en `<time>`. */
  actualizado: string;
  intro: string;
  secciones: readonly LegalSection[];
};

/**
 * Política de privacidad. Redactada para el marco costarricense: Ley N° 8968
 * (Protección de la Persona frente al tratamiento de sus datos personales) y
 * su reglamento, cuya autoridad de control es la PRODHAB.
 *
 * IMPORTANTE: es un borrador técnicamente correcto y coherente con lo que el
 * sitio hace de verdad (el formulario de contacto y nada más), pero no
 * sustituye la revisión de un abogado. Antes de publicar en producción hay que
 * validarlo, y si se agregan analíticas, píxeles o cualquier tercero que
 * reciba datos, esta política debe actualizarse en el mismo cambio.
 */
export const privacyPolicy: LegalDocument = {
  titulo: "Política de privacidad",
  descripcion:
    "Cómo IACA Topografía recolecta, usa y protege los datos personales que usted nos proporciona, conforme a la Ley N° 8968 de Costa Rica.",
  actualizado: "2026-09-21",
  intro:
    "En IACA Topografía tratamos sus datos personales conforme a la Ley N° 8968, Protección de la Persona frente al tratamiento de sus datos personales, y su reglamento. Esta política explica qué datos recolectamos, para qué los usamos y cuáles son sus derechos sobre ellos.",
  secciones: [
    {
      key: "responsable",
      titulo: "1. Responsable del tratamiento",
      parrafos: [
        `El responsable de la base de datos es ${businessInfo.legalName}. Para cualquier consulta sobre el tratamiento de sus datos personales puede escribirnos a ${contactContent.email} o al WhatsApp ${contactContent.whatsapp.displayNumber}.`,
      ],
    },
    {
      key: "datos",
      titulo: "2. Datos que recolectamos",
      parrafos: [
        "Solo recolectamos los datos que usted nos entrega voluntariamente al contactarnos o al contratar un servicio. No compramos bases de datos ni obtenemos sus datos de terceros.",
      ],
      lista: [
        "Formulario de contacto del sitio: nombre, correo electrónico y, si usted lo indica, teléfono, ubicación del terreno y el contenido de su mensaje.",
        "Contratación de un servicio: además de lo anterior, los datos necesarios para ejecutar y facturar el trabajo, como identificación, número de finca y ubicación exacta de la propiedad.",
        "Datos técnicos de seguridad: al enviar el formulario guardamos una versión cifrada e irreversible de su dirección IP, únicamente para limitar envíos automatizados y abuso del formulario. No permite reconstruir su IP original ni identificarlo.",
      ],
    },
    {
      key: "finalidad",
      titulo: "3. Para qué usamos sus datos",
      lista: [
        "Responder su consulta y enviarle la cotización que solicitó.",
        "Prestar el servicio topográfico contratado y darle seguimiento.",
        "Cumplir obligaciones legales, contables y tributarias aplicables en Costa Rica.",
        "Proteger el formulario de contacto frente a envíos automatizados.",
      ],
      parrafos: [
        "No usamos sus datos para publicidad ni le enviamos comunicaciones comerciales que usted no haya solicitado. No tomamos decisiones automatizadas sobre usted.",
      ],
    },
    {
      key: "fundamento",
      titulo: "4. Fundamento del tratamiento",
      parrafos: [
        "Tratamos sus datos con base en el consentimiento informado que usted otorga al enviarnos el formulario, en la ejecución del contrato de servicios cuando nos contrata, y en el cumplimiento de obligaciones legales cuando corresponde.",
      ],
    },
    {
      key: "conservacion",
      titulo: "5. Cuánto tiempo los conservamos",
      parrafos: [
        "Las consultas que no derivan en una contratación se conservan mientras sean útiles para atenderle y luego se eliminan. Los datos de proyectos contratados se conservan por el plazo que exige la normativa contable, tributaria y catastral aplicable, ya que el expediente técnico de un plano debe poder ser consultado con posterioridad.",
      ],
    },
    {
      key: "terceros",
      titulo: "6. Con quién los compartimos",
      parrafos: [
        "No vendemos, alquilamos ni cedemos sus datos personales a terceros con fines comerciales.",
      ],
      lista: [
        "Entidades públicas: cuando el servicio contratado lo requiere, presentamos la información necesaria ante el Catastro Nacional, municipalidades u otras entidades competentes. Sin esto no es posible tramitar un plano.",
        "Proveedores de infraestructura: usamos servicios de alojamiento y base de datos que procesan los datos por cuenta nuestra, bajo obligación de confidencialidad y sin autorización para usarlos con fines propios.",
        "Autoridad competente: cuando exista una orden fundamentada de autoridad judicial o administrativa.",
      ],
    },
    {
      key: "derechos",
      titulo: "7. Sus derechos",
      parrafos: [
        `La Ley N° 8968 le garantiza los derechos de acceso, rectificación, actualización, eliminación y oposición sobre sus datos personales, así como el derecho a revocar su consentimiento. Para ejercerlos escríbanos a ${contactContent.email} indicando cuál derecho desea ejercer; le responderemos dentro de los plazos que fija la normativa.`,
        "Si considera que no atendimos su solicitud correctamente, puede presentar su reclamo ante la Agencia de Protección de Datos de los Habitantes (PRODHAB).",
      ],
    },
    {
      key: "seguridad",
      titulo: "8. Seguridad de la información",
      parrafos: [
        "Todo el sitio se sirve cifrado mediante HTTPS. La información se almacena con acceso restringido por roles, de modo que cada persona de nuestro equipo solo accede a los datos que necesita para su trabajo. Ningún archivo de proyecto es de acceso público: se entrega mediante enlaces temporales. Aun así, ningún sistema es infalible; si ocurriera un incidente que afecte sus datos, se lo comunicaremos conforme a la normativa.",
      ],
    },
    {
      key: "cookies",
      titulo: "9. Cookies",
      parrafos: [
        "El sitio público no usa cookies de publicidad, analítica ni seguimiento de terceros. El área privada de la plataforma usa únicamente cookies técnicas indispensables para mantener su sesión abierta después de iniciarla; sin ellas no es posible autenticarse.",
      ],
    },
    {
      key: "menores",
      titulo: "10. Menores de edad",
      parrafos: [
        "Nuestros servicios están dirigidos a personas mayores de edad con capacidad para contratar. No recolectamos intencionalmente datos de personas menores de edad.",
      ],
    },
    {
      key: "cambios",
      titulo: "11. Cambios a esta política",
      parrafos: [
        "Si modificamos esta política, publicaremos la nueva versión en esta misma dirección y actualizaremos la fecha que aparece al inicio. Le recomendamos revisarla periódicamente.",
      ],
    },
  ],
};

/**
 * Términos y condiciones del servicio para clientes. Mismo criterio que la
 * política de privacidad: borrador coherente con el negocio real, pendiente de
 * revisión legal antes de producción.
 */
export const termsAndConditions: LegalDocument = {
  titulo: "Términos y condiciones",
  descripcion:
    "Condiciones bajo las cuales IACA Topografía presta sus servicios de topografía, agrimensura y trámite de planos en Costa Rica.",
  actualizado: "2026-09-21",
  intro:
    `Estos términos regulan la relación entre ${businessInfo.legalName} y sus clientes, tanto en el uso de este sitio web como en la contratación de nuestros servicios de topografía. Al solicitar una cotización o contratar un servicio, usted acepta lo aquí establecido.`,
  secciones: [
    {
      key: "servicios",
      titulo: "1. Servicios que prestamos",
      parrafos: [
        "Prestamos servicios técnicos de topografía en Costa Rica: levantamientos topográficos, agrimensura y amojonamiento, elaboración de planos con curvas de nivel, planos catastrados y gestión de trámites ante el Catastro Nacional, municipalidades y otras entidades.",
        "El alcance concreto de cada trabajo, sus entregables y su precio son los que se detallen en la cotización aceptada. Lo que no esté expresamente incluido en esa cotización no forma parte del servicio.",
      ],
    },
    {
      key: "cotizaciones",
      titulo: "2. Cotizaciones",
      lista: [
        "Las cotizaciones se elaboran con base en la información que el cliente proporciona sobre el terreno (área, ubicación, condiciones de acceso y finalidad del trabajo).",
        "Si al llegar al sitio las condiciones reales difieren de forma significativa de lo informado —mayor área, vegetación densa, linderos en disputa, acceso limitado— se comunicará al cliente antes de continuar y, si corresponde, se ajustará la cotización. No se ejecuta trabajo adicional sin su autorización.",
        "Los montos cotizados tienen una vigencia limitada, indicada en la propia cotización.",
        "Salvo que la cotización lo indique expresamente, no incluye los derechos, timbres ni tasas que cobren las entidades públicas donde se presenta el trámite.",
      ],
    },
    {
      key: "obligaciones-cliente",
      titulo: "3. Obligaciones del cliente",
      parrafos: [
        "Para que podamos ejecutar el trabajo correctamente, el cliente se compromete a:",
      ],
      lista: [
        "Entregar información veraz y completa sobre la propiedad y su titularidad, así como los documentos disponibles (plano anterior, número de finca, escrituras).",
        "Garantizar el acceso al terreno en la fecha acordada para la visita de campo, incluyendo los permisos que hagan falta para ingresar.",
        "Informar sobre conflictos de linderos, servidumbres, litigios o cualquier circunstancia conocida que pueda afectar el trabajo.",
        "Responder en un plazo razonable las consultas necesarias para avanzar con el proyecto o el trámite.",
      ],
    },
    {
      key: "plazos",
      titulo: "4. Plazos",
      parrafos: [
        "Los plazos que indicamos son estimados de buena fe con base en la experiencia en trabajos similares. No incluyen ni podemos garantizar los tiempos de revisión, prevención o aprobación que dependen de entidades públicas, ni las demoras causadas por condiciones climáticas adversas, imposibilidad de acceso al terreno, información pendiente de parte del cliente o conflictos de linderos que surjan durante la medición.",
      ],
    },
    {
      key: "pagos",
      titulo: "5. Pagos",
      lista: [
        "La forma de pago, el adelanto y el saldo se establecen en la cotización aceptada.",
        "Los entregables finales se liberan una vez cubierto el monto acordado.",
        "El atraso en un pago puede suspender el avance del trabajo y del trámite, previa comunicación al cliente.",
        "Los pagos de derechos ante entidades públicas los asume el cliente, salvo pacto expreso en contrario.",
      ],
    },
    {
      key: "entregables",
      titulo: "6. Entregables y propiedad intelectual",
      parrafos: [
        "Una vez pagado el servicio, el cliente puede usar los entregables libremente para la finalidad para la que fueron contratados. Nos reservamos la autoría técnica del trabajo, conforme a la normativa profesional aplicable.",
        "Los entregables corresponden a la situación del terreno en la fecha del levantamiento y a la finalidad indicada en la cotización. Usarlos con otro propósito, modificarlos sin nuestra intervención o reutilizarlos después de que el terreno haya cambiado es responsabilidad exclusiva de quien lo haga.",
      ],
    },
    {
      key: "responsabilidad",
      titulo: "7. Responsabilidad",
      parrafos: [
        "Respondemos por la correcta ejecución técnica del trabajo contratado conforme a la normativa vigente y a las reglas del ejercicio profesional. Si se detecta un error atribuible a nosotros, lo corregimos sin costo adicional para el cliente.",
        "No respondemos por las consecuencias de información falsa, incompleta o desactualizada suministrada por el cliente; por las decisiones que adopten las entidades públicas donde se presenta un trámite; por conflictos de linderos entre el cliente y terceros, cuya resolución corresponde a la vía judicial o administrativa; ni por el uso de los entregables para fines distintos a los contratados.",
      ],
    },
    {
      key: "confidencialidad",
      titulo: "8. Confidencialidad y datos personales",
      parrafos: [
        `Tratamos la información del cliente y de sus propiedades como confidencial, y sus datos personales conforme a nuestra Política de privacidad y a la Ley N° 8968. La excepción es la información que necesariamente debe presentarse ante las entidades públicas para tramitar el servicio contratado.`,
      ],
    },
    {
      key: "cancelacion",
      titulo: "9. Cancelación",
      parrafos: [
        "El cliente puede cancelar el servicio en cualquier momento comunicándolo por escrito. En ese caso se liquidará el trabajo efectivamente realizado hasta la fecha, incluyendo las visitas de campo ya ejecutadas y los derechos ya pagados ante entidades públicas, que no son reembolsables.",
      ],
    },
    {
      key: "sitio-web",
      titulo: "10. Uso de este sitio web",
      parrafos: [
        "La información de este sitio es de carácter general e informativo y no constituye una cotización ni asesoría técnica para un caso concreto. El área privada de la plataforma es de acceso restringido: quien recibe credenciales es responsable de su confidencialidad y del uso que se haga con ellas, y debe informarnos de inmediato si sospecha un acceso no autorizado.",
        "Está prohibido usar el formulario de contacto para enviar publicidad no solicitada, contenido ilícito o envíos automatizados masivos.",
      ],
    },
    {
      key: "ley-aplicable",
      titulo: "11. Ley aplicable",
      parrafos: [
        "Estos términos se rigen por la legislación de la República de Costa Rica. Cualquier controversia se someterá a los tribunales costarricenses competentes, sin perjuicio de que las partes puedan intentar primero una solución directa.",
      ],
    },
    {
      key: "cambios",
      titulo: "12. Cambios a estos términos",
      parrafos: [
        "Podemos actualizar estos términos; la versión vigente es siempre la publicada en esta dirección, con su fecha de actualización. Los cambios no afectan las condiciones de un servicio ya contratado, que se rigen por la cotización aceptada en su momento.",
      ],
    },
    {
      key: "contacto",
      titulo: "13. Contacto",
      parrafos: [
        `Para consultas sobre estos términos escríbanos a ${contactContent.email} o al WhatsApp ${contactContent.whatsapp.displayNumber}.`,
      ],
    },
  ],
};

/** Índice de páginas legales por slug — lo consume `legalNav` y el sitemap. */
export const legalDocuments: Record<string, LegalDocument> = {
  privacidad: privacyPolicy,
  terminos: termsAndConditions,
};

export const footerContent = {
  tagline:
    "Levantamientos topográficos, agrimensura, planos catastrados y trámites en todo Costa Rica.",
  contactHeading: "Contacto",
  legalHeading: "Legal",
  siteHeading: "Sitio",
  rightsText: (year: number) =>
    `© ${year} ${businessInfo.legalName}. Todos los derechos reservados.`,
} as const;

export const notFoundContent = {
  title: "Página no encontrada",
  description:
    "El enlace no existe o el recurso fue movido. Puede volver al inicio o ir directo a una de estas secciones.",
  homeLabel: "Volver al inicio",
  suggestionsHeading: "Enlaces útiles",
} as const;

export const authContent = {
  title: `Acceder ${siteConfig.name}`,
  description: "Ingresa con tu correo y contraseña para acceder al panel de gestión.",
  emailLabel: "Correo electrónico",
  passwordLabel: "Contraseña",
  showPasswordLabel: "Mostrar contraseña",
  hidePasswordLabel: "Ocultar contraseña",
  submitLabel: "Iniciar sesión",
  submitPendingLabel: "Ingresando…",
  // Mensaje único para credenciales inválidas o error inesperado: no debe
  // revelar si el correo existe en el sistema (ver CLAUDE.md, regla de seguridad).
  genericErrorMessage: "Correo o contraseña incorrectos.",
  signOutLabel: "Cerrar sesión",
} as const;

/**
 * Pantalla de captura de bitácora sin conexión (`/campo`, ver
 * src/app/campo/page.tsx). Abre aunque no haya señal gracias al service
 * worker (public/sw.js); por eso no está en `dashboardNav`: no pasa por el
 * proxy de sesión ni por el layout del panel.
 */
export const offlineCaptureContent = {
  title: "Captura de campo",
  description:
    "Registrá la bitácora aunque no haya señal. Se guarda en este dispositivo y se envía sola cuando vuelve la conexión.",
  loading: "Cargando…",
  noSessionTitle: "Iniciá sesión con señal primero",
  noSessionDescription:
    "Para capturar sin conexión, este dispositivo tiene que haber abierto el panel con señal al menos una vez.",
  noSessionAction: "Iniciar sesión",
  noProyectosTitle: "No hay proyectos guardados en este dispositivo",
  noProyectosDescription: "Abrí la Bitácora con señal una vez para descargarlos.",
  userLabel: "Registrando como",
  offlineLabel: "Sin conexión",
  onlineLabel: "Con conexión",
  panelLabel: "Ir al panel",
} as const;

/**
 * Aviso para instalar la app en el teléfono (src/components/offline/install-prompt.tsx).
 * Instalada, abre sin señal desde la pantalla de inicio, y iOS no borra la
 * cola de entradas pendientes tras 7 días sin uso (sí lo hace con un sitio
 * abierto en Safari).
 */
export const installPromptContent = {
  title: "Instalá la app en tu teléfono",
  description:
    "Abre sin señal desde la pantalla de inicio y el teléfono no borra las entradas que esperan sincronizarse.",
  iosInstructions: "En Safari, tocá Compartir y después “Agregar a inicio”.",
  installLabel: "Instalar",
  dismissLabel: "Ahora no",
} as const;
