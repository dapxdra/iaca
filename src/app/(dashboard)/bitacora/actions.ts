"use server";

import { makeFormAction, idOnlySchema } from "@/lib/action";
import {
  bitacoraSchema,
  createBitacora,
  deleteBitacora,
} from "@/services/bitacora.service";

// guard "auth": el rol `campo` también registra bitácora (RLS restringe a que
// sea sobre sus propias entradas).
export const createBitacoraAction = makeFormAction({
  schema: bitacoraSchema,
  guard: "auth",
  handler: (data, ctx) => createBitacora(data, ctx.userId),
  revalidate: ["/bitacora", "/proyectos", "/kpi"],
  successMessage: "Entrada registrada.",
});

export const deleteBitacoraAction = makeFormAction({
  schema: idOnlySchema,
  guard: "auth",
  handler: ({ id }) => deleteBitacora(id),
  revalidate: ["/bitacora", "/proyectos", "/kpi"],
  successMessage: "Entrada eliminada.",
  permissionMessage: "Solo podés eliminar tus propias entradas.",
});
