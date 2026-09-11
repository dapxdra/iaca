import { requireProfile } from "@/lib/auth";
import { DashboardSidebar } from "./_components/sidebar";

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
    <div className="flex min-h-svh bg-background">
      <DashboardSidebar fullName={profile.fullName} role={profile.role} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
