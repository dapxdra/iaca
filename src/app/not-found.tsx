import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, MessageCircle } from "lucide-react";
import {
  buildWhatsAppUrl,
  contactContent,
  legalNav,
  notFoundContent,
  publicNav,
} from "@/config/site";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

/**
 * Página 404 propia.
 *
 * No declara `robots`: Next ya emite `noindex` en esta página y responde con el
 * código 404 real, así que agregarlo acá solo duplicaría la etiqueta (y los
 * auditores de SEO reportan las etiquetas `robots` repetidas). Lo que sí aporta
 * es el `title`, para que la pestaña y el historial no queden sin nombre.
 *
 * El valor de tener una 404 propia es no dejar al visitante sin salida: lleva
 * la navegación, el footer y enlaces a las secciones reales, de modo que un
 * enlace roto no se convierte en una visita perdida.
 */
export const metadata: Metadata = {
  title: notFoundContent.title,
};

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteNav />

      <main id="contenido" className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-2xl px-6 py-20" data-cy="not-found">
          <span className="grid h-14 w-14 place-items-center rounded-xl border border-border bg-surface-raised text-muted-foreground shadow-sm">
            <Compass className="h-7 w-7" aria-hidden="true" />
          </span>

          <p className="mt-8 text-small font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Error 404
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold text-foreground md:text-h2">
            {notFoundContent.title}
          </h1>
          <p className="mt-4 text-pretty text-body text-muted-foreground">
            {notFoundContent.description}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              data-cy="not-found-home"
              className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-small font-semibold text-primary-foreground shadow-xs transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]"
            >
              {notFoundContent.homeLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              data-cy="not-found-whatsapp"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-6 py-3 text-small font-semibold text-foreground shadow-xs transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-border-strong hover:shadow-sm focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {contactContent.whatsapp.displayNumber}
            </a>
          </div>

          <nav className="mt-14 border-t border-border pt-8" aria-labelledby="not-found-links">
            <h2
              id="not-found-links"
              className="text-small font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              {notFoundContent.suggestionsHeading}
            </h2>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {[...publicNav, ...legalNav].map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href.startsWith("#") ? `/${item.href}` : item.href}
                    data-cy={`not-found-link-${item.key}`}
                    className="group inline-flex items-center gap-2 text-body text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-accent transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
