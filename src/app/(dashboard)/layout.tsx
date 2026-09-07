import Link from "next/link";

const nav = [
  { href: "/proyectos", label: "Proyectos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/bitacora", label: "Bitácora de campo" },
  { href: "/tramites", label: "Trámites" },
  { href: "/kpi", label: "Reportes KPI" },
];

/**
 * Layout del área interna (requiere sesión). La verificación de sesión y
 * redirección a /login se agrega con el middleware de Supabase Auth — ver
 * docs/REQUIREMENTS.md, sección "Autenticación y roles".
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-black/10 p-4 dark:border-white/10">
        <div className="mb-6 text-lg font-semibold">IACA</div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
