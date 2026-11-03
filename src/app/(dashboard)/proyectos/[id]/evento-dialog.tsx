"use client";

import { Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Textarea } from "@/components/ui/field";
import { createEventoAction } from "../actions";

export function EventoDialog({ proyectoId }: { proyectoId: string }) {
  return (
    <FormDialog
      dataCy="evento-new"
      triggerLabel={
        <>
          <Plus className="h-4 w-4" /> Agregar evento
        </>
      }
      triggerVariant="secondary"
      triggerSize="sm"
      title="Nuevo evento o indicación"
      description="Una visita, una llamada con el cliente o una instrucción para el equipo."
    >
      {(close) => (
        <ActionForm
          action={createEventoAction}
          onDone={close}
          toastTitle="Evento"
          submitLabel="Registrar"
          dataCy="evento-form"
        >
          {(errors) => (
            <>
              <input type="hidden" name="proyecto_id" value={proyectoId} />
              <Field label="Fecha" htmlFor="ev-fecha" required error={errors.fecha}>
                <Input
                  id="ev-fecha"
                  name="fecha"
                  type="date"
                  // en-CA da AAAA-MM-DD en la zona horaria local, que es lo que espera el input.
                  defaultValue={new Date().toLocaleDateString("en-CA")}
                  required
                  data-cy="evento-fecha"
                />
              </Field>
              <Field
                label="Evento / indicación"
                htmlFor="ev-desc"
                required
                error={errors.descripcion}
              >
                <Textarea id="ev-desc" name="descripcion" required data-cy="evento-descripcion" />
              </Field>
            </>
          )}
        </ActionForm>
      )}
    </FormDialog>
  );
}
