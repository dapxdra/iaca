/**
 * Servicio de Trámites ante entidades gubernamentales.
 *
 * Regla de negocio clave (docs/REQUIREMENTS.md 4.5): "días sin revisión" NO
 * se almacena — se calcula en la vista `vw_tramites_sin_revision` para que la
 * alerta nunca quede desactualizada. `listAlertas` filtra esa vista por un
 * umbral de días configurable.
 *
 * Autorización: RLS (0004_...). Escritura solo admin/oficina.
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emptyToUndefined } from "@/lib/form";
import type { Database } from "@/types/database";

export type TramiteEstado = Database["public"]["Enums"]["tramite_estado"];

export const UMBRAL_ALERTA_DIAS_DEFAULT = 30;

export type Tramite = {
  id: string;
  proyecto_id: string;
  entidad: string;
  tipo_tramite: string;
  numero_expediente: string | null;
  estado: TramiteEstado;
  fecha_envio: string | null;
  fecha_ultima_revision: string | null;
  notas: string | null;
  proyecto: { id: string; codigo: string; nombre: string } | null;
};

export type TramiteAlerta = {
  id: string;
  entidad: string;
  tipo_tramite: string;
  estado: TramiteEstado;
  fecha_envio: string | null;
  fecha_ultima_revision: string | null;
  dias_sin_revision: number | null;
  proyecto_codigo: string;
  proyecto_nombre: string;
};

const SELECT =
  "id, proyecto_id, entidad, tipo_tramite, numero_expediente, estado, fecha_envio, " +
  "fecha_ultima_revision, notas, " +
  "proyecto:proyectos!tramites_gubernamentales_proyecto_id_fkey(id, codigo, nombre)";

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().max(200).optional());
const optionalDate = z.preprocess(
  emptyToUndefined,
  z.string().date("Fecha inválida").optional()
);

export const tramiteSchema = z
  .object({
    proyecto_id: z.string().uuid("Seleccioná un proyecto"),
    entidad: z.string().trim().min(2, "Requerido").max(200),
    tipo_tramite: z.string().trim().min(2, "Requerido").max(200),
    numero_expediente: optionalText,
    estado: z.enum([
      "pendiente",
      "enviado",
      "en_revision",
      "observado",
      "aprobado",
      "rechazado",
    ]),
    fecha_envio: optionalDate,
    fecha_ultima_revision: optionalDate,
    notas: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  })
  .refine((v) => v.estado === "pendiente" || v.fecha_envio, {
    message: "Registrá la fecha de envío para este estado.",
    path: ["fecha_envio"],
  });

export type TramiteInput = z.infer<typeof tramiteSchema>;

export async function listTramites(proyectoId?: string): Promise<Tramite[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tramites_gubernamentales")
    .select(SELECT)
    .order("fecha_envio", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (proyectoId) query = query.eq("proyecto_id", proyectoId);

  const { data, error } = await query;
  if (error) throw new Error("No se pudieron cargar los trámites.");
  return (data ?? []) as unknown as Tramite[];
}

/** Trámites abiertos que superan `umbralDias` sin revisión, del más viejo al más nuevo. */
export async function listAlertas(
  umbralDias: number = UMBRAL_ALERTA_DIAS_DEFAULT
): Promise<TramiteAlerta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_tramites_sin_revision")
    .select(
      "id, entidad, tipo_tramite, estado, fecha_envio, fecha_ultima_revision, dias_sin_revision, proyecto_codigo, proyecto_nombre"
    )
    .gte("dias_sin_revision", umbralDias)
    .order("dias_sin_revision", { ascending: false });
  if (error) throw new Error("No se pudieron cargar las alertas de trámites.");
  return (data ?? []) as unknown as TramiteAlerta[];
}

export async function createTramite(input: TramiteInput): Promise<void> {
  const data = tramiteSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("tramites_gubernamentales").insert(data);
  if (error) throw new Error("No se pudo crear el trámite.");
}

export async function updateTramite(id: string, input: TramiteInput): Promise<void> {
  const data = tramiteSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("tramites_gubernamentales")
    .update(data)
    .eq("id", id);
  if (error) throw new Error("No se pudo actualizar el trámite.");
}

export async function deleteTramite(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tramites_gubernamentales").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar el trámite.");
}
