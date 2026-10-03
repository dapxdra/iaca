import type { Metadata } from "next";
import { ArrowRight, Check, Mail, MessageCircle, Plus } from "lucide-react";
import {
  buildWhatsAppUrl,
  confianzaContent,
  contactContent,
  contactFormContent,
  faqContent,
  homeContent,
  processSteps,
  siteConfig,
} from "@/config/site";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { Reveal } from "@/components/reveal";
import { TopoBackground } from "@/components/topo-background";
import { ContactForm } from "@/components/contact-form";
import {
  BusinessStructuredData,
  FaqStructuredData,
  WebSiteStructuredData,
} from "@/components/structured-data";

/**
 * La home hereda el `title` por defecto del layout raíz, pero declara su
 * canonical explícito para que no compita con variantes con parámetros
 * (?fbclid=…, ?utm_source=…) que Google trataría como URLs distintas.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="flex-1 bg-background">
      <BusinessStructuredData />
      <WebSiteStructuredData />
      <FaqStructuredData />

      <SiteNav />

      <main id="contenido">
        <div className="relative overflow-hidden">
          <TopoBackground className="[mask-image:linear-gradient(to_bottom,black,black_65%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,black_65%,transparent)]" />

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
                {/* Único h1 de la página: es la señal más fuerte de tema para
                    Google, así que lleva el término principal del negocio. */}
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
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <a
                    href="#contacto"
                    className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-small font-semibold text-primary-foreground shadow-xs transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--accent)_18%,var(--primary))] hover:shadow-md focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]"
                  >
                    {homeContent.contactCtaLabel}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </a>
                  <a
                    href={buildWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cy="hero-whatsapp-cta"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-raised px-6 py-3 text-small font-semibold text-foreground shadow-xs transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-border-strong hover:shadow-sm focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Escribir por WhatsApp
                  </a>
                </div>
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
                Servicios de topografía
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {homeContent.services.map((s, index) => (
                <Reveal key={s.key} delay={index * 80}>
                  <article
                    data-cy={`home-service-${s.key}`}
                    className="group h-full rounded-lg border border-border bg-surface-raised p-8 shadow-xs transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-md"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-grid h-9 w-9 place-items-center rounded-md bg-surface-sunken font-heading text-small text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground"
                    >
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
        </div>

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
                    <span
                      aria-hidden="true"
                      className="inline-grid h-10 w-10 place-items-center rounded-full border border-accent/40 bg-background font-heading text-body text-accent"
                    >
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
                  <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="text-small font-medium text-foreground">{signal}</span>
                </div>
              </Reveal>
            ))}
          </ul>
        </section>

        {/*
          Preguntas frecuentes. Es la sección con más valor de búsqueda de la
          página: responde consultas de cola larga ("qué es un plano
          catastrado", "cuánto tarda un levantamiento") con las que la gente
          llega desde Google, y alimenta el structured data `FAQPage`.
          Se usa <details> nativo: accesible y desplegable sin una línea de JS.
        */}
        <section
          id="preguntas"
          data-cy="home-faq"
          className="scroll-mt-20 border-y border-border bg-surface"
        >
          <div className="mx-auto max-w-3xl px-6 py-24">
            <Reveal>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-h2">
                {faqContent.heading}
              </h2>
            </Reveal>
            <Reveal delay={80}>
              <p className="mt-4 text-body text-muted-foreground">{faqContent.description}</p>
            </Reveal>
            <div className="mt-10 flex flex-col gap-3">
              {faqContent.items.map((item, i) => (
                <Reveal key={item.key} delay={i * 60}>
                  <details
                    data-cy={`faq-${item.key}`}
                    className="group rounded-lg border border-border bg-surface-raised px-5 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-border-strong open:shadow-sm"
                  >
                    <summary className="flex cursor-pointer items-start justify-between gap-4 py-4 text-body font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]">
                      {/* h3 dentro del summary: mantiene la jerarquía de
                          encabezados navegable para lectores de pantalla. */}
                      <h3 className="font-sans text-body font-semibold">{item.pregunta}</h3>
                      {/* Ícono y no el carácter "+": el glifo se ubica según la
                          línea base de la fuente y no queda centrado en el
                          círculo (al girar a "×" se notaba el descentrado).
                          h-7 = alto de una línea de texto body, así queda
                          alineado con la primera línea aunque la pregunta
                          ocupe dos. */}
                      <span
                        aria-hidden="true"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-[transform,color,border-color] duration-200 group-hover:border-border-strong group-hover:text-foreground group-open:rotate-45"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.25} />
                      </span>
                    </summary>
                    <p className="pb-5 pr-10 text-pretty text-body leading-relaxed text-muted-foreground">
                      {item.respuesta}
                    </p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section id="contacto" data-cy="home-contact" className="scroll-mt-20">
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

            <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
              <Reveal delay={140}>
                <div className="flex flex-col gap-4">
                  <a
                    href={buildWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cy="contact-whatsapp-cta"
                    className="group flex items-center gap-4 rounded-lg border border-border bg-surface-raised p-5 shadow-xs transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-border-strong hover:shadow-sm focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-surface-sunken text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                      <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-small font-semibold text-foreground">
                        WhatsApp
                      </span>
                      <span className="block text-body text-muted-foreground">
                        {contactContent.whatsapp.displayNumber}
                      </span>
                    </span>
                  </a>

                  <a
                    href={`mailto:${contactContent.email}`}
                    data-cy="contact-email-cta"
                    className="group flex items-center gap-4 rounded-lg border border-border bg-surface-raised p-5 shadow-xs transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-border-strong hover:shadow-sm focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-surface-sunken text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                      <Mail className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-small font-semibold text-foreground">
                        {contactContent.emailLabel}
                      </span>
                      <span className="block break-all text-body text-muted-foreground">
                        {contactContent.email}
                      </span>
                    </span>
                  </a>

                  <p className="mt-2 text-small text-muted-foreground">
                    {confianzaContent.signals[2]} · {siteConfig.name} atiende consultas en
                    español.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={200}>
                <div>
                  <h3 className="text-xl font-semibold text-foreground md:text-h3">
                    {contactFormContent.heading}
                  </h3>
                  <p className="mt-2 text-body text-muted-foreground">
                    {contactFormContent.description}
                  </p>
                  <div className="mt-6">
                    <ContactForm />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
