import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { authContent, siteConfig } from "@/config/site";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-6 py-12">
      {/* Textura sutil de fondo — dos halos muy tenues del acento, no un gradiente plano */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.5] [background:radial-gradient(40rem_40rem_at_15%_-10%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent),radial-gradient(36rem_36rem_at_110%_120%,color-mix(in_srgb,var(--primary)_9%,transparent),transparent)]"
      />

      <div
        data-cy="login-card"
        className="animate-pop relative w-full max-w-sm rounded-xl border border-border bg-surface-raised p-8 shadow-lg"
      >
        <span className="text-small font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {siteConfig.name}
        </span>
        <h1 className="mt-3 font-heading text-h3 font-semibold text-foreground">
          {authContent.title}
        </h1>
        <p className="mt-2 text-body text-muted-foreground">{authContent.description}</p>
        <LoginForm />
      </div>

      <Link
        href="/"
        className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-small text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al sitio
      </Link>
    </div>
  );
}
