/**
 * Configuración central de textos y navegación del sitio.
 *
 * Todo string visible al usuario (nombre de la app, títulos, menús, copys)
 * vive aquí. Los componentes solo importan y renderizan — para renombrar la
 * app o cambiar un texto no hace falta tocar ningún componente.
 */

export const siteConfig = {
  name: "IACA",
  fullName: "IACA — Servicios de Topografía",
  description:
    "Plataforma de gestión de proyectos, campo, cálculo, dibujo y entrega para servicios de topografía en Costa Rica.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

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
  { key: "contacto", href: "#contacto", label: "Contacto" },
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
  loginLabel: "Acceso interno",
  contactCtaLabel: "Contáctanos",
  heroTitle: "Servicios de topografía en Costa Rica",
  heroSubtitle:
    "Levantamientos, cálculo, dibujo y trámites topográficos, referenciados al sistema oficial CR-SIRGAS.",
  footerText: `${siteConfig.name} — Servicios de topografía`,
  services: [
    {
      key: "levantamientos",
      titulo: "Levantamientos topográficos",
      detalle:
        "Captura de puntos en campo con equipo especializado, referenciados a CR-SIRGAS (CRTM05).",
    },
    {
      key: "agrimensura",
      titulo: "Agrimensura y amojonamiento",
      detalle:
        "Medición, cálculo y demarcación de linderos según normativa del Catastro Nacional.",
    },
    {
      key: "curvas-nivel",
      titulo: "Curvas de nivel y modelado de terreno",
      detalle: "Procesamiento de datos de campo para planos topográficos y estudios de sitio.",
    },
    {
      key: "tramites",
      titulo: "Trámites ante entidades",
      detalle:
        "Gestión y seguimiento de planos y documentos ante Catastro Nacional, municipalidades y otras entidades.",
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
    "Cada levantamiento se referencia al sistema geodésico oficial de Costa Rica, y cada trámite se le da seguimiento hasta su cierre.",
  // Hechos verificables del dominio — nunca cifras o testimonios inventados
  // (ver design-system/MASTER.md).
  signals: [
    "Referenciado a CR-SIRGAS (CRTM05)",
    "Trámites ante Catastro Nacional",
    "Cobertura nacional",
  ],
} as const;

// Único canal de contacto confirmado por el cliente (WhatsApp). No agregar
// correo/dirección física aquí hasta que el cliente los confirme — ver
// docs/REQUIREMENTS.md sección 12.
export const contactContent = {
  heading: "Contacto",
  description: "Escríbenos por WhatsApp para agendar un levantamiento o resolver dudas.",
  whatsapp: {
    /** Número en formato E.164 sin "+", como lo requiere la URL de wa.me. */
    phoneE164: "50670563640",
    displayNumber: "+506 7056-3640",
    prefilledMessage: "Hola, quisiera más información sobre sus servicios de topografía.",
  },
} as const;

export function buildWhatsAppUrl(message: string = contactContent.whatsapp.prefilledMessage) {
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${contactContent.whatsapp.phoneE164}?${params.toString()}`;
}

export const authContent = {
  title: `Acceso interno ${siteConfig.name}`,
  description: "Ingresa con tu correo y contraseña para acceder al panel de gestión.",
  emailLabel: "Correo electrónico",
  passwordLabel: "Contraseña",
  submitLabel: "Iniciar sesión",
  submitPendingLabel: "Ingresando…",
  // Mensaje único para credenciales inválidas o error inesperado: no debe
  // revelar si el correo existe en el sistema (ver CLAUDE.md, regla de seguridad).
  genericErrorMessage: "Correo o contraseña incorrectos.",
  signOutLabel: "Cerrar sesión",
} as const;
