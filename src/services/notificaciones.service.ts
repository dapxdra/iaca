/**
 * Servicio de la bandeja de notificaciones del usuario y de la configuración
 * de alertas. La creación de notificaciones no vive acá: la hace el job diario
 * (src/services/alertas.service.ts) con service role, porque la tabla no tiene
 * política de insert para nadie.
 *
 * Autorización: RLS (0007_...). Cada usuario lee y marca solo las suyas; la
 * configuración la leen admin/oficina y la edita solo admin.
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type NotificacionTipo = Database["public"]["Enums"]["notificacion_tipo"];

export type Notificacion = {
  id: string;
  tipo: NotificacionTipo;
  titulo: string;
  mensaje: string;
  enlace: string;
  dias: number;
  leida_at: string | null;
  created_at: string;
};

export type AlertasConfig = {
  proyecto_dias: number;
  tramite_dias: number;
  recordatorio_dias: number;
  correo_activo: boolean;
};

/** Valores de la migración, por si la fila no se puede leer. */
export const ALERTAS_CONFIG_DEFAULT: AlertasConfig = {
  proyecto_dias: 15,
  tramite_dias: 30,
  recordatorio_dias: 7,
  correo_activo: true,
};

const LIMITE_LISTA = 100;

export async function listNotificaciones(soloNoLeidas: boolean): Promise<Notificacion[]> {
  const supabase = await createClient();
  let query = supabase
    .from("notificaciones")
    .select("id, tipo, titulo, mensaje, enlace, dias, leida_at, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMITE_LISTA);
  if (soloNoLeidas) query = query.is("leida_at", null);

  const { data, error } = await query;
  if (error) throw new Error("No se pudieron cargar las notificaciones.");
  return data ?? [];
}

export async function countNoLeidas(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .is("leida_at", null);
  // Es solo el contador de la barra lateral: un fallo no debe tumbar el panel.
  if (error) return 0;
  return count ?? 0;
}

export async function marcarLeida(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida_at: new Date().toISOString() })
    .eq("id", id)
    .is("leida_at", null);
  if (error) throw new Error("No se pudo marcar la notificación.");
}

export async function marcarTodasLeidas(): Promise<void> {
  const supabase = await createClient();
  // RLS limita el update a las filas del usuario actual.
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida_at: new Date().toISOString() })
    .is("leida_at", null);
  if (error) throw new Error("No se pudieron marcar las notificaciones.");
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------
const dias = (max: number) =>
  z.coerce
    .number({ message: "Ingresá un número" })
    .int("Ingresá un número entero")
    .min(1, "Mínimo 1 día")
    .max(max, `Máximo ${max} días`);

export const alertasConfigSchema = z.object({
  proyecto_dias: dias(365),
  tramite_dias: dias(365),
  recordatorio_dias: dias(90),
  // Un checkbox sin marcar no viaja en el FormData.
  correo_activo: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export async function getAlertasConfig(): Promise<AlertasConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alertas_config")
    .select("proyecto_dias, tramite_dias, recordatorio_dias, correo_activo")
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar la configuración de alertas.");
  return data ?? ALERTAS_CONFIG_DEFAULT;
}

export async function updateAlertasConfig(
  input: z.infer<typeof alertasConfigSchema>
): Promise<void> {
  const data = alertasConfigSchema.parse(input);
  const supabase = await createClient();
  // Si RLS rechaza el update (no es admin) no hay error, solo 0 filas.
  const { data: rows, error } = await supabase
    .from("alertas_config")
    .update(data)
    .eq("id", true)
    .select("id");
  if (error) throw new Error("No se pudo guardar la configuración.");
  if (!rows?.length) throw new Error("Solo un administrador puede cambiar la configuración.");
}
