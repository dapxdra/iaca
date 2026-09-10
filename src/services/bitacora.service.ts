/**
 * Servicio de Bitácora de campo. Entradas diarias por proyecto/subproyecto.
 *
 * Autorización: RLS (0004_...). admin/oficina ven y editan todo; el rol
 * `campo` solo puede crear/editar/borrar sus propias entradas (la policy
 * compara `trabajador_id` con `auth.uid()`; el trigger lo sella al insertar).
 *
 * La carga de fotos a Supabase Storage queda para la siguiente fase — ver
 * README, "Próximos pasos".
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emptyToUndefined } from "@/lib/form";

export type BitacoraEntry = {
  id: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  actividad: string;
  equipo_utilizado: string | null;
  clima: string | null;
  observaciones: string | null;
  proyecto: { id: string; codigo: string; nombre: string } | null;
  trabajador: { id: string; full_name: string } | null;
};

const SELECT =
  "id, fecha, hora_inicio, hora_fin, actividad, equipo_utilizado, clima, observaciones, " +
  "proyecto:proyectos!bitacora_campo_proyecto_id_fkey(id, codigo, nombre), " +
  "trabajador:profiles!bitacora_campo_trabajador_id_fkey(id, full_name)";

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().max(200).optional());
const optionalTime = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM")
    .optional()
);

export const bitacoraSchema = z
  .object({
    proyecto_id: z.string().uuid("Seleccioná un proyecto"),
    subproyecto_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    fecha: z.string().date("Fecha inválida"),
    hora_inicio: optionalTime,
    hora_fin: optionalTime,
    actividad: z.string().trim().min(3, "Requerido").max(1000),
    equipo_utilizado: optionalText,
    clima: optionalText,
    observaciones: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  })
  .refine(
    (v) => !v.hora_inicio || !v.hora_fin || v.hora_fin > v.hora_inicio,
    { message: "La hora de fin debe ser posterior al inicio.", path: ["hora_fin"] }
  );

export type BitacoraInput = z.infer<typeof bitacoraSchema>;

/** Entradas más recientes; si se pasa `proyectoId`, solo las de ese proyecto. */
export async function listBitacora(opts: {
  proyectoId?: string;
  limit?: number;
} = {}): Promise<BitacoraEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("bitacora_campo")
    .select(SELECT)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);

  if (opts.proyectoId) query = query.eq("proyecto_id", opts.proyectoId);

  const { data, error } = await query;
  if (error) throw new Error("No se pudo cargar la bitácora.");
  return (data ?? []) as unknown as BitacoraEntry[];
}

export async function createBitacora(
  input: BitacoraInput,
  trabajadorId: string
): Promise<void> {
  const data = bitacoraSchema.parse(input);
  const supabase = await createClient();
  // trabajador_id se pasa explícito (y además lo sella el trigger
  // stamp_bitacora_trabajador como defensa si se inserta por fuera de la app).
  const { error } = await supabase
    .from("bitacora_campo")
    .insert({ ...data, trabajador_id: trabajadorId });
  if (error) throw new Error("No se pudo registrar la entrada de bitácora.");
}

export async function deleteBitacora(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("bitacora_campo").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar la entrada.");
}
