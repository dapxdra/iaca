import Link from "next/link";
import { authContent, dashboardNav, siteConfig } from "@/config/site";
import { signOutAction } from "./actions";

/**
 * Layout del área interna. La protección de sesión y redirección a /login
 * ocurre en el proxy de la raíz (src/proxy.ts), no aquí — así todas las
 * rutas del dashboard quedan cubiertas sin repetir la verificación en cada
 * page.tsx.
 *
 * Sidebar en tinta (--color-ink) sobre contenido en papel (--color-paper):
 * separa visualmente "herramienta de trabajo" de "documento/dato", patrón
 * de dashboards densos (ver design-system/MASTER.md).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
        <form action={signOutAction}>
          <button
            type="submit"
            data-cy="sign-out"
            className="w-full cursor-pointer px-3 py-2 text-left text-small font-medium text-paper/60 transition-colors duration-200 hover:bg-white/5 hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          >
            {authContent.signOutLabel}
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
