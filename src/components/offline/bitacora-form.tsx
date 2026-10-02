"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { todayISO } from "@/lib/format";
import type { FormState } from "@/lib/form";
import { enqueueBitacora } from "@/lib/bitacora-sync";
import { MAX_CSV_POR_ENTRADA, MAX_CSV_MB, MAX_FOTOS_POR_ENTRADA } from "@/lib/uploads";

export type ProyectoOption = { id: string; codigo: string; nombre: string };

/**
 * Formulario de una entrada de bitácora. Lo usan el diálogo del panel y la
 * pantalla de captura sin conexión (`/campo`): guarda en la cola local y
 * envía si hay señal (ver `enqueueBitacora`).
 *
 * Genera el id de la entrada al montarse y lo reusa en cada reintento; para
 * una entrada nueva hay que volver a montarlo (el diálogo lo hace al abrirse,
 * `/campo` cambiándole la `key`).
 */
export function BitacoraForm({
  ownerId,
  proyectos,
  proyectoIdFijo,
  onDone,
}: {
  ownerId: string;
  proyectos: ProyectoOption[];
  proyectoIdFijo?: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [bitacoraId] = useState(() => crypto.randomUUID());

  const action = useCallback(
    (_prev: FormState, formData: FormData): Promise<FormState> =>
      enqueueBitacora({
        ownerId,
        bitacoraId,
        formData,
        proyectoLabel: (id) => proyectos.find((p) => p.id === id)?.codigo ?? "Proyecto",
        // El Route Handler ya revalidó en el servidor; esto trae la lista
        // nueva a la página que está abierta.
        onSynced: () => router.refresh(),
      }),
    [ownerId, bitacoraId, proyectos, router]
  );

  return (
    <ActionForm
      action={action}
      onDone={onDone}
      toastTitle="Bitácora"
      submitLabel="Registrar"
      pendingLabel="Guardando…"
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
              <Input id="b-eq" name="equipo_utilizado" placeholder="Estación total, GPS RTK…" />
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
              hint={`Hasta ${MAX_FOTOS_POR_ENTRADA}; se comprimen al guardar`}
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
  );
}
