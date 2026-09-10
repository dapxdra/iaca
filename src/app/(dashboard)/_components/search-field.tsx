"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Campo de búsqueda que sincroniza su valor con un query param de la URL
 * (con debounce). El listado es un Server Component que lee ese param, así
 * que al cambiar se re-renderiza desde el servidor sin estado cliente extra.
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
  const [, startTransition] = useTransition();

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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        data-cy={dataCy}
        className="w-full border border-border bg-background py-2 pl-9 pr-3 text-small text-foreground outline-none transition-colors duration-150 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
      />
    </div>
  );
}
