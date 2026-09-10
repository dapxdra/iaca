import Link from "next/link";
import { authContent, dashboardNav, siteConfig } from "@/config/site";
import { requireProfile } from "@/lib/auth";
import { signOutAction } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  oficina: "Oficina",
  campo: "Campo",
  cliente: "Cliente",
};

/**
 * Layout del área interna. La redirección a /login la hace el proxy de la raíz
 * (src/proxy.ts); `requireProfile()` acá es la segunda capa de defensa y
 * además provee el nombre/rol del usuario para la barra lateral.
 *
 * Sidebar en tinta sobre contenido en papel (design-system/MASTER.md).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-56 shrink-0 flex-col bg-ink p-4 text-paper">
        <div data-cy="site-name" className="mb-6 text-h3 font-semibold">
          {siteConfig.name}
        </div>
        <nav data-cy="dashboard-nav" className="flex flex-1 flex-col gap-1">
          {dashboardNav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              data-cy={`nav-${item.key}`}
              className="cursor-pointer px-3 py-2 text-small font-medium text-paper/80 transition-colors duration-200 hover:bg-white/5 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-4 border-t border-white/10 pt-4">
          <p data-cy="current-user" className="text-small font-medium text-paper">
            {profile.fullName}
          </p>
          <p className="text-small text-paper/50">{ROLE_LABEL[profile.role] ?? profile.role}</p>
          <form action={signOutAction} className="mt-2">
            <button
              type="submit"
              data-cy="sign-out"
              className="w-full cursor-pointer px-0 py-1 text-left text-small font-medium text-paper/60 transition-colors duration-200 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            >
              {authContent.signOutLabel}
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
