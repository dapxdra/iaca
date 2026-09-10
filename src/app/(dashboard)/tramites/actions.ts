"use server";

import { z } from "zod";
import { makeFormAction, idOnlySchema } from "@/lib/action";
import {
  tramiteSchema,
  createTramite,
  updateTramite,
  deleteTramite,
} from "@/services/tramites.service";

export const createTramiteAction = makeFormAction({
  schema: tramiteSchema,
  handler: (data) => createTramite(data),
  revalidate: ["/tramites", "/proyectos"],
  successMessage: "Trámite registrado.",
});

// tramiteSchema lleva un .refine(), así que no tiene .extend(); se intersecta
// con el id vía .and().
export const updateTramiteAction = makeFormAction({
  schema: z.object({ id: z.string().uuid() }).and(tramiteSchema),
  handler: ({ id, ...data }) => updateTramite(id, data),
  revalidate: ["/tramites", "/proyectos"],
  successMessage: "Cambios guardados.",
});

export const deleteTramiteAction = makeFormAction({
  schema: idOnlySchema,
  handler: ({ id }) => deleteTramite(id),
  revalidate: ["/tramites", "/proyectos"],
  successMessage: "Trámite eliminado.",
});
