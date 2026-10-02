"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Share, Smartphone } from "lucide-react";
import { installPromptContent as t } from "@/config/site";
import { Button } from "@/components/ui/button";

/** Evento no estándar de Chrome/Edge/Android (no está en los tipos del DOM). */
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

const DISMISSED_KEY = "iaca-install-dismissed-at";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPadOS se presenta como Mac; se distingue por la pantalla táctil.
function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

const subscribeNever = () => () => {};

function recentlyDismissed(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISSED_KEY) ?? 0) < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

/**
 * Invita a instalar la app. Solo en pantallas táctiles (en una computadora de
 * oficina no aporta), si no está instalada ya y si no se descartó hace poco.
 *
 * Android/Chrome/Edge: el navegador avisa que se puede instalar
 * (`beforeinstallprompt`) y el botón abre su diálogo nativo. iOS no tiene ese
 * evento ni forma de abrir el diálogo desde la página: solo se puede explicar
 * el camino a mano.
 */
export function InstallPrompt() {
  // Datos del dispositivo: en el servidor no existen (snapshot `false`), en
  // el cliente se leen al hidratar. No cambian mientras la página está abierta.
  const eligible = useSyncExternalStore(
    subscribeNever,
    () => window.matchMedia("(pointer: coarse)").matches && !isInstalled() && !recentlyDismissed(),
    () => false
  );
  const ios = useSyncExternalStore(subscribeNever, isIos, () => false);
  const [nativeReady, setNativeReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!eligible) return;
    const onPrompt = (event: Event) => {
      event.preventDefault(); // el aviso propio reemplaza la mini barra del navegador
      deferred.current = event as BeforeInstallPromptEvent;
      setNativeReady(true);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [eligible]);

  // iOS no emite ningún evento: si es iOS se muestran las instrucciones.
  const mode = !eligible || hidden ? null : nativeReady ? "native" : ios ? "ios" : null;
  if (!mode) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Sin almacenamiento solo se pierde el "no volver a mostrar".
    }
    setHidden(true);
  }

  async function install() {
    await deferred.current?.prompt();
    deferred.current = null;
    setHidden(true);
  }

  return (
    <div
      data-cy="install-prompt"
      className="flex animate-fade-in items-start gap-3 rounded-lg border border-accent/30 bg-surface-raised p-4 shadow-sm"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent/10 text-accent">
        <Smartphone className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-small font-semibold text-foreground">{t.title}</p>
        <p className="mt-0.5 text-small text-muted-foreground">{t.description}</p>
        {mode === "ios" && (
          <p className="mt-1.5 flex items-center gap-1.5 text-small font-medium text-foreground">
            <Share className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t.iosInstructions}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          {mode === "native" && (
            <Button size="sm" onClick={install} data-cy="install-prompt-install">
              {t.installLabel}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={dismiss} data-cy="install-prompt-dismiss">
            {t.dismissLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
