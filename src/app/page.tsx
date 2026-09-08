import { buildWhatsAppUrl, confianzaContent, contactContent, homeContent, processSteps, siteConfig } from "@/config/site";
import { SiteNav } from "@/components/site-nav";
import { WhatsAppFloat } from "@/components/whatsapp-float";

export default function HomePage() {
  return (
    <div className="flex-1 bg-background">
      <SiteNav />

      <main>
        <section className="mx-auto max-w-6xl px-6 py-24">
          <p className="text-small font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Topografía · Costa Rica
          </p>
          <h1
            data-cy="home-hero-title"
            className="mt-4 max-w-3xl text-4xl font-bold text-foreground sm:text-5xl md:text-h1"
          >
            {homeContent.heroTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-body text-muted-foreground">
            {homeContent.heroSubtitle}
          </p>
        </section>

        <section
          id="servicios"
          data-cy="home-services"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
        >
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-h2">Servicios</h2>
          <div className="mt-10 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
            {homeContent.services.map((s, index) => (
              <article
                key={s.key}
                data-cy={`home-service-${s.key}`}
                className="bg-background p-8"
              >
                <span className="font-heading text-small text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-foreground md:text-h3">{s.titulo}</h3>
                <p className="mt-3 text-body text-muted-foreground">{s.detalle}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="proceso"
          data-cy="home-process"
          className="scroll-mt-20 border-y border-border bg-surface"
        >
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-h2">Cómo trabajamos</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-5">
              {processSteps.map((step, index) => (
                <li key={step.key} data-cy={`process-step-${step.key}`}>
                  <span className="font-heading text-h3 text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-body font-semibold text-foreground">{step.titulo}</h3>
                  <p className="mt-1 text-small text-muted-foreground">{step.detalle}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="confianza"
          data-cy="home-confianza"
          className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
        >
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-h2">{confianzaContent.heading}</h2>
          <p className="mt-4 max-w-2xl text-body text-muted-foreground">
            {confianzaContent.description}
          </p>
          <ul className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
            {confianzaContent.signals.map((signal) => (
              <li key={signal} className="text-small font-medium text-foreground">
                {signal}
              </li>
            ))}
          </ul>
        </section>

        <section
          id="contacto"
          data-cy="home-contact"
          className="scroll-mt-20 border-t border-border bg-surface"
        >
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl md:text-h2">{contactContent.heading}</h2>
            <p className="mt-4 max-w-xl text-body text-muted-foreground">
              {contactContent.description}
            </p>
            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              data-cy="contact-whatsapp-cta"
              className="mt-8 inline-block cursor-pointer bg-primary px-6 py-3 text-small font-semibold text-primary-foreground transition-colors duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Escribir por WhatsApp · {contactContent.whatsapp.displayNumber}
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <span className="text-h3 font-semibold">{siteConfig.name}</span>
          <p className="mt-2 text-small text-paper/70">{homeContent.footerText}</p>
        </div>
      </footer>

      <WhatsAppFloat />
    </div>
  );
}
