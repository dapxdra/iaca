"use client";

import { Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Textarea } from "@/components/ui/field";
import { createSubproyectoAction } from "../actions";

export function SubproyectoDialog({ proyectoId }: { proyectoId: string }) {
  return (
    <FormDialog
      dataCy="subproyecto-new"
      triggerLabel={
        <>
          <Plus className="h-4 w-4" /> Agregar subproyecto
        </>
      }
      triggerVariant="secondary"
      triggerSize="sm"
      title="Nuevo subproyecto"
      description="Etapa o finca dentro de este proyecto, con su propio avance."
    >
      {(close) => (
        <ActionForm
          action={createSubproyectoAction}
          onDone={close}
          submitLabel="Agregar"
          dataCy="subproyecto-form"
        >
          {(errors) => (
            <>
              <input type="hidden" name="proyecto_id" value={proyectoId} />
              <Field label="Nombre" htmlFor="sp-nombre" required error={errors.nombre}>
                <Input id="sp-nombre" name="nombre" required />
              </Field>
              <Field label="Descripción" htmlFor="sp-desc" error={errors.descripcion}>
                <Textarea id="sp-desc" name="descripcion" />
              </Field>
            </>
          )}
        </ActionForm>
      )}
    </FormDialog>
  );
}
