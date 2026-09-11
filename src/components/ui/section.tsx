/** Tarjeta de contenido con cabecera y acción opcional. */
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
    <section
      data-cy={dataCy}
      className="animate-rise overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-sunken px-5 py-3">
        <h2 className="text-body font-semibold tracking-tight text-foreground">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Par etiqueta/valor para fichas de detalle, con línea base alineada. */
export function DataItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="text-body font-medium text-foreground">{children}</dd>
    </div>
  );
}
