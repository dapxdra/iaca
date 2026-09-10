/** Formateo consistente en toda la app. Locale es-CR, moneda colón. */

const currency = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("es-CR", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

/** Monto en colones. `null`/`undefined` → guion, para columnas "sin definir". */
export function formatColones(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return currency.format(value);
}

/** Fecha ISO (`2026-09-10` o timestamptz) → `10 sept 2026`. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFmt.format(d);
}

/** Fecha de hoy en formato `YYYY-MM-DD` (para `defaultValue` de inputs date). */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
