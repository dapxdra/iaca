"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { idleFormState, type FormState } from "@/lib/form";
import { PROYECTO_LABEL } from "@/components/ui/badge";
import { transicionesValidas, type ProyectoEstado } from "@/lib/proyecto-flujo";

/**
 * Control de cambio de estado de un proyecto o subproyecto. Solo ofrece las
 * transiciones válidas desde el estado actual (la lógica vive en el servicio y
 * se re-valida en el servidor). Si `bloqueoCierre` trae un motivo, "Cerrado"
 * aparece deshabilitado y se muestra el motivo. Con `pideFechaEntrega`, al
 * elegir "cerrado" pide la fecha de entrega real.
 */
export function EstadoControl({
  action,
  id,
  estadoActual,
  pideFechaEntrega = false,
  bloqueoCierre = null,
  compact = false,
  dataCy = "estado",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  estadoActual: ProyectoEstado;
  pideFechaEntrega?: boolean;
  bloqueoCierre?: string | null;
  /** Versión de una línea, sin etiqueta visible, para filas de una lista. */
  compact?: boolean;
  dataCy?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const [destino, setDestino] = useState<ProyectoEstado | "">("");
  const toast = useToast();
  const handled = useRef<FormState | null>(null);
  const selectId = useId();
  const fechaId = useId();
  const opciones = transicionesValidas(estadoActual);
  const ofreceCierre = opciones.includes("cerrado");

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
        className={`flex flex-wrap items-end ${compact ? "gap-2" : "gap-3"}`}
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
            onChange={(e) => setDestino(e.target.value as ProyectoEstado)}
            className={compact ? "h-8 w-36 text-small" : "w-52"}
            data-cy={`${dataCy}-select`}
            required
          >
            <option value="" disabled>
              {compact ? "Cambiar estado…" : "Elegí…"}
            </option>
            {opciones.map((e) => (
              <option key={e} value={e} disabled={e === "cerrado" && Boolean(bloqueoCierre)}>
                {PROYECTO_LABEL[e]}
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

      {ofreceCierre && bloqueoCierre && (
        <p className="text-small text-warning" data-cy={`${dataCy}-bloqueo`}>
          {bloqueoCierre}
        </p>
      )}
    </div>
  );
}
