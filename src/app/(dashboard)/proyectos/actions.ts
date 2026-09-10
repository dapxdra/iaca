"use server";

import { z } from "zod";
import { makeFormAction, idOnlySchema } from "@/lib/action";
import {
  proyectoSchema,
  cambiarEstadoSchema,
  subproyectoSchema,
  createProyecto,
  updateProyecto,
  deleteProyecto,
  cambiarEstado,
  createSubproyecto,
  deleteSubproyecto,
} from "@/services/proyectos.service";

export const createProyectoAction = makeFormAction({
  schema: proyectoSchema,
  handler: (data) => createProyecto(data).then(() => undefined),
  revalidate: ["/proyectos", "/cobros", "/kpi"],
  successMessage: "Proyecto creado.",
});

export const updateProyectoAction = makeFormAction({
  schema: proyectoSchema.extend({ id: z.string().uuid() }),
  handler: ({ id, ...data }) => updateProyecto(id, data),
  revalidate: ["/proyectos", "/cobros", "/kpi"],
  successMessage: "Cambios guardados.",
});

export const deleteProyectoAction = makeFormAction({
  schema: idOnlySchema,
  handler: ({ id }) => deleteProyecto(id),
  revalidate: ["/proyectos", "/cobros", "/kpi"],
  successMessage: "Proyecto eliminado.",
});

export const cambiarEstadoAction = makeFormAction({
  schema: cambiarEstadoSchema,
  handler: (data) => cambiarEstado(data),
  revalidate: ["/proyectos", "/kpi"],
  successMessage: "Estado actualizado.",
});

export const createSubproyectoAction = makeFormAction({
  schema: subproyectoSchema,
  handler: (data) => createSubproyecto(data),
  revalidate: "/proyectos",
  successMessage: "Subproyecto agregado.",
});

export const deleteSubproyectoAction = makeFormAction({
  schema: idOnlySchema,
  handler: ({ id }) => deleteSubproyecto(id),
  revalidate: "/proyectos",
  successMessage: "Subproyecto eliminado.",
});
