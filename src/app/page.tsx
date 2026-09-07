import Link from "next/link";
import { homeContent, siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <div className="flex-1">
      <header className="border-b border-black/10 dark:border-white/10">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span data-cy="site-name" className="text-lg font-semibold tracking-tight">
            {siteConfig.name}
          </span>
          <Link
            href="/login"
            data-cy="nav-login"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            {homeContent.ctaLabel}
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 data-cy="home-hero-title" className="text-4xl font-bold tracking-tight sm:text-5xl">
            {homeContent.heroTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-foreground/70">
            {homeContent.heroSubtitle}
          </p>
        </section>

        <section
          data-cy="home-services"
          className="mx-auto grid max-w-5xl gap-6 px-6 pb-20 sm:grid-cols-2"
        >
          {homeContent.services.map((s) => (
            <article
              key={s.key}
              data-cy={`home-service-${s.key}`}
              className="rounded-lg border border-black/10 p-6 dark:border-white/10"
            >
              <h2 className="font-semibold">{s.titulo}</h2>
              <p className="mt-2 text-sm text-foreground/70">{s.detalle}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-black/10 px-6 py-8 text-center text-sm text-foreground/60 dark:border-white/10">
        {homeContent.footerText}
      </footer>
    </div>
  );
}
