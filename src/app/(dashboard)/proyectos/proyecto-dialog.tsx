"use client";

import { Pencil, Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createProyectoAction, updateProyectoAction } from "./actions";
import type { ProyectoDetalle } from "@/services/proyectos.service";

type Option = { id: string; nombre: string };

export function ProyectoDialog({
  clientes,
  responsables,
  zonas,
  proyecto,
}: {
  clientes: Option[];
  responsables: { id: string; full_name: string }[];
  zonas: string[];
  proyecto?: ProyectoDetalle;
}) {
  const isEdit = Boolean(proyecto);

  return (
    <FormDialog
      dataCy={isEdit ? `proyecto-edit-${proyecto!.id}` : "proyecto-new"}
      triggerLabel={
        isEdit ? (
          <>
            <Pencil className="h-4 w-4" /> Editar
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> Nuevo proyecto
          </>
        )
      }
      triggerVariant={isEdit ? "secondary" : "primary"}
      triggerSize="sm"
      title={isEdit ? "Editar proyecto" : "Nuevo proyecto"}
      description={
        isEdit
          ? undefined
          : "El código IACA-año-NNN se genera automáticamente al crear."
      }
    >
      {(close) => (
        <ActionForm
          action={isEdit ? updateProyectoAction : createProyectoAction}
          onDone={close}
          submitLabel={isEdit ? "Guardar cambios" : "Crear proyecto"}
          dataCy="proyecto-form"
        >
          {(errors) => (
            <>
              {isEdit && <input type="hidden" name="id" value={proyecto!.id} />}

              <Field label="Nombre" htmlFor="nombre" required error={errors.nombre}>
                <Input id="nombre" name="nombre" defaultValue={proyecto?.nombre ?? ""} required />
              </Field>

              <Field label="Cliente" htmlFor="cliente_id" required error={errors.cliente_id}>
                <Select
                  id="cliente_id"
                  name="cliente_id"
                  defaultValue={proyecto?.cliente?.id ?? ""}
                  required
                >
                  <option value="" disabled>
                    Seleccioná un cliente…
                  </option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Tipo de servicio"
                  htmlFor="tipo_servicio"
                  error={errors.tipo_servicio}
                >
                  <Input
                    id="tipo_servicio"
                    name="tipo_servicio"
                    placeholder="Levantamiento, Amojonamiento…"
                    defaultValue={proyecto?.tipo_servicio ?? ""}
                  />
                </Field>
                <Field label="Responsable" htmlFor="responsable_id" error={errors.responsable_id}>
                  <Select
                    id="responsable_id"
                    name="responsable_id"
                    defaultValue={proyecto?.responsable?.id ?? ""}
                  >
                    <option value="">Sin asignar</option>
                    {responsables.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.full_name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Provincia" htmlFor="provincia" error={errors.provincia}>
                  <Input id="provincia" name="provincia" defaultValue={proyecto?.provincia ?? ""} />
                </Field>
                <Field label="Cantón" htmlFor="canton" error={errors.canton}>
                  <Input id="canton" name="canton" defaultValue={proyecto?.canton ?? ""} />
                </Field>
                <Field label="Distrito" htmlFor="distrito" error={errors.distrito}>
                  <Input id="distrito" name="distrito" defaultValue={proyecto?.distrito ?? ""} />
                </Field>
              </div>

              <Field
                label="Zona (KPI)"
                htmlFor="zona"
                hint="Agrupación libre para los reportes por zona"
                error={errors.zona}
              >
                <Input
                  id="zona"
                  name="zona"
                  list="zonas-existentes"
                  defaultValue={proyecto?.zona ?? ""}
                />
                <datalist id="zonas-existentes">
                  {zonas.map((z) => (
                    <option key={z} value={z} />
                  ))}
                </datalist>
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Fecha inicio" htmlFor="fecha_inicio" error={errors.fecha_inicio}>
                  <Input
                    id="fecha_inicio"
                    name="fecha_inicio"
                    type="date"
                    defaultValue={proyecto?.fecha_inicio ?? ""}
                  />
                </Field>
                <Field
                  label="Entrega estimada"
                  htmlFor="fecha_estimada_entrega"
                  error={errors.fecha_estimada_entrega}
                >
                  <Input
                    id="fecha_estimada_entrega"
                    name="fecha_estimada_entrega"
                    type="date"
                    defaultValue={proyecto?.fecha_estimada_entrega ?? ""}
                  />
                </Field>
                <Field
                  label="Entrega real"
                  htmlFor="fecha_entrega_real"
                  error={errors.fecha_entrega_real}
                >
                  <Input
                    id="fecha_entrega_real"
                    name="fecha_entrega_real"
                    type="date"
                    defaultValue={proyecto?.fecha_entrega_real ?? ""}
                  />
                </Field>
              </div>

              <Field label="Descripción" htmlFor="descripcion" error={errors.descripcion}>
                <Textarea
                  id="descripcion"
                  name="descripcion"
                  defaultValue={proyecto?.descripcion ?? ""}
                />
              </Field>
            </>
          )}
        </ActionForm>
      )}
    </FormDialog>
  );
}
