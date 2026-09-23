import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LegalDocument } from "@/config/site";

/**
 * Renderiza un documento legal desde `config/site.ts`. Las dos páginas legales
 * comparten este componente, así que su estructura y su jerarquía de
 * encabezados (un solo `h1`, secciones en `h2`) son idénticas — que es lo que
 * espera tanto un lector de pantalla como el rastreador de Google.
 *
 * Ancho de línea limitado a `max-w-2xl`: alrededor de 70 caracteres por línea,
 * el rango legible para texto largo (design-system/MASTER.md).
 */
export function LegalDocumentPage({ doc }: { doc: LegalDocument }) {
  const fechaLegible = new Date(`${doc.actualizado}T12:00:00Z`).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="mx-auto max-w-2xl px-6 py-16 sm:py-20" data-cy="legal-document">
      <Link
        href="/"
        data-cy="legal-back-home"
        className="inline-flex items-center gap-1.5 text-small font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al inicio
      </Link>

      <h1 className="mt-8 text-balance text-3xl font-bold text-foreground md:text-h2">
        {doc.titulo}
      </h1>

      <p className="mt-3 text-small text-muted-foreground">
        Última actualización:{" "}
        <time dateTime={doc.actualizado} className="font-medium">
          {fechaLegible}
        </time>
      </p>

      <p className="mt-8 text-pretty text-body text-foreground">{doc.intro}</p>

      <div className="mt-12 flex flex-col gap-10">
        {doc.secciones.map((seccion) => (
          <section key={seccion.key} id={seccion.key} className="scroll-mt-24">
            <h2 className="text-xl font-semibold text-foreground md:text-h3">{seccion.titulo}</h2>

            {seccion.parrafos?.map((parrafo, i) => (
              <p
                key={i}
                className="mt-4 text-pretty text-body leading-relaxed text-muted-foreground"
              >
                {parrafo}
              </p>
            ))}

            {seccion.lista && (
              <ul className="mt-4 flex flex-col gap-2.5">
                {seccion.lista.map((item, i) => (
                  <li
                    key={i}
                    className="relative pl-5 text-pretty text-body leading-relaxed text-muted-foreground before:absolute before:left-0 before:top-[0.65em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent/60"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
