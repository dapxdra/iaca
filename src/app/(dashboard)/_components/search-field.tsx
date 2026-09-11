"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

/**
 * Campo de búsqueda que sincroniza su valor con un query param (con debounce).
 * El listado es un Server Component que lee ese param y se re-renderiza; el
 * spinner aparece mientras dura la transición.
 */
export function SearchField({
  paramName = "q",
  placeholder = "Buscar…",
  dataCy = "search",
}: {
  paramName?: string;
  placeholder?: string;
  dataCy?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const current = searchParams.get(paramName) ?? "";
    const handle = setTimeout(() => {
      if (value === current) return;
      const params = new URLSearchParams(searchParams);
      if (value.trim()) params.set(paramName, value.trim());
      else params.delete(paramName);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [value, paramName, pathname, router, searchParams]);

  return (
    <div className="relative w-full max-w-xs">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        data-cy={dataCy}
        className="w-full rounded-md border border-border bg-surface-raised py-2 pl-9 pr-9 text-small text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 hover:border-border-strong focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--ring)] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
