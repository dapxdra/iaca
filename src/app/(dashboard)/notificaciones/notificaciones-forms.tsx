"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { idleFormState, type FormState } from "@/lib/form";
import type { AlertasConfig } from "@/services/notificaciones.service";
import { updateAlertasConfigAction } from "./actions";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

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

/** Botón de una sola acción (marcar leída, marcar todas, revisar ahora). */
export function ActionButton({
  action,
  id,
  label,
  toastTitle,
  variant = "secondary",
  dataCy,
}: {
  action: Action;
  id?: string;
  label: string;
  toastTitle: string;
  variant?: "primary" | "secondary" | "ghost";
  dataCy: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  useActionToast(state, toastTitle);

  return (
    <form action={formAction} className="inline-flex">
      {id && <input type="hidden" name="id" value={id} />}
      <Button type="submit" size="sm" variant={variant} loading={pending} data-cy={dataCy}>
        {label}
      </Button>
    </form>
  );
}

export function AlertasConfigForm({ config }: { config: AlertasConfig }) {
  const [state, formAction, pending] = useActionState(updateAlertasConfigAction, idleFormState);
  useActionToast(state, "Configuración guardada");
  const errs = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  const diasInput = (name: keyof AlertasConfig, value: number, max: number) => (
    <Input
      id={name}
      name={name}
      type="number"
      min="1"
      max={max}
      step="1"
      inputMode="numeric"
      defaultValue={value}
      aria-invalid={errs[name] ? true : undefined}
      aria-describedby={errs[name] ? `${name}-error` : `${name}-hint`}
      className="tabular-nums"
      data-cy={`alertas-${name}`}
      required
    />
  );

  return (
    <form
      action={formAction}
      data-cy="alertas-config-form"
      className="grid gap-4 sm:grid-cols-3 sm:items-start"
    >
      <Field
        label="Proyecto sin movimiento"
        htmlFor="proyecto_dias"
        hint="Días sin cambio de estado ni bitácora"
        error={errs.proyecto_dias}
        required
      >
        {diasInput("proyecto_dias", config.proyecto_dias, 365)}
      </Field>
      <Field
        label="Trámite sin movimiento"
        htmlFor="tramite_dias"
        hint="Días sin revisión ni cambio de estado"
        error={errs.tramite_dias}
        required
      >
        {diasInput("tramite_dias", config.tramite_dias, 365)}
      </Field>
      <Field
        label="Repetir aviso cada"
        htmlFor="recordatorio_dias"
        hint="Días entre avisos de lo mismo"
        error={errs.recordatorio_dias}
        required
      >
        {diasInput("recordatorio_dias", config.recordatorio_dias, 90)}
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 text-small font-medium text-foreground sm:col-span-3">
        <input
          type="checkbox"
          name="correo_activo"
          defaultChecked={config.correo_activo}
          data-cy="alertas-correo_activo"
          className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
        />
        Enviar también un resumen por correo
      </label>

      <div className="sm:col-span-3">
        <Button type="submit" loading={pending} data-cy="alertas-config-submit">
          Guardar configuración
        </Button>
      </div>
    </form>
  );
}
