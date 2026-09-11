"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { PROYECTO_LABEL } from "@/components/ui/badge";
import { ESTADO_FLOW } from "@/lib/proyecto-flujo";

const ESTADOS = [...ESTADO_FLOW, "cerrado", "cancelado"] as const;

const selectClass =
  "rounded-md border border-border bg-surface-raised px-3 py-2 text-small text-foreground shadow-xs " +
  "cursor-pointer appearance-none bg-[length:1.1em] bg-[right_0.55rem_center] bg-no-repeat pr-8 " +
  "outline-none transition-[border-color,box-shadow] duration-150 hover:border-border-strong " +
  "focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ring)]";

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23575d83' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

/** Selects de estado y zona que escriben en la URL; el listado (server) los lee. */
export function ProyectoFilters({ zonas }: { zonas: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const estado = searchParams.get("estado") ?? "";
  const zona = searchParams.get("zona") ?? "";
  const hasFilters = Boolean(estado || zona);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams);
    params.delete("estado");
    params.delete("zona");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Filtrar por estado"
        data-cy="proyectos-filter-estado"
        value={estado}
        onChange={(e) => setParam("estado", e.target.value)}
        className={selectClass}
        style={{ backgroundImage: chevron }}
      >
        <option value="">Todos los estados</option>
        {ESTADOS.map((e) => (
          <option key={e} value={e}>
            {PROYECTO_LABEL[e]}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por zona"
        data-cy="proyectos-filter-zona"
        value={zona}
        onChange={(e) => setParam("zona", e.target.value)}
        className={selectClass}
        style={{ backgroundImage: chevron }}
      >
        <option value="">Todas las zonas</option>
        {zonas.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          data-cy="proyectos-filter-clear"
          className="inline-flex animate-fade-in items-center gap-1 rounded-md px-2 py-2 text-small font-medium text-muted-foreground transition-colors hover:text-foreground focus-ring"
        >
          <X className="h-3.5 w-3.5" /> Limpiar
        </button>
      )}
    </div>
  );
}
