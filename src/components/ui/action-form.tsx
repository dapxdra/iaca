"use client";

import { useActionState, useEffect } from "react";
import { Button } from "./button";
import { DialogActions, CancelButton } from "./dialog";
import { type FormState, idleFormState } from "@/lib/form";

/**
 * Envuelve el patrón repetido de todo formulario del panel:
 * `useActionState` + errores por campo + cerrar el diálogo al tener éxito.
 * `children` recibe los errores por campo para pintarlos bajo cada `Field`.
 */
export function ActionForm({
  action,
  onDone,
  submitLabel,
  pendingLabel = "Guardando…",
  dataCy,
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  onDone?: () => void;
  submitLabel: string;
  pendingLabel?: string;
  dataCy: string;
  children: (fieldErrors: Record<string, string>) => React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, idleFormState);

  useEffect(() => {
    if (state.status === "success") onDone?.();
  }, [state, onDone]);

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const formError =
    state.status === "error" && !state.fieldErrors ? state.message : null;

  return (
    <form action={formAction} data-cy={dataCy} className="flex flex-col gap-4">
      {children(fieldErrors)}

      {formError && (
        <p
          role="alert"
          data-cy={`${dataCy}-error`}
          className="text-small font-medium text-red-700"
        >
          {formError}
        </p>
      )}

      <DialogActions>
        {onDone && <CancelButton onClick={onDone} />}
        <Button type="submit" disabled={pending} data-cy={`${dataCy}-submit`}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </DialogActions>
    </form>
  );
}
