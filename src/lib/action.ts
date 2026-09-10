/**
 * Fábrica de Server Actions de formulario. Centraliza el patrón repetido en
 * todos los CRUD del panel:
 *   1. verificar sesión + rol (sin redirect — devuelve error de permiso),
 *   2. validar el FormData con zod (errores por campo),
 *   3. ejecutar el handler del servicio,
 *   4. revalidar rutas y devolver un `FormState`.
 *
 * Se importa desde archivos "use server"; no lleva la directiva porque no
 * exporta acciones directamente, solo las construye.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionProfile, isStaff } from "@/lib/auth";
import { parseForm, type FormState } from "@/lib/form";

const GENERIC_ERROR = "No se pudo completar la operación. Intentá de nuevo.";

type Guard = "staff" | "auth";

export function makeFormAction<S extends z.ZodType>(opts: {
  schema: S;
  guard?: Guard;
  handler: (data: z.infer<S>, ctx: { userId: string }) => Promise<void>;
  revalidate: string | string[];
  successMessage: string;
  permissionMessage?: string;
}) {
  const { schema, guard = "staff", handler, revalidate, successMessage } = opts;

  return async function action(_prev: FormState, formData: FormData): Promise<FormState> {
    const profile = await getSessionProfile();
    if (!profile || (guard === "staff" && !isStaff(profile.role))) {
      return {
        status: "error",
        message: opts.permissionMessage ?? "No tenés permiso para realizar esta acción.",
      };
    }

    const parsed = parseForm(schema, formData);
    if (!parsed.ok) return parsed.state;

    try {
      await handler(parsed.data, { userId: profile.userId });
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : GENERIC_ERROR,
      };
    }

    for (const path of Array.isArray(revalidate) ? revalidate : [revalidate]) {
      revalidatePath(path);
    }
    return { status: "success", message: successMessage };
  };
}

/** Schema mínimo para acciones de borrado: solo `id`. */
export const idOnlySchema = z.object({ id: z.string().uuid() });
