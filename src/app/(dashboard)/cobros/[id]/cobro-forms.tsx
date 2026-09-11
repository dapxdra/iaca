"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { idleFormState, type FormState } from "@/lib/form";
import { todayISO } from "@/lib/format";
import { setMontoCobrarAction, registrarPagoAction } from "../actions";

function useActionToast(state: FormState, okTitle: string) {
  const toast = useToast();
  const handled = useRef<FormState | null>(null);
  useEffect(() => {
    if (state === handled.current || state.status === "idle") return;
    handled.current = state;
    if (state.status === "success") {
      toast({ tone: "success", title: okTitle, description: state.message });
    } else if (!state.fieldErrors) {
      toast({ tone: "error", title: "Error", description: state.message });
    }
  }, [state, toast, okTitle]);
}

export function MontoCobrarForm({
  proyectoId,
  montoActual,
}: {
  proyectoId: string;
  montoActual: number | null;
}) {
  const [state, formAction, pending] = useActionState(setMontoCobrarAction, idleFormState);
  useActionToast(state, "Monto actualizado");
  const fieldError = state.status === "error" ? state.fieldErrors?.montoCobrar : undefined;

  return (
    <form action={formAction} data-cy="monto-form" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="proyectoId" value={proyectoId} />
      <Field
        label="Monto a cobrar (₡)"
        htmlFor="montoCobrar"
        error={fieldError}
        hint="Vacío = sin definir"
      >
        <Input
          id="montoCobrar"
          name="montoCobrar"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          defaultValue={montoActual ?? ""}
          className="w-52 tabular-nums"
        />
      </Field>
      <Button type="submit" loading={pending} data-cy="monto-submit">
        Guardar monto
      </Button>
    </form>
  );
}

export function RegistrarPagoForm({ proyectoId }: { proyectoId: string }) {
  const [state, formAction, pending] = useActionState(registrarPagoAction, idleFormState);
  useActionToast(state, "Pago registrado");
  const errs = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      action={formAction}
      data-cy="pago-form"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-start"
    >
      <input type="hidden" name="proyectoId" value={proyectoId} />
      <Field label="Monto (₡)" htmlFor="monto" required error={errs.monto}>
        <Input
          id="monto"
          name="monto"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          className="tabular-nums"
          required
        />
      </Field>
      <Field label="Fecha" htmlFor="fechaPago" required error={errs.fechaPago}>
        <Input id="fechaPago" name="fechaPago" type="date" defaultValue={todayISO()} required />
      </Field>
      <Field label="Método" htmlFor="metodo" required error={errs.metodo}>
        <Select id="metodo" name="metodo" defaultValue="sinpe_movil">
          <option value="efectivo">Efectivo</option>
          <option value="sinpe_movil">SINPE Móvil</option>
          <option value="transferencia">Transferencia</option>
          <option value="cheque">Cheque</option>
          <option value="otro">Otro</option>
        </Select>
      </Field>
      <Field label="Notas" htmlFor="notas" error={errs.notas}>
        <Input id="notas" name="notas" />
      </Field>
      <div className="lg:col-span-4">
        <Button type="submit" loading={pending} data-cy="pago-submit">
          Registrar pago
        </Button>
      </div>
    </form>
  );
}
