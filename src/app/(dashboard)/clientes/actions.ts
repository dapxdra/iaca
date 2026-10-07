"use server";

import { z } from "zod";
import { makeFormAction, idOnlySchema } from "@/lib/action";
import { emptyToUndefined } from "@/lib/form";
import {
  clienteSchema,
  createCliente,
  updateCliente,
  deleteCliente,
} from "@/services/clientes.service";
import {
  darAccesoPortal,
  quitarAccesoPortal,
  validarAccesoPortal,
} from "@/services/portal-clientes.service";

// "invitar" = dar acceso o reenviar la invitación; "quitar" = quitar acceso.
const portalSchema = z.preprocess(emptyToUndefined, z.enum(["invitar", "quitar"]).optional());

export const createClienteAction = makeFormAction({
  schema: clienteSchema.extend({ portal: portalSchema }),
  handler: async ({ portal, ...data }) => {
    if (portal === "invitar") await validarAccesoPortal(data.email);
    const id = await createCliente(data);
    if (portal !== "invitar") return;
    try {
      await darAccesoPortal(id);
      return "Cliente creado. Le enviamos la invitación al portal.";
    } catch (error) {
      // La ficha ya existe: se informa como éxito parcial para que no se
      // vuelva a enviar el formulario y se duplique el cliente.
      const detalle = error instanceof Error ? error.message : "";
      return `Cliente creado, pero falló la invitación al portal. ${detalle} Podés reintentar desde Editar.`;
    }
  },
  revalidate: "/clientes",
  successMessage: "Cliente creado.",
});

export const updateClienteAction = makeFormAction({
  schema: clienteSchema.extend({ id: z.string().uuid(), portal: portalSchema }),
  handler: async ({ id, portal, ...data }) => {
    if (portal === "invitar") await validarAccesoPortal(data.email, id);
    await updateCliente(id, data);
    if (portal === "invitar") {
      await darAccesoPortal(id);
      return "Cambios guardados. Le enviamos la invitación al portal.";
    }
    if (portal === "quitar") {
      await quitarAccesoPortal(id);
      return "Cambios guardados. El cliente ya no tiene acceso al portal.";
    }
  },
  revalidate: ["/clientes", "/proyectos"],
  successMessage: "Cambios guardados.",
});

export const deleteClienteAction = makeFormAction({
  schema: idOnlySchema,
  handler: ({ id }) => deleteCliente(id),
  revalidate: "/clientes",
  successMessage: "Cliente eliminado.",
});
