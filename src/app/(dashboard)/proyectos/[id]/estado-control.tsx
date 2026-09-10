"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { idleFormState } from "@/lib/form";
import { PROYECTO_LABEL } from "@/components/ui/badge";
import { transicionesValidas, type ProyectoEstado } from "@/lib/proyecto-flujo";
import { cambiarEstadoAction } from "../actions";

/**
 * Control de cambio de estado del proyecto. Solo ofrece las transiciones
 * válidas desde el estado actual (la lógica vive en el servicio y se
 * re-valida en el servidor). Si el destino es "cerrado", pide la fecha de
 * entrega real.
 */
export function EstadoControl({
  proyectoId,
  estadoActual,
  tieneEntregaReal,
}: {
  proyectoId: string;
  estadoActual: ProyectoEstado;
  tieneEntregaReal: boolean;
}) {
  const [state, formAction, pending] = useActionState(cambiarEstadoAction, idleFormState);
  const opciones = transicionesValidas(estadoActual);
  const [destino, setDestino] = useState<ProyectoEstado | "">("");

  if (opciones.length === 0) {
    return (
      <p className="text-small text-muted-foreground">
        El proyecto está cerrado. No hay más cambios de estado.
      </p>
    );
  }

  return (
    <form action={formAction} data-cy="estado-form" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={proyectoId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="estado" className="text-small font-medium text-foreground">
          Cambiar estado a
        </label>
        <Select
          id="estado"
          name="estado"
          value={destino}
          onChange={(e) => setDestino(e.target.value as ProyectoEstado)}
          className="w-48"
          required
        >
          <option value="" disabled>
            Elegí…
          </option>
          {opciones.map((e) => (
            <option key={e} value={e}>
              {PROYECTO_LABEL[e]}
            </option>
          ))}
        </Select>
      </div>

      {destino === "cerrado" && !tieneEntregaReal && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fecha_entrega_real" className="text-small font-medium text-foreground">
            Fecha de entrega real *
          </label>
          <Input
            id="fecha_entrega_real"
            name="fecha_entrega_real"
            type="date"
            className="w-44"
            required
          />
        </div>
      )}

      <Button type="submit" size="sm" disabled={pending || !destino} data-cy="estado-submit">
        {pending ? "Aplicando…" : "Aplicar"}
      </Button>

      {state.status === "error" && (
        <p role="alert" data-cy="estado-error" className="w-full text-small font-medium text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
