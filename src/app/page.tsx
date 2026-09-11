import { ArrowRight, Check } from "lucide-react";
import {
  buildWhatsAppUrl,
  confianzaContent,
  contactContent,
  homeContent,
  processSteps,
  siteConfig,
} from "@/config/site";
import { SiteNav } from "@/components/site-nav";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { Reveal } from "@/components/reveal";

export default function HomePage() {
  return (
    <div className="flex-1 bg-background">
      <SiteNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(44rem_30rem_at_100%_-10%,color-mix(in_srgb,var(--accent)_9%,transparent),transparent)]"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <Reveal>
              <p className="text-small font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Topografía · Costa Rica
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1
                data-cy="home-hero-title"
                className="mt-4 max-w-3xl text-balance text-4xl font-bold text-foreground sm:text-5xl md:text-h1"
              >
                {homeContent.heroTitle}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-2xl text-pretty text-body text-muted-foreground">
                {homeContent.heroSubtitle}
              </p>
            </Reveal>
            <Reveal delay={240}>
              <a
                href="#contacto"
                className="group mt-9 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-small font-semibold text-primary-foreground shadow-xs transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--accent)_18%,var(--primary))] hover:shadow-md focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]"
              >
                {homeContent.contactCtaLabel}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </Reveal>
          </div>
        </section>

        {/* Servicios */}
        <section
          id="servicios"
          data-cy="home-services"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
        >
          <Reveal>
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-h2">
              Servicios
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {homeContent.services.map((s, index) => (
              <Reveal key={s.key} delay={index * 80}>
                <article
                  data-cy={`home-service-${s.key}`}
                  className="group h-full rounded-lg border border-border bg-surface-raised p-8 shadow-xs transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-md"
                >
                  <span className="inline-grid h-9 w-9 place-items-center rounded-md bg-surface-sunken font-heading text-small text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold text-foreground md:text-h3">
                    {s.titulo}
                  </h3>
                  <p className="mt-3 text-body text-muted-foreground">{s.detalle}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Proceso */}
        <section
          id="proceso"
          data-cy="home-process"
          className="scroll-mt-20 border-y border-border bg-surface"
        >
          <div className="mx-auto max-w-6xl px-6 py-24">
            <Reveal>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-h2">
                Cómo trabajamos
              </h2>
            </Reveal>
            <ol className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
              {processSteps.map((step, index) => (
                <Reveal key={step.key} delay={index * 90} as="li">
                  <div className="relative">
                    <span className="inline-grid h-10 w-10 place-items-center rounded-full border border-accent/40 bg-background font-heading text-body text-accent">
                      {index + 1}
                    </span>
                    {index < processSteps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-12 top-5 hidden h-px w-[calc(100%-2rem)] bg-border lg:block"
                      />
                    )}
                  </div>
                  <h3 className="mt-3 text-body font-semibold text-foreground">{step.titulo}</h3>
                  <p className="mt-1 text-small text-muted-foreground">{step.detalle}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Confianza */}
        <section
          id="confianza"
          data-cy="home-confianza"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
        >
          <Reveal>
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-h2">
              {confianzaContent.heading}
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-4 max-w-2xl text-body text-muted-foreground">
              {confianzaContent.description}
            </p>
          </Reveal>
          <ul className="mt-10 grid gap-3 sm:grid-cols-3">
            {confianzaContent.signals.map((signal, i) => (
              <Reveal key={signal} delay={i * 70} as="li">
                <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-raised px-4 py-3 shadow-xs">
                  <Check className="h-4 w-4 shrink-0 text-accent" />
                  <span className="text-small font-medium text-foreground">{signal}</span>
                </div>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* Contacto */}
        <section
          id="contacto"
          data-cy="home-contact"
          className="scroll-mt-20 border-t border-border bg-surface"
        >
          <div className="mx-auto max-w-6xl px-6 py-24">
            <Reveal>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-h2">
                {contactContent.heading}
              </h2>
            </Reveal>
            <Reveal delay={80}>
              <p className="mt-4 max-w-xl text-body text-muted-foreground">
                {contactContent.description}
              </p>
            </Reveal>
            <Reveal delay={160}>
              <a
                href={buildWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                data-cy="contact-whatsapp-cta"
                className="group mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-small font-semibold text-primary-foreground shadow-xs transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--accent)_18%,var(--primary))] hover:shadow-md focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]"
              >
                Escribir por WhatsApp · {contactContent.whatsapp.displayNumber}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <span className="font-heading text-h3 font-semibold">{siteConfig.name}</span>
          <p className="mt-2 text-small text-paper/70">{homeContent.footerText}</p>
        </div>
      </footer>

      <WhatsAppFloat />
    </div>
  );
}
