"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { homeContent, publicNav, siteConfig } from "@/config/site";

export function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span data-cy="site-name" className="text-lg font-semibold tracking-tight">
          {siteConfig.name}
        </span>

        {/* Enlaces de sección: ocultos en móvil, el botón hamburguesa los reemplaza. */}
        <ul data-cy="nav-links-desktop" className="hidden items-center gap-8 md:flex">
          {publicNav.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                data-cy={`nav-${item.key}`}
                className="cursor-pointer text-small font-medium text-foreground transition-colors duration-200 hover:text-primary"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/login"
            data-cy="nav-login"
            className="cursor-pointer text-small font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            {homeContent.loginLabel}
          </Link>
          <a
            href="#contacto"
            data-cy="nav-contact-cta"
            className="cursor-pointer bg-primary px-5 py-2.5 text-small font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {homeContent.contactCtaLabel}
          </a>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          data-cy="nav-mobile-toggle"
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isOpen}
          className="cursor-pointer text-foreground md:hidden"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {isOpen && (
        <div
          data-cy="nav-links-mobile"
          className="border-t border-border bg-background px-6 py-4 md:hidden"
        >
          <ul className="flex flex-col gap-4">
            {publicNav.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  data-cy={`nav-mobile-${item.key}`}
                  onClick={() => setIsOpen(false)}
                  className="block cursor-pointer text-body font-medium text-foreground"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                data-cy="nav-mobile-login"
                onClick={() => setIsOpen(false)}
                className="block cursor-pointer text-body font-medium text-muted-foreground"
              >
                {homeContent.loginLabel}
              </Link>
            </li>
          </ul>
          <a
            href="#contacto"
            data-cy="nav-mobile-contact-cta"
            onClick={() => setIsOpen(false)}
            className="mt-6 block cursor-pointer bg-primary px-5 py-2.5 text-center text-small font-medium text-primary-foreground transition-colors duration-200 hover:opacity-90"
          >
            {homeContent.contactCtaLabel}
          </a>
        </div>
      )}
    </header>
  );
}
