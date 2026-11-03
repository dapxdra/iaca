"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

const inputClass =
  "rounded-md border border-border bg-surface-raised px-3 py-2 text-small text-foreground shadow-xs " +
  "outline-none transition-[border-color,box-shadow] duration-150 hover:border-border-strong " +
  "focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ring)]";

/**
 * Rango `desde`/`hasta` que escribe en la URL; el listado (server) lo lee.
 * Con `clearable={false}` el botón de limpiar queda a cargo del contenedor
 * (los filtros de Proyectos y Cobros ya tienen su propio "Limpiar").
 */
export function DateRangeFilter({
  dataCy,
  label = "fecha",
  clearable = true,
}: {
  dataCy: string;
  label?: string;
  clearable?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";

  function update(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-small text-muted-foreground">
        Desde
        <input
          type="date"
          aria-label={`Filtrar por ${label} desde`}
          data-cy={`${dataCy}-filter-desde`}
          value={desde}
          max={hasta || undefined}
          onChange={(e) => update({ desde: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-1.5 text-small text-muted-foreground">
        Hasta
        <input
          type="date"
          aria-label={`Filtrar por ${label} hasta`}
          data-cy={`${dataCy}-filter-hasta`}
          value={hasta}
          min={desde || undefined}
          onChange={(e) => update({ hasta: e.target.value })}
          className={inputClass}
        />
      </label>

      {clearable && (desde || hasta) && (
        <button
          type="button"
          onClick={() => update({ desde: "", hasta: "" })}
          data-cy={`${dataCy}-filter-fechas-clear`}
          className="inline-flex animate-fade-in items-center gap-1 rounded-md px-2 py-2 text-small font-medium text-muted-foreground transition-colors hover:text-foreground focus-ring"
        >
          <X className="h-3.5 w-3.5" /> Limpiar
        </button>
      )}
    </div>
  );
}
