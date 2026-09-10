"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { buttonClass } from "./button";
import { type FormState, idleFormState } from "@/lib/form";

/**
 * Botón de borrado: pide confirmación nativa y luego dispara una Server Action
 * que recibe `id` por FormData. Icono-only en tablas; `label` opcional.
 */
export function DeleteForm({
  action,
  id,
  entityLabel,
  label,
  dataCy,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  entityLabel: string;
  label?: string;
  dataCy: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleFormState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar ${entityLabel}? Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        data-cy={dataCy}
        aria-label={`Eliminar ${entityLabel}`}
        title={state.status === "error" ? state.message : `Eliminar ${entityLabel}`}
        className={buttonClass("danger", "sm", label ? "" : "!px-2")}
      >
        <Trash2 className="h-4 w-4" />
        {label}
      </button>
    </form>
  );
}
