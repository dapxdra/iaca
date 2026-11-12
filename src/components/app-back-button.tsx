"use client";

import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { appShellContent } from "@/config/site";
import { isInstalled } from "@/lib/standalone";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Instalada como app no hay barra del navegador ni su flecha de volver (en iOS
 * tampoco hay botón físico), así que la ponemos nosotros. En el navegador no se
 * muestra: ahí ya existe la del navegador.
 *
 * En la pantalla de inicio del rol no hay a dónde volver. Si la app se abrió
 * directo en otra pantalla (sin historial), vuelve a la de inicio.
 */
export function AppBackButton({ home }: { home: string }) {
  const installed = useSyncExternalStore(subscribe, isInstalled, () => false);
  const pathname = usePathname();
  const router = useRouter();

  if (!installed || pathname === home) return null;

  return (
    <button
      type="button"
      data-cy="app-back"
      aria-label={appShellContent.backLabel}
      title={appShellContent.backLabel}
      onClick={() => (window.history.length > 1 ? router.back() : router.push(home))}
      className="-ml-2 mr-1 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-md text-paper transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
    >
      <ArrowLeft className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
