"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { makeFormAction, idOnlySchema } from "@/lib/action";
import { getSessionProfile } from "@/lib/auth";
import type { FormState } from "@/lib/form";
import {
  alertasConfigSchema,
  marcarLeida,
  marcarTodasLeidas,
  updateAlertasConfig,
} from "@/services/notificaciones.service";
import { ejecutarRevisionAlertas } from "@/services/alertas.service";

export const marcarLeidaAction = makeFormAction({
  schema: idOnlySchema,
  handler: ({ id }) => marcarLeida(id),
  revalidate: "/notificaciones",
  successMessage: "Notificación marcada como leída.",
});

export const marcarTodasLeidasAction = makeFormAction({
  schema: z.object({}),
  handler: () => marcarTodasLeidas(),
  revalidate: "/notificaciones",
  successMessage: "Todas las notificaciones quedaron como leídas.",
});

export const updateAlertasConfigAction = makeFormAction({
  schema: alertasConfigSchema,
  handler: (data) => updateAlertasConfig(data),
  revalidate: ["/notificaciones", "/tramites"],
  successMessage: "Configuración guardada.",
});

/**
 * Corre la misma revisión que el cron diario. Usa service role por dentro,
 * así que el permiso se valida acá: solo admin (no hay RLS que lo frene).
 */
export async function ejecutarRevisionAction(): Promise<FormState> {
  const profile = await getSessionProfile();
  if (profile?.role !== "admin") {
    return { status: "error", message: "Solo un administrador puede ejecutar la revisión." };
  }

  try {
    const r = await ejecutarRevisionAlertas();
    revalidatePath("/notificaciones");
    return {
      status: "success",
      message: `${r.proyectos} proyecto(s) y ${r.tramites} trámite(s) sin movimiento · ${r.notificaciones} aviso(s) nuevo(s) · ${r.correos} correo(s).`,
    };
  } catch (error) {
    console.error("[notificaciones] revisión manual", error);
    return { status: "error", message: "No se pudo completar la revisión. Intentá de nuevo." };
  }
}
