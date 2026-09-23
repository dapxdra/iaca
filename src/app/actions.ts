"use server";

import { headers } from "next/headers";
import { contactFormContent } from "@/config/site";
import { parseForm, type FormState } from "@/lib/form";
import {
  antiSpamSchema,
  contactoFormSchema,
  crearMensajeContacto,
  evaluarSpam,
  LimiteEnviosError,
} from "@/services/contacto.service";

/**
 * Server Actions del sitio público. Hoy solo el formulario de contacto.
 *
 * Es el único punto de entrada a `contacto_mensajes`: la tabla no tiene
 * política de insert en RLS, así que ningún cliente puede escribirla por la
 * API de Supabase salteándose esta validación.
 */

/**
 * Extrae la IP del visitante de las cabeceras del proxy.
 *
 * `x-forwarded-for` es una lista "cliente, proxy1, proxy2" y el primer valor es
 * el cliente original. Ojo: la cabecera es falsificable si el servidor no está
 * detrás de un proxy que la reescriba. Acá solo alimenta el límite de envíos
 * —una heurística anti-abuso, no una decisión de seguridad—, así que el riesgo
 * de que alguien la falsee es que evada su propio límite, nada más.
 */
async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? null;
}

export async function enviarMensajeContacto(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = parseForm(contactoFormSchema, formData);
  if (!parsed.ok) return parsed.state;

  const antiSpam = antiSpamSchema.safeParse({
    honeypot: formData.get("honeypot") ?? "",
    renderizadoEn: formData.get("renderizadoEn") ?? undefined,
  });

  // Un anti-spam ilegible solo lo produce un cliente manipulado: se responde
  // como si hubiera funcionado, sin guardar nada.
  if (!antiSpam.success) {
    return { status: "success", message: contactFormContent.successMessage };
  }

  const veredicto = evaluarSpam(parsed.data, antiSpam.data);

  // Al bot se le responde éxito a propósito: si se le dice "detectamos spam",
  // itera hasta encontrar qué lo delata. Con un éxito falso, se va convencido.
  if (veredicto === "honeypot") {
    return { status: "success", message: contactFormContent.successMessage };
  }

  if (veredicto === "demasiado_rapido") {
    return {
      status: "error",
      message: "El envío fue demasiado rápido. Revise los datos y vuelva a intentarlo.",
    };
  }

  const h = await headers();

  try {
    await crearMensajeContacto(parsed.data, {
      ip: await getClientIp(),
      userAgent: h.get("user-agent"),
      // Los sospechosos se guardan marcados como spam en vez de descartarse:
      // si el filtro se equivoca, la solicitud legítima sigue en la bandeja y
      // se puede recuperar. Al emisor se le responde éxito igual.
      marcarComoSpam: veredicto === "sospechoso",
    });
  } catch (error) {
    if (error instanceof LimiteEnviosError) {
      return { status: "error", message: error.message };
    }
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo enviar la solicitud. Intente de nuevo.",
    };
  }

  return { status: "success", message: contactFormContent.successMessage };
}
