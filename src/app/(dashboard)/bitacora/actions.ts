"use server";

import { makeFormAction, idOnlySchema } from "@/lib/action";
import { deleteBitacora } from "@/services/bitacora.service";

// La creación no es una Server Action: va por `/api/sync/bitacora` (ver
// src/app/api/sync/bitacora/route.ts para el porqué).

export const deleteBitacoraAction = makeFormAction({
  schema: idOnlySchema,
  guard: "field",
  handler: ({ id }) => deleteBitacora(id),
  revalidate: ["/bitacora", "/proyectos", "/kpi"],
  successMessage: "Entrada eliminada.",
  permissionMessage: "Solo podés eliminar tus propias entradas.",
});
