"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { homeContent, publicNav, siteConfig } from "@/config/site";

export function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-border bg-background/85 shadow-sm backdrop-blur-md"
          : "border-transparent bg-background"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          data-cy="site-name"
          className="font-heading text-lg font-semibold tracking-tight transition-colors hover:text-primary"
        >
          {siteConfig.name}
        </Link>

        <ul data-cy="nav-links-desktop" className="hidden items-center gap-8 md:flex">
          {publicNav.map((item) => (
            <li key={item.key}>
              <a
                href={item.href}
                data-cy={`nav-${item.key}`}
                className="relative text-small font-medium text-foreground transition-colors duration-200 hover:text-primary after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-accent after:transition-all after:duration-300 hover:after:w-full"
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
            className="text-small font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            {homeContent.loginLabel}
          </Link>
          <a
            href="#contacto"
            data-cy="nav-contact-cta"
            className="rounded-md bg-primary px-5 py-2.5 text-small font-semibold text-primary-foreground shadow-xs transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--accent)_18%,var(--primary))] hover:shadow-sm focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]"
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
          className="-mr-2 cursor-pointer rounded-md p-2 text-foreground transition-colors hover:bg-surface-sunken md:hidden"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {isOpen && (
        <div
          data-cy="nav-links-mobile"
          className="animate-fade-in border-t border-border bg-background px-6 py-4 md:hidden"
        >
          <ul className="flex flex-col gap-4">
            {publicNav.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  data-cy={`nav-mobile-${item.key}`}
                  onClick={() => setIsOpen(false)}
                  className="block text-body font-medium text-foreground"
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
                className="block text-body font-medium text-muted-foreground"
              >
                {homeContent.loginLabel}
              </Link>
            </li>
          </ul>
          <a
            href="#contacto"
            data-cy="nav-mobile-contact-cta"
            onClick={() => setIsOpen(false)}
            className="mt-6 block rounded-md bg-primary px-5 py-2.5 text-center text-small font-semibold text-primary-foreground"
          >
            {homeContent.contactCtaLabel}
          </a>
        </div>
      )}
    </header>
  );
}
