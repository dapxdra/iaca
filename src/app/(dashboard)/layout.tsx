import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { siteConfig } from "@/config/site";
import { DashboardSidebar } from "./_components/sidebar";

/**
 * `noindex, nofollow` para todo el panel. Se hereda a cada página de abajo, así
 * que una pantalla nueva queda excluida sin que haya que acordarse.
 *
 * Es una segunda capa sobre el `Disallow` de robots.txt: `Disallow` evita el
 * rastreo, pero una URL enlazada desde otro sitio puede indexarse igual sin
 * haber sido rastreada. `noindex` es lo que efectivamente la saca del índice.
 * Ninguno de los dos es control de acceso — eso es la sesión y RLS.
 */
export const metadata: Metadata = {
  title: { default: "Panel", template: `%s | Panel ${siteConfig.name}` },
  description: siteConfig.appDescription,
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Layout del área interna. La redirección a /login la hace el proxy de la raíz
 * (src/proxy.ts); `requireProfile()` acá es la segunda capa de defensa y
 * además provee el nombre/rol para la barra lateral.
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
    // Columna en móvil (barra superior arriba, contenido debajo) y fila en
    // escritorio (barra lateral fija a la izquierda) — ver DashboardSidebar.
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      <DashboardSidebar fullName={profile.fullName} role={profile.role} />
      <main id="contenido" className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
