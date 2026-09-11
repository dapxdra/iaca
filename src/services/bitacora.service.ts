/**
 * Servicio de Bitácora de campo. Entradas diarias por proyecto/subproyecto.
 *
 * Autorización: RLS (0004_.../0005_...). admin/oficina ven y editan todo; el
 * rol `campo` ve todas las entradas (las necesita para su trabajo diario)
 * pero solo puede crear/editar/borrar las suyas (la policy compara
 * `trabajador_id` con `auth.uid()`; el trigger lo sella al insertar); el rol
 * `cliente` no tiene acceso a bitácora en absoluto.
 *
 * Fotos: se suben a Storage desde `src/services/storage.service.ts` (llamado
 * por la Server Action de creación, que necesita el id de la entrada recién
 * creada) — acá solo se leen de vuelta con URL firmada.
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emptyToUndefined } from "@/lib/form";
import { BUCKETS, getSignedUrls } from "@/services/storage.service";

export type BitacoraFoto = { id: string; url: string | null; descripcion: string | null };

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
  fotos: BitacoraFoto[];
};

const SELECT =
  "id, fecha, hora_inicio, hora_fin, actividad, equipo_utilizado, clima, observaciones, " +
  "proyecto:proyectos!bitacora_campo_proyecto_id_fkey(id, codigo, nombre), " +
  "trabajador:profiles!bitacora_campo_trabajador_id_fkey(id, full_name), " +
  "fotos:bitacora_fotos(id, storage_path, descripcion)";

type RawFoto = { id: string; storage_path: string; descripcion: string | null };
type RawEntry = Omit<BitacoraEntry, "fotos"> & { fotos: RawFoto[] };

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
  const entries = (data ?? []) as unknown as RawEntry[];

  // URLs firmadas en un solo lote (no una llamada a Storage por foto).
  const allPaths = entries.flatMap((e) => e.fotos.map((f) => f.storage_path));
  const urls = await getSignedUrls(BUCKETS.bitacoraFotos, allPaths);

  return entries.map((e) => ({
    ...e,
    fotos: e.fotos.map((f) => ({
      id: f.id,
      descripcion: f.descripcion,
      url: urls.get(f.storage_path) ?? null,
    })),
  }));
}

/** Crea la entrada y devuelve su id (lo necesita la Server Action para subir fotos/CSV). */
export async function createBitacora(
  input: BitacoraInput,
  trabajadorId: string
): Promise<string> {
  const data = bitacoraSchema.parse(input);
  const supabase = await createClient();
  // trabajador_id se pasa explícito (y además lo sella el trigger
  // stamp_bitacora_trabajador como defensa si se inserta por fuera de la app).
  const { data: row, error } = await supabase
    .from("bitacora_campo")
    .insert({ ...data, trabajador_id: trabajadorId })
    .select("id")
    .single();
  if (error || !row) throw new Error("No se pudo registrar la entrada de bitácora.");
  return row.id;
}

export async function deleteBitacora(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("bitacora_campo").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar la entrada.");
}
