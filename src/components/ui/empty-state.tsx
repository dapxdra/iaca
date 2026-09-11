import type { LucideIcon } from "lucide-react";

/**
 * Estado vacío: ícono en chip, título, descripción y acción opcional.
 * Centrado, con aire — se usa dentro de una tarjeta o `TableWrap` vacío.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  dataCy,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  dataCy?: string;
}) {
  return (
    <div
      data-cy={dataCy}
      className="animate-fade-in flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
    >
      <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface-sunken text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-body font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-small text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
