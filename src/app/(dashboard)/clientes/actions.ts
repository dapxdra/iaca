"use server";

import { z } from "zod";
import { makeFormAction, idOnlySchema } from "@/lib/action";
import {
  clienteSchema,
  createCliente,
  updateCliente,
  deleteCliente,
} from "@/services/clientes.service";

export const createClienteAction = makeFormAction({
  schema: clienteSchema,
  handler: (data) => createCliente(data).then(() => undefined),
  revalidate: "/clientes",
  successMessage: "Cliente creado.",
});

export const updateClienteAction = makeFormAction({
  schema: clienteSchema.extend({ id: z.string().uuid() }),
  handler: ({ id, ...data }) => updateCliente(id, data),
  revalidate: ["/clientes", "/proyectos"],
  successMessage: "Cambios guardados.",
});

export const deleteClienteAction = makeFormAction({
  schema: idOnlySchema,
  handler: ({ id }) => deleteCliente(id),
  revalidate: "/clientes",
  successMessage: "Cliente eliminado.",
});
