/** Bloque de contenido con título y acción opcional. Hairline, sin sombra. */
export function Section({
  title,
  action,
  children,
  dataCy,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  dataCy?: string;
}) {
  return (
    <section data-cy={dataCy} className="border border-border">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <h2 className="text-body font-semibold text-foreground">{title}</h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Par etiqueta/valor para fichas de detalle. */
export function DataItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="text-body text-foreground">{children}</dd>
    </div>
  );
}
