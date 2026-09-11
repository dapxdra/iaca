"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileStack,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Receipt,
  Users,
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

export function DashboardSidebar({
  fullName,
  role,
}: {
  fullName: string;
  role: UserRole;
}) {
  const pathname = usePathname();
  const nav = dashboardNavForRole(role);

  return (
    <aside className="sticky top-0 flex h-svh w-60 shrink-0 flex-col border-r border-ink/60 bg-ink p-4 text-paper">
      <Link
        href={defaultRouteForRole(role)}
        data-cy="site-name"
        className="mb-6 flex items-center gap-2 rounded-md px-2 py-1 text-h3 font-semibold tracking-tight transition-colors hover:text-paper/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
      >
        {siteConfig.name}
      </Link>

      <nav data-cy="dashboard-nav" className="flex flex-1 flex-col gap-0.5">
        {nav.map((item) => {
          const Icon = ICONS[item.key] ?? LayoutGrid;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.key}
              href={item.href}
              data-cy={`nav-${item.key}`}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-small font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40 ${
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
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/20 text-[0.8125rem] font-semibold text-paper">
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
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-paper/55 transition-colors hover:bg-white/10 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
