"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Textarea } from "@/components/ui/field";
import { subproyectoTramiteDefaults } from "@/config/site";
import { createSubproyectoAction } from "../actions";

export function SubproyectoDialog({ proyectoId }: { proyectoId: string }) {
  const [necesitaTramite, setNecesitaTramite] = useState(false);

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
          onDone={() => {
            setNecesitaTramite(false);
            close();
          }}
          toastTitle="Subproyecto"
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

              <label className="flex cursor-pointer items-center gap-2.5 text-small font-medium text-foreground">
                <input
                  type="checkbox"
                  name="necesita_tramite"
                  checked={necesitaTramite}
                  onChange={(e) => setNecesitaTramite(e.target.checked)}
                  data-cy="subproyecto-necesita-tramite"
                  className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                />
                Necesita trámite
              </label>

              {necesitaTramite && (
                <div className="grid animate-fade-in gap-4 rounded-md border border-border bg-surface-sunken p-4 sm:grid-cols-2">
                  <Field label="Entidad" htmlFor="sp-entidad" required error={errors.entidad}>
                    <Input
                      id="sp-entidad"
                      name="entidad"
                      defaultValue={subproyectoTramiteDefaults.entidad}
                      required
                      data-cy="subproyecto-tramite-entidad"
                    />
                  </Field>
                  <Field
                    label="Tipo de trámite"
                    htmlFor="sp-tipo"
                    required
                    error={errors.tipo_tramite}
                  >
                    <Input
                      id="sp-tipo"
                      name="tipo_tramite"
                      defaultValue={subproyectoTramiteDefaults.tipoTramite}
                      required
                      data-cy="subproyecto-tramite-tipo"
                    />
                  </Field>
                  <p className="text-small text-muted-foreground sm:col-span-2">
                    {subproyectoTramiteDefaults.hint}
                  </p>
                </div>
              )}
            </>
          )}
        </ActionForm>
      )}
    </FormDialog>
  );
}
