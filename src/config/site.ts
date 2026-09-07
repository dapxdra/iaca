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

// El primer elemento es el destino por defecto tras iniciar sesión y al
// visitar /login ya autenticado (ver src/lib/supabase/middleware.ts).
export const dashboardNav: DashboardNavItem[] = [
  { key: "proyectos", href: "/proyectos", label: "Proyectos" },
  { key: "clientes", href: "/clientes", label: "Clientes" },
  { key: "bitacora", href: "/bitacora", label: "Bitácora de campo" },
  { key: "tramites", href: "/tramites", label: "Trámites" },
  { key: "kpi", href: "/kpi", label: "Reportes KPI" },
];

export const defaultDashboardRoute = dashboardNav[0].href;

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
};

export const homeContent = {
  ctaLabel: "Acceso interno",
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
