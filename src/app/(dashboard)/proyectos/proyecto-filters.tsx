"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PROYECTO_LABEL } from "@/components/ui/badge";
import { ESTADO_FLOW } from "@/lib/proyecto-flujo";

const ESTADOS = [...ESTADO_FLOW, "cerrado", "cancelado"] as const;

/** Selects de estado y zona que escriben en la URL; el listado (server) los lee. */
export function ProyectoFilters({ zonas }: { zonas: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const selectClass =
    "border border-border bg-background px-3 py-2 text-small text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";

  return (
    <div className="flex flex-wrap gap-3">
      <select
        aria-label="Filtrar por estado"
        data-cy="proyectos-filter-estado"
        value={searchParams.get("estado") ?? ""}
        onChange={(e) => setParam("estado", e.target.value)}
        className={selectClass}
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
        value={searchParams.get("zona") ?? ""}
        onChange={(e) => setParam("zona", e.target.value)}
        className={selectClass}
      >
        <option value="">Todas las zonas</option>
        {zonas.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </select>
    </div>
  );
}
