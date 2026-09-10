"use client";

import { Pencil, Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createClienteAction, updateClienteAction } from "./actions";
import type { Cliente } from "@/services/clientes.service";

/**
 * Diálogo de alta/edición de cliente. Un solo componente para ambos modos:
 * si recibe `cliente`, es edición (y agrega el `id` oculto); si no, es alta.
 */
export function ClienteDialog({ cliente }: { cliente?: Cliente }) {
  const isEdit = Boolean(cliente);

  return (
    <FormDialog
      dataCy={isEdit ? `cliente-edit-${cliente!.id}` : "cliente-new"}
      triggerLabel={
        isEdit ? (
          <>
            <Pencil className="h-4 w-4" /> Editar
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> Nuevo cliente
          </>
        )
      }
      triggerVariant={isEdit ? "secondary" : "primary"}
      triggerSize="sm"
      title={isEdit ? "Editar cliente" : "Nuevo cliente"}
      description="Persona física o jurídica. El correo y la identificación ayudan a la búsqueda."
    >
      {(close) => (
        <ActionForm
          action={isEdit ? updateClienteAction : createClienteAction}
          onDone={close}
          submitLabel={isEdit ? "Guardar cambios" : "Crear cliente"}
          dataCy="cliente-form"
        >
          {(errors) => (
            <>
              {isEdit && <input type="hidden" name="id" value={cliente!.id} />}

              <Field label="Tipo" htmlFor="tipo" required error={errors.tipo}>
                <Select id="tipo" name="tipo" defaultValue={cliente?.tipo ?? "persona_fisica"}>
                  <option value="persona_fisica">Persona física</option>
                  <option value="persona_juridica">Persona jurídica</option>
                </Select>
              </Field>

              <Field label="Nombre" htmlFor="nombre" required error={errors.nombre}>
                <Input id="nombre" name="nombre" defaultValue={cliente?.nombre ?? ""} required />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Identificación"
                  htmlFor="identificacion"
                  hint="Cédula física o jurídica"
                  error={errors.identificacion}
                >
                  <Input
                    id="identificacion"
                    name="identificacion"
                    defaultValue={cliente?.identificacion ?? ""}
                  />
                </Field>
                <Field label="Teléfono" htmlFor="telefono" error={errors.telefono}>
                  <Input id="telefono" name="telefono" defaultValue={cliente?.telefono ?? ""} />
                </Field>
              </div>

              <Field label="Correo electrónico" htmlFor="email" error={errors.email}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={cliente?.email ?? ""}
                />
              </Field>

              <Field label="Dirección" htmlFor="direccion" error={errors.direccion}>
                <Input id="direccion" name="direccion" defaultValue={cliente?.direccion ?? ""} />
              </Field>

              <Field label="Notas" htmlFor="notas" error={errors.notas}>
                <Textarea id="notas" name="notas" defaultValue={cliente?.notas ?? ""} />
              </Field>
            </>
          )}
        </ActionForm>
      )}
    </FormDialog>
  );
}
