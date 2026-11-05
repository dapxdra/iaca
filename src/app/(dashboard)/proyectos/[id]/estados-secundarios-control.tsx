"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import { idleFormState, type FormState } from "@/lib/form";
import {
  SUBPROYECTO_ESTADOS_SECUNDARIOS,
  SUBPROYECTO_ESTADO_SECUNDARIO_LABEL,
  type SubproyectoEstadoSecundario,
} from "@/lib/proyecto-flujo";
import { estadosSecundariosAction } from "../actions";

/**
 * Estados de segundo plano de un subproyecto (Mantenimiento, Apelación,
 * Visado): independientes entre sí y del estado principal. Cada casilla se
 * guarda al marcarla; si falla, al revalidar vuelve a su valor real.
 */
export function EstadosSecundariosControl({
  id,
  activos,
  dataCy,
}: {
  id: string;
  activos: SubproyectoEstadoSecundario[];
  dataCy: string;
}) {
  const [state, formAction, pending] = useActionState(estadosSecundariosAction, idleFormState);
  const toast = useToast();
  const handled = useRef<FormState | null>(null);

  useEffect(() => {
    if (state === handled.current || state.status !== "error") return;
    handled.current = state;
    toast({ tone: "error", title: "No se pudo guardar", description: state.message });
  }, [state, toast]);

  return (
    <form
      // `key`: si el guardado falla, las casillas vuelven a lo que hay en la base.
      key={activos.join(",")}
      onChange={(e) => {
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      data-cy={dataCy}
      className="flex flex-wrap items-center gap-x-3 gap-y-1"
      aria-busy={pending}
    >
      <input type="hidden" name="id" value={id} />
      {SUBPROYECTO_ESTADOS_SECUNDARIOS.map((e) => (
        <label
          key={e}
          className="flex cursor-pointer items-center gap-1.5 text-small text-muted-foreground"
        >
          <input
            type="checkbox"
            name={e}
            defaultChecked={activos.includes(e)}
            disabled={pending}
            data-cy={`${dataCy}-${e}`}
            className="h-3.5 w-3.5 cursor-pointer accent-[var(--primary)]"
          />
          {SUBPROYECTO_ESTADO_SECUNDARIO_LABEL[e]}
        </label>
      ))}
    </form>
  );
}
