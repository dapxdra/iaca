"use client";

import { Plus } from "lucide-react";
import { FormDialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { todayISO } from "@/lib/format";
import { MAX_CSV_POR_ENTRADA, MAX_CSV_MB, MAX_FOTOS_POR_ENTRADA, MAX_FOTO_MB } from "@/lib/uploads";
import { createBitacoraAction } from "./actions";

export function BitacoraDialog({
  proyectos,
  proyectoIdFijo,
}: {
  proyectos: { id: string; codigo: string; nombre: string }[];
  proyectoIdFijo?: string;
}) {
  return (
    <FormDialog
      dataCy="bitacora-new"
      triggerLabel={
        <>
          <Plus className="h-4 w-4" /> Nueva entrada
        </>
      }
      triggerSize="sm"
      title="Nueva entrada de bitácora"
      description="Se registra a tu nombre y con la fecha indicada."
    >
      {(close) => (
        <ActionForm
          action={createBitacoraAction}
          onDone={close}
          toastTitle="Bitácora"
          submitLabel="Registrar"
          dataCy="bitacora-form"
        >
          {(errors) => (
            <>
              {proyectoIdFijo ? (
                <input type="hidden" name="proyecto_id" value={proyectoIdFijo} />
              ) : (
                <Field label="Proyecto" htmlFor="b-proyecto" required error={errors.proyecto_id}>
                  <Select id="b-proyecto" name="proyecto_id" required defaultValue="">
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
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Fecha" htmlFor="b-fecha" required error={errors.fecha}>
                  <Input id="b-fecha" name="fecha" type="date" defaultValue={todayISO()} required />
                </Field>
                <Field label="Hora inicio" htmlFor="b-hi" error={errors.hora_inicio}>
                  <Input id="b-hi" name="hora_inicio" type="time" />
                </Field>
                <Field label="Hora fin" htmlFor="b-hf" error={errors.hora_fin}>
                  <Input id="b-hf" name="hora_fin" type="time" />
                </Field>
              </div>

              <Field label="Actividad" htmlFor="b-act" required error={errors.actividad}>
                <Textarea id="b-act" name="actividad" required />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Equipo utilizado" htmlFor="b-eq" error={errors.equipo_utilizado}>
                  <Input
                    id="b-eq"
                    name="equipo_utilizado"
                    placeholder="Estación total, GPS RTK…"
                  />
                </Field>
                <Field label="Clima" htmlFor="b-clima" error={errors.clima}>
                  <Input id="b-clima" name="clima" placeholder="Despejado, lluvia…" />
                </Field>
              </div>

              <Field label="Observaciones" htmlFor="b-obs" error={errors.observaciones}>
                <Textarea id="b-obs" name="observaciones" />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Fotos"
                  htmlFor="b-fotos"
                  hint={`Hasta ${MAX_FOTOS_POR_ENTRADA}, máx. ${MAX_FOTO_MB} MB c/u`}
                >
                  <FileInput name="fotos" accept="image/jpeg,image/png,image/webp,image/heic" />
                </Field>
                <Field
                  label="Archivos CSV"
                  htmlFor="b-csv"
                  hint={`Hasta ${MAX_CSV_POR_ENTRADA}, máx. ${MAX_CSV_MB} MB c/u`}
                >
                  <FileInput name="csv" accept=".csv,text/csv" />
                </Field>
              </div>
            </>
          )}
        </ActionForm>
      )}
    </FormDialog>
  );
}
