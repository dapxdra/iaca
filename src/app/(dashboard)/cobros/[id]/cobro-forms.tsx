"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { idleFormState, type FormState } from "@/lib/form";
import { todayISO } from "@/lib/format";
import { setMontoCobrarAction, registrarPagoAction } from "../actions";

function FormFeedback({ state, dataCy }: { state: FormState; dataCy: string }) {
  if (state.status === "idle") return null;
  const ok = state.status === "success";
  return (
    <p
      role={ok ? "status" : "alert"}
      data-cy={dataCy}
      className={`text-small font-medium ${ok ? "text-green-700" : "text-red-700"}`}
    >
      {state.status === "success" ? (state.message ?? "Listo.") : state.message}
    </p>
  );
}

export function MontoCobrarForm({
  proyectoId,
  montoActual,
}: {
  proyectoId: string;
  montoActual: number | null;
}) {
  const [state, formAction, pending] = useActionState(setMontoCobrarAction, idleFormState);
  const fieldError = state.status === "error" ? state.fieldErrors?.montoCobrar : undefined;

  return (
    <form action={formAction} data-cy="monto-form" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="proyectoId" value={proyectoId} />
      <Field label="Monto a cobrar (₡)" htmlFor="montoCobrar" error={fieldError} hint="Vacío = sin definir">
        <Input
          id="montoCobrar"
          name="montoCobrar"
          type="number"
          min="0"
          step="0.01"
          defaultValue={montoActual ?? ""}
          className="w-48"
        />
      </Field>
      <Button type="submit" size="sm" disabled={pending} data-cy="monto-submit">
        {pending ? "Guardando…" : "Guardar monto"}
      </Button>
      <div className="w-full">
        <FormFeedback state={state} dataCy="monto-feedback" />
      </div>
    </form>
  );
}

export function RegistrarPagoForm({ proyectoId }: { proyectoId: string }) {
  const [state, formAction, pending] = useActionState(registrarPagoAction, idleFormState);
  const errs = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      action={formAction}
      data-cy="pago-form"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
    >
      <input type="hidden" name="proyectoId" value={proyectoId} />
      <Field label="Monto (₡)" htmlFor="monto" required error={errs.monto}>
        <Input id="monto" name="monto" type="number" min="0" step="0.01" required />
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
        <Button type="submit" size="sm" disabled={pending} data-cy="pago-submit">
          {pending ? "Registrando…" : "Registrar pago"}
        </Button>
        <div className="mt-2">
          <FormFeedback state={state} dataCy="pago-feedback" />
        </div>
      </div>
    </form>
  );
}
