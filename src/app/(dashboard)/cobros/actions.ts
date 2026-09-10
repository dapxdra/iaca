"use server";

import { makeFormAction, idOnlySchema } from "@/lib/action";
import {
  montoCobrarSchema,
  registrarPagoSchema,
  setMontoCobrar,
  registrarPago,
  deletePago,
} from "@/services/cobros.service";

export const setMontoCobrarAction = makeFormAction({
  schema: montoCobrarSchema,
  handler: (data) => setMontoCobrar(data),
  revalidate: ["/cobros", "/proyectos", "/kpi"],
  successMessage: "Monto a cobrar actualizado.",
});

export const registrarPagoAction = makeFormAction({
  schema: registrarPagoSchema,
  handler: (data) => registrarPago(data),
  revalidate: ["/cobros", "/proyectos"],
  successMessage: "Pago registrado.",
});

export const deletePagoAction = makeFormAction({
  schema: idOnlySchema,
  handler: ({ id }) => deletePago(id),
  revalidate: ["/cobros", "/proyectos"],
  successMessage: "Pago eliminado.",
});
