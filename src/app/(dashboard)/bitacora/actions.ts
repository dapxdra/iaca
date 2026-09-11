"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile, isFieldStaff } from "@/lib/auth";
import { toFieldErrors, type FormState } from "@/lib/form";
import { makeFormAction, idOnlySchema } from "@/lib/action";
import { bitacoraSchema, createBitacora, deleteBitacora } from "@/services/bitacora.service";
import {
  uploadBitacoraFotos,
  uploadArchivoCsv,
  validateFotoFile,
  validateCsvFile,
} from "@/services/storage.service";
import { MAX_FOTOS_POR_ENTRADA, MAX_CSV_POR_ENTRADA } from "@/lib/uploads";

const PERMISSION_ERROR: FormState = {
  status: "error",
  message: "No tenés permiso para registrar bitácora.",
};

/**
 * A diferencia de los demás CRUD, esta acción no usa `makeFormAction`: además
 * de los campos de texto, el formulario manda archivos (`fotos`, `csv`), y
 * `FormData` con múltiples archivos bajo la misma llave no sobrevive el
 * `Object.fromEntries` genérico de `parseForm`. Se valida y sube a mano.
 */
export async function createBitacoraAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const profile = await getSessionProfile();
  if (!profile || !isFieldStaff(profile.role)) return PERMISSION_ERROR;

  const textFields = Object.fromEntries(
    Array.from(formData.entries()).filter(([, value]) => typeof value === "string")
  );
  const parsed = bitacoraSchema.safeParse(textFields);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const fotos = formData
    .getAll("fotos")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_FOTOS_POR_ENTRADA);
  const csvs = formData
    .getAll("csv")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_CSV_POR_ENTRADA);

  for (const f of fotos) {
    const err = validateFotoFile(f);
    if (err) return { status: "error", message: err };
  }
  for (const f of csvs) {
    const err = validateCsvFile(f);
    if (err) return { status: "error", message: err };
  }

  let bitacoraId: string;
  try {
    bitacoraId = await createBitacora(parsed.data, profile.userId);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "No se pudo registrar la entrada.",
    };
  }

  // La entrada ya quedó guardada en este punto: un fallo al subir un adjunto
  // se informa, pero no se revierte la entrada (el usuario no pierde su
  // registro de trabajo por un archivo que no subió).
  try {
    await uploadBitacoraFotos(bitacoraId, fotos);
    for (const file of csvs) {
      await uploadArchivoCsv(parsed.data.proyecto_id, parsed.data.subproyecto_id ?? null, file, profile.userId);
    }
  } catch (error) {
    revalidatePath("/bitacora");
    revalidatePath("/proyectos");
    return {
      status: "error",
      message: `La entrada se guardó, pero ${
        error instanceof Error ? error.message : "un archivo no se pudo subir."
      }`,
    };
  }

  revalidatePath("/bitacora");
  revalidatePath("/proyectos");
  revalidatePath("/kpi");
  return { status: "success", message: "Entrada registrada." };
}

export const deleteBitacoraAction = makeFormAction({
  schema: idOnlySchema,
  guard: "field",
  handler: ({ id }) => deleteBitacora(id),
  revalidate: ["/bitacora", "/proyectos", "/kpi"],
  successMessage: "Entrada eliminada.",
  permissionMessage: "Solo podés eliminar tus propias entradas.",
});
