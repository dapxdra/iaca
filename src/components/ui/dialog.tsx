"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button, buttonClass } from "./button";

/**
 * Diálogo modal sobre el `<dialog>` nativo (foco atrapado, Escape y backdrop
 * gratis). Entra con fade (backdrop) + pop (panel); al cerrar reproduce la
 * animación inversa antes de `close()`. `children` es un render-prop que
 * recibe `close` para que el formulario cierre el modal tras un submit OK.
 */
export function FormDialog({
  triggerLabel,
  title,
  description,
  triggerVariant = "primary",
  triggerSize = "md",
  dataCy,
  children,
}: {
  triggerLabel: React.ReactNode;
  title: string;
  description?: string;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger";
  triggerSize?: "sm" | "md";
  dataCy: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");

  const open = useCallback(() => {
    ref.current?.showModal();
    setState("open");
  }, []);

  const requestClose = useCallback(() => {
    setState((s) => (s === "open" ? "closing" : s));
  }, []);

  // Cierra tras la animación de salida; timeout de respaldo por si
  // `onAnimationEnd` no dispara (motion reducido, animación interrumpida).
  useEffect(() => {
    if (state !== "closing") return;
    const fallback = setTimeout(() => ref.current?.close(), 200);
    return () => clearTimeout(fallback);
  }, [state]);

  return (
    <>
      <button
        type="button"
        data-cy={`${dataCy}-trigger`}
        onClick={open}
        className={buttonClass(triggerVariant, triggerSize)}
      >
        {triggerLabel}
      </button>

      <dialog
        ref={ref}
        data-cy={`${dataCy}-dialog`}
        onCancel={(e) => {
          e.preventDefault();
          requestClose();
        }}
        onClose={() => setState("closed")}
        onClick={(e) => {
          if (e.target === ref.current) requestClose();
        }}
        onAnimationEnd={(e) => {
          if (state === "closing" && e.target === ref.current) {
            ref.current?.close();
          }
        }}
        className={`m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface-raised p-0 text-foreground shadow-lg backdrop:bg-ink/45 backdrop:backdrop-blur-[2px] ${
          state === "closing"
            ? "[animation:pop_0.16s_cubic-bezier(0.4,0,1,1)_reverse_both] backdrop:[animation:fade-in_0.16s_ease_reverse_both]"
            : "animate-pop backdrop:animate-fade-in"
        }`}
      >
        {state !== "closed" && (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div>
                <h2 className="text-h3 font-semibold text-foreground">{title}</h2>
                {description && (
                  <p className="mt-1 text-small text-muted-foreground">{description}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                data-cy={`${dataCy}-close`}
                onClick={requestClose}
                className="-m-1.5 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground focus-ring"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {children(requestClose)}
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

export function DialogActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
      {children}
    </div>
  );
}

export function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" onClick={onClick} data-cy="dialog-cancel">
      Cancelar
    </Button>
  );
}
