import type { LucideIcon } from "lucide-react";

/**
 * Tarjeta de indicador (KPI, resumen de cobros). Número grande con cifras
 * tabulares, etiqueta, chip de ícono opcional y una nota/tendencia opcional.
 * Barra de acento a la izquierda para dar peso sin sombra extra.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "accent" | "positive" | "warn";
}) {
  const accentBar = {
    neutral: "before:bg-border-strong",
    accent: "before:bg-accent",
    positive: "before:bg-green-600",
    warn: "before:bg-amber-500",
  }[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-border bg-surface-raised p-4 shadow-sm transition-shadow duration-200 hover:shadow-md before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[''] ${accentBar}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-small text-muted-foreground">{label}</span>
        {Icon && (
          <span className="grid h-8 w-8 place-items-center rounded-md bg-surface-sunken text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="mt-1.5 font-heading text-[1.75rem] leading-none tabular-nums text-foreground">
        {value}
      </div>
      {hint && <p className="mt-1.5 text-small text-muted-foreground">{hint}</p>}
    </div>
  );
}
