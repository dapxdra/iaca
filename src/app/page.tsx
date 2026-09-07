import Link from "next/link";

const servicios = [
  {
    titulo: "Levantamientos topográficos",
    detalle:
      "Captura de puntos en campo con equipo especializado, referenciados a CR-SIRGAS (CRTM05).",
  },
  {
    titulo: "Agrimensura y amojonamiento",
    detalle: "Medición, cálculo y demarcación de linderos según normativa del Catastro Nacional.",
  },
  {
    titulo: "Curvas de nivel y modelado de terreno",
    detalle: "Procesamiento de datos de campo para planos topográficos y estudios de sitio.",
  },
  {
    titulo: "Trámites ante entidades",
    detalle:
      "Gestión y seguimiento de planos y documentos ante Catastro Nacional, municipalidades y otras entidades.",
  },
];

export default function HomePage() {
  return (
    <div className="flex-1">
      <header className="border-b border-black/10 dark:border-white/10">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">IACA</span>
          <Link
            href="/login"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Acceso interno
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Servicios de topografía en Costa Rica
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-foreground/70">
            Levantamientos, cálculo, dibujo y trámites topográficos, referenciados al
            sistema oficial CR-SIRGAS.
          </p>
        </section>

        <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-20 sm:grid-cols-2">
          {servicios.map((s) => (
            <article
              key={s.titulo}
              className="rounded-lg border border-black/10 p-6 dark:border-white/10"
            >
              <h2 className="font-semibold">{s.titulo}</h2>
              <p className="mt-2 text-sm text-foreground/70">{s.detalle}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-black/10 px-6 py-8 text-center text-sm text-foreground/60 dark:border-white/10">
        IACA — Servicios de topografía
      </footer>
    </div>
  );
}
