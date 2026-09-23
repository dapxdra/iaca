"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileStack,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Menu,
  Receipt,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { authContent, dashboardNavForRole, defaultRouteForRole, siteConfig, type UserRole } from "@/config/site";
import { signOutAction } from "../actions";

const ICONS: Record<string, LucideIcon> = {
  proyectos: FolderKanban,
  cobros: Receipt,
  clientes: Users,
  bitacora: ClipboardList,
  tramites: FileStack,
  kpi: LayoutGrid,
  "mis-proyectos": FolderKanban,
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  oficina: "Oficina",
  campo: "Campo",
  cliente: "Cliente",
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Contenido de la barra lateral: marca, navegación por rol y tarjeta de
 * usuario. Se renderiza dos veces —en el panel fijo de escritorio y en el
 * cajón de móvil— para no duplicar el marcado en dos lugares que luego se
 * desincronizan.
 */
function SidebarContent({
  fullName,
  role,
  onNavigate,
}: {
  fullName: string;
  role: UserRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const nav = dashboardNavForRole(role);

  return (
    <>
      <Link
        href={defaultRouteForRole(role)}
        data-cy="site-name"
        onClick={onNavigate}
        className="mb-6 flex items-center gap-2 rounded-md px-2 py-1 text-h3 font-semibold tracking-tight transition-colors hover:text-paper/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
      >
        {siteConfig.name}
      </Link>

      <nav data-cy="dashboard-nav" className="flex flex-1 flex-col gap-0.5">
        {nav.map((item) => {
          const Icon = ICONS[item.key] ?? LayoutGrid;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.key}
              href={item.href}
              data-cy={`nav-${item.key}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              // py-2.5 en móvil deja el área táctil en ~44px; en escritorio
              // vuelve a py-2, que es la densidad del diseño original.
              className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2.5 text-small font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40 lg:py-2 ${
                active
                  ? "bg-white/10 text-paper"
                  : "text-paper/65 hover:bg-white/5 hover:text-paper"
              }`}
            >
              <span
                className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-transform duration-200 ${
                  active ? "scale-y-100" : "scale-y-0"
                }`}
                aria-hidden="true"
              />
              <Icon
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                  active ? "" : "group-hover:translate-x-0.5"
                }`}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/20 text-[0.8125rem] font-semibold text-paper"
        >
          {initials(fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <p data-cy="current-user" className="truncate text-small font-semibold text-paper">
            {fullName}
          </p>
          <p className="text-[0.8125rem] text-paper/50">{ROLE_LABEL[role] ?? role}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            data-cy="sign-out"
            aria-label={authContent.signOutLabel}
            title={authContent.signOutLabel}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-md text-paper/55 transition-colors hover:bg-white/10 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </>
  );
}

/**
 * Navegación del panel, con dos presentaciones según el ancho:
 *
 *   - Escritorio (lg+): panel fijo de 240px, siempre visible.
 *   - Móvil: barra superior con botón de menú y un cajón que entra desde la
 *     izquierda. Antes la barra de 240px se mostraba también en el teléfono y
 *     dejaba ~120px de ancho para el contenido, inutilizable justo para el rol
 *     `campo`, que registra la bitácora desde el celular en el sitio.
 *
 * El cajón se cierra al navegar y con la tecla Escape, y mientras está abierto
 * se bloquea el desplazamiento del fondo.
 */
export function DashboardSidebar({
  fullName,
  role,
}: {
  fullName: string;
  role: UserRole;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // El cierre al navegar lo hace `onNavigate` en cada enlace, no un efecto que
  // observe el pathname: cerrar es la consecuencia directa del clic, así que
  // corresponde al manejador del evento.

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    // Evita que el fondo se desplace detrás del cajón.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      {/* Barra superior — solo móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink/60 bg-ink px-4 py-3 text-paper lg:hidden">
        <Link
          href={defaultRouteForRole(role)}
          className="rounded-md px-1 text-h3 font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
        >
          {siteConfig.name}
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          data-cy="dashboard-nav-toggle"
          aria-label="Abrir menú de navegación"
          aria-expanded={isOpen}
          aria-controls="dashboard-drawer"
          className="-mr-2 grid h-11 w-11 cursor-pointer place-items-center rounded-md text-paper transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </header>

      {/* Cajón — solo móvil */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" data-cy="dashboard-drawer-overlay">
          <button
            type="button"
            aria-label="Cerrar menú de navegación"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-ink/70 animate-fade-in"
          />
          <aside
            id="dashboard-drawer"
            // `dialog` + `aria-modal` le dice al lector de pantalla que el
            // contenido de atrás está inactivo mientras el cajón está abierto.
            role="dialog"
            aria-modal="true"
            aria-label="Navegación del panel"
            className="animate-slide-in relative flex h-full w-[min(17rem,85vw)] flex-col border-r border-ink/60 bg-ink p-4 text-paper shadow-lg"
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              data-cy="dashboard-drawer-close"
              aria-label="Cerrar menú de navegación"
              className="absolute right-3 top-3 grid h-9 w-9 cursor-pointer place-items-center rounded-md text-paper/70 transition-colors hover:bg-white/10 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarContent
              fullName={fullName}
              role={role}
              onNavigate={() => setIsOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Panel fijo — solo escritorio */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-ink/60 bg-ink p-4 text-paper lg:flex">
        <SidebarContent fullName={fullName} role={role} />
      </aside>
    </>
  );
}
