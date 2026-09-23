import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import {
  buildWhatsAppUrl,
  businessInfo,
  contactContent,
  footerContent,
  legalNav,
  publicNav,
  siteConfig,
} from "@/config/site";

/**
 * Footer del sitio público, compartido por la home y las páginas legales.
 *
 * Además de ser el lugar donde la gente busca el contacto, cumple dos cosas
 * que los buscadores evalúan: enlaces a las políticas legales desde todas las
 * páginas (señal de confianza) y enlaces internos a las secciones, que ayudan
 * al rastreo. El nombre del negocio va en texto, no en una imagen.
 */
export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper" data-cy="site-footer">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <span className="font-heading text-h3 font-semibold">{businessInfo.legalName}</span>
            <p className="mt-3 max-w-sm text-small text-paper/75">{footerContent.tagline}</p>
          </div>

          <nav aria-labelledby="footer-sitio">
            <h2
              id="footer-sitio"
              className="text-small font-semibold uppercase tracking-[0.14em] text-paper/60"
            >
              {footerContent.siteHeading}
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {publicNav.map((item) => (
                <li key={item.key}>
                  <Link
                    href={`/${item.href}`}
                    data-cy={`footer-${item.key}`}
                    className="text-small text-paper/75 transition-colors hover:text-paper"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-small font-semibold uppercase tracking-[0.14em] text-paper/60">
              {footerContent.contactHeading}
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              <li>
                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cy="footer-whatsapp"
                  className="inline-flex items-center gap-2 text-small text-paper/75 transition-colors hover:text-paper"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {contactContent.whatsapp.displayNumber}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contactContent.email}`}
                  data-cy="footer-email"
                  className="inline-flex items-center gap-2 break-all text-small text-paper/75 transition-colors hover:text-paper"
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {contactContent.email}
                </a>
              </li>
            </ul>

            <h2 className="mt-8 text-small font-semibold uppercase tracking-[0.14em] text-paper/60">
              {footerContent.legalHeading}
            </h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {legalNav.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    data-cy={`footer-${item.key}`}
                    className="text-small text-paper/75 transition-colors hover:text-paper"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-paper/15 pt-6">
          <p className="text-small text-paper/60">
            {footerContent.rightsText(new Date().getFullYear())}
          </p>
          <p className="mt-1 text-small text-paper/45">{siteConfig.fullName}</p>
        </div>
      </div>
    </footer>
  );
}
