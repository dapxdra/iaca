import type { Metadata } from "next";
import Link from "next/link";
import { authContent, portalClienteContent, siteConfig } from "@/config/site";
import { BrandLogo } from "@/components/brand-logo";
import { DefinirContrasenaForm } from "./definir-contrasena-form";

/** Destino del enlace de invitación al portal: nunca se indexa. */
export const metadata: Metadata = {
  title: portalClienteContent.definirTitulo,
  description: siteConfig.appDescription,
  robots: { index: false, follow: false },
};

export default async function DefinirContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash, type } = await searchParams;
  const valido = Boolean(token_hash) && (type === "invite" || type === "recovery");
  const c = portalClienteContent;

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.5] [background:radial-gradient(40rem_40rem_at_15%_-10%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent),radial-gradient(36rem_36rem_at_110%_120%,color-mix(in_srgb,var(--primary)_9%,transparent),transparent)]"
      />

      <div
        data-cy="definir-contrasena-card"
        className="animate-pop relative w-full max-w-sm rounded-xl border border-border bg-surface-raised p-8 shadow-lg"
      >
        <span className="flex items-center gap-2.5 text-small font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <BrandLogo className="h-9 w-9 text-primary" />
          {siteConfig.name}
        </span>
        <h1 className="mt-3 font-heading text-h3 font-semibold text-foreground">
          {c.definirTitulo}
        </h1>

        {valido ? (
          <>
            <p className="mt-2 text-body text-muted-foreground">{c.definirDescripcion}</p>
            <DefinirContrasenaForm
              tokenHash={token_hash!}
              type={type as "invite" | "recovery"}
            />
          </>
        ) : (
          <>
            <p className="mt-2 text-body text-muted-foreground">{c.enlaceInvalido}</p>
            <Link
              href="/login"
              data-cy="definir-contrasena-login"
              className="mt-6 inline-flex text-small font-medium text-accent hover:underline"
            >
              {authContent.submitLabel}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
