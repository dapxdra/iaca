import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { emptyToUndefined } from "@/lib/form";
import { homeContent } from "@/config/site";
import type { Database } from "@/types/database";

/**
 * Servicio de mensajes del formulario público de contacto.
 *
 * A diferencia del resto de servicios, la escritura usa el cliente admin
 * (service role) en vez del cliente de sesión: quien envía el formulario es un
 * visitante anónimo y la tabla no tiene política de insert para nadie, porque
 * eso obliga a que todo envío pase por la validación y el anti-spam de acá.
 * Ver la cabecera de supabase/migrations/0006_contacto_mensajes.sql.
 *
 * La lectura sí usa el cliente de sesión, para que RLS decida (solo staff).
 */

export type ContactoEstado = Database["public"]["Enums"]["contacto_estado"];

export type ContactoMensaje = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  servicio: string | null;
  ubicacion: string | null;
  mensaje: string;
  estado: ContactoEstado;
  created_at: string;
};

const LIST_COLUMNS =
  "id, nombre, email, telefono, servicio, ubicacion, mensaje, estado, created_at";

// ----------------------------------------------------------------------------
// Validación
// ----------------------------------------------------------------------------

const SERVICIO_KEYS = homeContent.services.map((s) => s.key) as [string, ...string[]];

/**
 * Validación de los campos visibles. Los límites coinciden con los CHECK de la
 * migración; zod da el mensaje en español al usuario y Postgres es la red de
 * seguridad. Todo `trim()` antes de validar largos, para que " " no cuente.
 */
export const contactoFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Escriba su nombre completo.")
    .max(120, "El nombre es demasiado largo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(5, "Requerido")
    .max(200, "El correo es demasiado largo.")
    .email("Revise el correo: no parece una dirección válida."),
  telefono: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(40, "El teléfono es demasiado largo.")
      // Dígitos y los separadores habituales. Evita que el campo se use para
      // colar texto arbitrario.
      .regex(/^[\d\s+()./-]+$/, "Use solo números y los signos + ( ) - .")
      .optional()
  ),
  servicio: z.preprocess(
    emptyToUndefined,
    z.enum(SERVICIO_KEYS, { message: "Seleccione un servicio de la lista." }).optional()
  ),
  ubicacion: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(200, "La ubicación es demasiado larga.").optional()
  ),
  mensaje: z
    .string()
    .trim()
    .min(10, "Cuéntenos un poco más: al menos 10 caracteres.")
    .max(4000, "El mensaje es demasiado largo. Máximo 4000 caracteres."),
});

export type ContactoFormInput = z.infer<typeof contactoFormSchema>;

/**
 * Campos anti-spam, invisibles para una persona.
 *
 * `honeypot` se llama `sitio_web` porque los bots rellenan por el `name` del
 * campo y "website" es uno de los que más buscan. Una persona nunca lo ve, así
 * que si viene con contenido, es automatizado.
 *
 * `renderizadoEn` es la marca de tiempo en que se pintó el formulario. No va
 * firmada: es una heurística, no un control de seguridad — un bot que se tome
 * el trabajo puede falsearla, y el freno real contra volumen es el límite por
 * IP. Sirve porque la mayoría de los bots envían de inmediato y no la ajustan.
 */
export const antiSpamSchema = z.object({
  honeypot: z.string().max(0).optional().or(z.literal("")),
  renderizadoEn: z.coerce.number().int().nonnegative().optional(),
});

/** Mínimo plausible entre cargar el formulario y enviarlo. */
const MIN_TIEMPO_LLENADO_MS = 3_000;
/** Un formulario abierto hace más de 12 h probablemente es una pestaña olvidada. */
const MAX_TIEMPO_LLENADO_MS = 12 * 60 * 60 * 1_000;

/** Envíos aceptados por IP en la ventana, antes de empezar a rechazar. */
const LIMITE_POR_IP = 5;
const VENTANA_LIMITE_MS = 60 * 60 * 1_000;

export type VeredictoSpam = "ok" | "honeypot" | "demasiado_rapido" | "sospechoso";

/**
 * Clasifica un envío sin consultar la base. `honeypot` se trata distinto en la
 * acción: se le responde "éxito" al bot para no enseñarle qué lo delató.
 */
export function evaluarSpam(
  data: ContactoFormInput,
  antiSpam: z.infer<typeof antiSpamSchema>,
  ahora: number = Date.now()
): VeredictoSpam {
  if (antiSpam.honeypot) return "honeypot";

  if (antiSpam.renderizadoEn) {
    const transcurrido = ahora - antiSpam.renderizadoEn;
    if (transcurrido < MIN_TIEMPO_LLENADO_MS) return "demasiado_rapido";
    if (transcurrido > MAX_TIEMPO_LLENADO_MS) return "sospechoso";
  }

  // El spam de formularios casi siempre trae varios enlaces. Dos o más URLs en
  // una solicitud de cotización de topografía no tiene un caso de uso legítimo.
  const enlaces = data.mensaje.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (enlaces >= 2) return "sospechoso";

  // BBCode/HTML de inyección de enlaces, típico de bots de SEO.
  if (/\[\/?url|<a\s+href/i.test(data.mensaje)) return "sospechoso";

  return "ok";
}

// ----------------------------------------------------------------------------
// Escritura
// ----------------------------------------------------------------------------

/**
 * Hash irreversible de la IP, para contar envíos del mismo origen sin
 * guardar el dato personal. La sal hace que el hash no sea reversible por
 * fuerza bruta (el espacio de IPv4 es lo bastante chico como para tabularlo
 * completo si no hay sal).
 */
function hashIp(ip: string): string {
  const salt = process.env.CONTACT_IP_SALT ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export class LimiteEnviosError extends Error {
  constructor() {
    super("Ya recibimos varias solicitudes desde esta conexión. Intente de nuevo en una hora o escríbanos por WhatsApp.");
    this.name = "LimiteEnviosError";
  }
}

export type ContactoMeta = {
  /** IP del visitante, o `null` si el proxy no la reportó. */
  ip: string | null;
  userAgent: string | null;
  /** Marca el mensaje como `spam` en vez de `nuevo`, sin decírselo al emisor. */
  marcarComoSpam?: boolean;
};

/**
 * Guarda una solicitud de contacto. Lanza `LimiteEnviosError` si la IP ya
 * superó el límite de la ventana.
 */
export async function crearMensajeContacto(
  input: ContactoFormInput,
  meta: ContactoMeta
): Promise<void> {
  const data = contactoFormSchema.parse(input);
  const supabase = createAdminClient();
  const ipHash = meta.ip ? hashIp(meta.ip) : null;

  if (ipHash) {
    const desde = new Date(Date.now() - VENTANA_LIMITE_MS).toISOString();
    const { count, error } = await supabase
      .from("contacto_mensajes")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", desde);

    // Si el conteo falla, se deja pasar el envío: perder una solicitud
    // legítima de un cliente es peor que aceptar un mensaje de más.
    if (!error && (count ?? 0) >= LIMITE_POR_IP) {
      throw new LimiteEnviosError();
    }
  }

  const { error } = await supabase.from("contacto_mensajes").insert({
    nombre: data.nombre,
    email: data.email,
    telefono: data.telefono ?? null,
    servicio: data.servicio ?? null,
    ubicacion: data.ubicacion ?? null,
    mensaje: data.mensaje,
    estado: meta.marcarComoSpam ? "spam" : "nuevo",
    ip_hash: ipHash,
    // Truncado: el User-Agent es dato de diagnóstico, no necesita ser completo.
    user_agent: meta.userAgent?.slice(0, 500) ?? null,
  });

  if (error) {
    // El detalle real queda en el log del servidor; al usuario un mensaje genérico.
    console.error("[contacto] no se pudo guardar el mensaje:", error.message);
    throw new Error("No se pudo enviar la solicitud. Intente de nuevo o escríbanos por WhatsApp.");
  }
}

// ----------------------------------------------------------------------------
// Lectura (bandeja interna — RLS limita a admin/oficina)
// ----------------------------------------------------------------------------

export async function listMensajesContacto(estado?: ContactoEstado): Promise<ContactoMensaje[]> {
  const supabase = await createClient();
  let query = supabase
    .from("contacto_mensajes")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false });

  if (estado) query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) throw new Error("No se pudo cargar la bandeja de contacto.");
  return data ?? [];
}

export async function actualizarEstadoMensaje(
  id: string,
  estado: ContactoEstado
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("contacto_mensajes").update({ estado }).eq("id", id);
  if (error) throw new Error("No se pudo actualizar el mensaje.");
}
