"use client";

import { Pencil, Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createTramiteAction, updateTramiteAction } from "./actions";
import type { Tramite } from "@/services/tramites.service";

const ESTADOS: { value: string; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "enviado", label: "Enviado" },
  { value: "en_revision", label: "En revisión" },
  { value: "observado", label: "Observado" },
  { value: "aprobado", label: "Aprobado" },
  { value: "rechazado", label: "Rechazado" },
];

export function TramiteDialog({
  proyectos,
  tramite,
}: {
  proyectos: { id: string; codigo: string; nombre: string }[];
  tramite?: Tramite;
}) {
  const isEdit = Boolean(tramite);

  return (
    <FormDialog
      dataCy={isEdit ? `tramite-edit-${tramite!.id}` : "tramite-new"}
      triggerLabel={
        isEdit ? (
          <>
            <Pencil className="h-4 w-4" /> Editar
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> Nuevo trámite
          </>
        )
      }
      triggerVariant={isEdit ? "secondary" : "primary"}
      triggerSize="sm"
      title={isEdit ? "Editar trámite" : "Nuevo trámite"}
      description="Registro manual del envío a una entidad y su seguimiento."
    >
      {(close) => (
        <ActionForm
          action={isEdit ? updateTramiteAction : createTramiteAction}
          onDone={close}
          submitLabel={isEdit ? "Guardar cambios" : "Registrar"}
          dataCy="tramite-form"
        >
          {(errors) => (
            <>
              {isEdit && <input type="hidden" name="id" value={tramite!.id} />}

              <Field label="Proyecto" htmlFor="t-proyecto" required error={errors.proyecto_id}>
                <Select
                  id="t-proyecto"
                  name="proyecto_id"
                  required
                  defaultValue={tramite?.proyecto_id ?? ""}
                >
                  <option value="" disabled>
                    Seleccioná un proyecto…
                  </option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} · {p.nombre}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Entidad" htmlFor="t-entidad" required error={errors.entidad}>
                  <Input
                    id="t-entidad"
                    name="entidad"
                    placeholder="Catastro Nacional, Muni…"
                    defaultValue={tramite?.entidad ?? ""}
                    required
                  />
                </Field>
                <Field label="Tipo de trámite" htmlFor="t-tipo" required error={errors.tipo_tramite}>
                  <Input
                    id="t-tipo"
                    name="tipo_tramite"
                    placeholder="Inscripción de plano…"
                    defaultValue={tramite?.tipo_tramite ?? ""}
                    required
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="N.º de expediente"
                  htmlFor="t-exp"
                  error={errors.numero_expediente}
                >
                  <Input
                    id="t-exp"
                    name="numero_expediente"
                    defaultValue={tramite?.numero_expediente ?? ""}
                  />
                </Field>
                <Field label="Estado" htmlFor="t-estado" required error={errors.estado}>
                  <Select
                    id="t-estado"
                    name="estado"
                    defaultValue={tramite?.estado ?? "pendiente"}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fecha de envío" htmlFor="t-envio" error={errors.fecha_envio}>
                  <Input
                    id="t-envio"
                    name="fecha_envio"
                    type="date"
                    defaultValue={tramite?.fecha_envio ?? ""}
                  />
                </Field>
                <Field
                  label="Última revisión conocida"
                  htmlFor="t-rev"
                  error={errors.fecha_ultima_revision}
                >
                  <Input
                    id="t-rev"
                    name="fecha_ultima_revision"
                    type="date"
                    defaultValue={tramite?.fecha_ultima_revision ?? ""}
                  />
                </Field>
              </div>

              <Field label="Notas" htmlFor="t-notas" error={errors.notas}>
                <Textarea id="t-notas" name="notas" defaultValue={tramite?.notas ?? ""} />
              </Field>
            </>
          )}
        </ActionForm>
      )}
    </FormDialog>
  );
}
