"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { idleFormState, type FormState } from "@/lib/form";
import { PROYECTO_LABEL, SUBPROYECTO_LABEL } from "@/components/ui/badge";
import {
  ESTADO_FLOW,
  SUBPROYECTO_FLOW,
  esCorreccion,
  transicionesSubproyecto,
  transicionesValidas,
  type ProyectoEstado,
  type SubproyectoEstado,
} from "@/lib/proyecto-flujo";

type Flujo =
  | { flujo: "proyecto"; estadoActual: ProyectoEstado }
  | { flujo: "subproyecto"; estadoActual: SubproyectoEstado };

function opcionesDe(f: Flujo): { estados: string[]; flow: readonly string[]; label: Record<string, string> } {
  return f.flujo === "proyecto"
    ? { estados: transicionesValidas(f.estadoActual), flow: ESTADO_FLOW, label: PROYECTO_LABEL }
    : {
        estados: transicionesSubproyecto(f.estadoActual),
        flow: SUBPROYECTO_FLOW,
        label: SUBPROYECTO_LABEL,
      };
}

/**
 * Control de cambio de estado de un proyecto o subproyecto. Solo ofrece las
 * transiciones válidas desde el estado actual (la lógica vive en
 * `lib/proyecto-flujo.ts` y se re-valida en el servidor); los retrocesos se
 * marcan como corrección. `bloqueos` trae, por estado destino, el motivo por
 * el que no se puede elegir (ej. cerrar, o salir de Georeferencia): esa
 * opción aparece deshabilitada y se muestra el motivo. Con
 * `pideFechaEntrega`, al elegir "cerrado" pide la fecha de entrega real.
 */
export function EstadoControl({
  action,
  id,
  pideFechaEntrega = false,
  bloqueos = {},
  compact = false,
  dataCy = "estado",
  ...flujo
}: Flujo & {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  pideFechaEntrega?: boolean;
  bloqueos?: Partial<Record<string, string | null>>;
  /** Versión de una línea, sin etiqueta visible, para filas de una lista. */
  compact?: boolean;
  dataCy?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const [destino, setDestino] = useState("");
  const toast = useToast();
  const handled = useRef<FormState | null>(null);
  const selectId = useId();
  const fechaId = useId();
  const { estados: opciones, flow, label } = opcionesDe(flujo);
  const motivos = [
    ...new Set(opciones.map((e) => bloqueos[e]).filter((m): m is string => Boolean(m))),
  ];

  useEffect(() => {
    if (state === handled.current) return;
    handled.current = state;
    if (state.status === "success") {
      // Ya cambió de estado: al re-renderizar, `estadoActual` trae el nuevo
      // valor y `opciones` se recalcula, así que el select se limpia solo.
      toast({ tone: "success", title: "Estado actualizado", description: state.message });
    } else if (state.status === "error") {
      toast({ tone: "error", title: "No se pudo cambiar", description: state.message });
    }
  }, [state, toast]);

  if (opciones.length === 0) {
    return compact ? null : (
      <p className="text-small text-muted-foreground">
        El proyecto está cerrado. No hay más cambios de estado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <form
        action={formAction}
        data-cy={`${dataCy}-form`}
        className={`flex flex-wrap items-center ${compact ? "gap-2" : "gap-3"}`}
      >
        <input type="hidden" name="id" value={id} />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={selectId}
            className={compact ? "sr-only" : "text-small font-medium text-foreground"}
          >
            Cambiar estado a
          </label>
          <Select
            id={selectId}
            name="estado"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className={compact ? "w-48 py-0 pl-2.5 text-small" : "w-60"}
            data-cy={`${dataCy}-select`}
            required
          >
            <option value="" disabled>
              {compact ? "Cambiar estado…" : "Elegí…"}
            </option>
            {opciones.map((e) => (
              <option key={e} value={e} disabled={Boolean(bloqueos[e])}>
                {label[e]}
                {esCorreccion(flow, flujo.estadoActual, e) ? " (corrección)" : ""}
              </option>
            ))}
          </Select>
        </div>

        {destino === "cerrado" && pideFechaEntrega && (
          <div className="flex animate-fade-in flex-col gap-1.5">
            <label htmlFor={fechaId} className="text-small font-medium text-foreground">
              Fecha de entrega real *
            </label>
            <Input
              id={fechaId}
              name="fecha_entrega_real"
              type="date"
              className="w-44"
              required
            />
          </div>
        )}

        <Button
          type="submit"
          size={compact ? "sm" : undefined}
          loading={pending}
          disabled={!destino}
          data-cy={`${dataCy}-submit`}
        >
          Aplicar
        </Button>
      </form>

      {motivos.map((m) => (
        <p key={m} className="text-small text-warning" data-cy={`${dataCy}-bloqueo`}>
          {m}
        </p>
      ))}
    </div>
  );
}
