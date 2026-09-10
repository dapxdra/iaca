"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button, buttonClass } from "./button";

/**
 * Diálogo modal sobre el `<dialog>` nativo (sin librería): foco atrapado,
 * Escape para cerrar y backdrop accesibles vienen del navegador. `children`
 * es un render-prop que recibe `close` para que el formulario cierre el
 * modal tras un submit exitoso.
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        data-cy={`${dataCy}-trigger`}
        onClick={() => setOpen(true)}
        className={buttonClass(triggerVariant, triggerSize)}
      >
        {triggerLabel}
      </button>

      <dialog
        ref={ref}
        data-cy={`${dataCy}-dialog`}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false); // click en backdrop
        }}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] border border-border bg-background p-0 text-foreground backdrop:bg-ink/40"
      >
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
            onClick={() => setOpen(false)}
            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{open && children(() => setOpen(false))}</div>
      </dialog>
    </>
  );
}

export function DialogActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex items-center justify-end gap-3">{children}</div>;
}

export function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" onClick={onClick} data-cy="dialog-cancel">
      Cancelar
    </Button>
  );
}
