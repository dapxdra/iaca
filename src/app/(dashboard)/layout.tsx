import Link from "next/link";
import { authContent, dashboardNav, siteConfig } from "@/config/site";
import { signOutAction } from "./actions";

/**
 * Layout del área interna. La protección de sesión y redirección a /login
 * ocurre en el middleware de la raíz (src/lib/supabase/middleware.ts), no
 * aquí — así todas las rutas del dashboard quedan cubiertas sin repetir la
 * verificación en cada page.tsx.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-black/10 p-4 dark:border-white/10">
        <div data-cy="site-name" className="mb-6 text-lg font-semibold">
          {siteConfig.name}
        </div>
        <nav data-cy="dashboard-nav" className="flex flex-1 flex-col gap-1">
          {dashboardNav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              data-cy={`nav-${item.key}`}
              className="rounded-md px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOutAction}>
          <button
            type="submit"
            data-cy="sign-out"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground/70 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {authContent.signOutLabel}
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
