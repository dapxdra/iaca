"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { buttonClass } from "./button";
import { useToast } from "./toast";
import { type FormState, idleFormState } from "@/lib/form";

/**
 * Botón de borrado: confirmación nativa → Server Action (recibe `id` por
 * FormData) → toast con el resultado. Ícono-only en tablas; `label` opcional.
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
  const toast = useToast();
  const handled = useRef<FormState | null>(null);

  useEffect(() => {
    if (state === handled.current || state.status === "idle") return;
    handled.current = state;
    if (state.status === "success") {
      toast({ tone: "success", title: "Eliminado", description: state.message });
    } else {
      toast({ tone: "error", title: "No se pudo eliminar", description: state.message });
    }
  }, [state, toast]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar ${entityLabel}? Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
      className="inline-flex"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        data-cy={dataCy}
        aria-label={`Eliminar ${entityLabel}`}
        className={buttonClass("danger", "sm", label ? "" : "!w-8 !px-0")}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        {label}
      </button>
    </form>
  );
}
