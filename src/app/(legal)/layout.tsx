import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

/**
 * Layout de las páginas legales. Reutiliza la navegación y el footer del sitio
 * público para que no se sientan como páginas sueltas — y para que desde ellas
 * se pueda volver a cualquier sección.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteNav />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
