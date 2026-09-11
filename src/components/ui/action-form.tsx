"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "./button";
import { DialogActions, CancelButton } from "./dialog";
import { useToast } from "./toast";
import { type FormState, idleFormState } from "@/lib/form";

/**
 * Envuelve el patrón de todo formulario del panel: `useActionState` + errores
 * por campo + toast de éxito + cerrar el diálogo. `children` recibe los
 * errores por campo para pintarlos bajo cada `Field`.
 */
export function ActionForm({
  action,
  onDone,
  submitLabel,
  pendingLabel = "Guardando…",
  toastTitle,
  dataCy,
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  onDone?: () => void;
  submitLabel: string;
  pendingLabel?: string;
  toastTitle?: string;
  dataCy: string;
  children: (fieldErrors: Record<string, string>) => React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const toast = useToast();
  const handled = useRef<FormState | null>(null);

  useEffect(() => {
    if (state === handled.current || state.status !== "success") return;
    handled.current = state;
    toast({ tone: "success", title: toastTitle ?? "Listo", description: state.message });
    onDone?.();
  }, [state, onDone, toast, toastTitle]);

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const formError = state.status === "error" && !state.fieldErrors ? state.message : null;

  return (
    <form action={formAction} data-cy={dataCy} className="flex flex-col gap-4">
      {children(fieldErrors)}

      {formError && (
        <p
          role="alert"
          data-cy={`${dataCy}-error`}
          className="animate-fade-in rounded-md border border-red-700/30 bg-red-700/8 px-3 py-2 text-small font-medium text-red-700"
        >
          {formError}
        </p>
      )}

      <DialogActions>
        {onDone && <CancelButton onClick={onDone} />}
        <Button type="submit" loading={pending} data-cy={`${dataCy}-submit`}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </DialogActions>
    </form>
  );
}
