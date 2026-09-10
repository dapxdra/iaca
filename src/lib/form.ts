/**
 * Contrato compartido entre Server Actions y formularios cliente
 * (`useActionState`). Toda acción de formulario devuelve un `FormState`.
 */
import { z } from "zod";

export type FormState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export const idleFormState: FormState = { status: "idle" };

/** Aplana `ZodError` a `{ campo: "primer mensaje" }` para pintar bajo cada input. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

/**
 * Valida `FormData` contra un schema y devuelve `data` o un `FormState` de
 * error listo para retornar desde la acción. Centraliza el patrón repetido en
 * cada acción de CRUD.
 */
export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData
): { ok: true; data: z.infer<T> } | { ok: false; state: FormState } {
  const raw = Object.fromEntries(formData);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Revisá los campos marcados.",
        fieldErrors: toFieldErrors(parsed.error),
      },
    };
  }
  return { ok: true, data: parsed.data };
}

/** `""` (input vacío) → `undefined`, para campos opcionales. */
export const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;
