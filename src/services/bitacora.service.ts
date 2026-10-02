/**
 * Servicio de Bitácora de campo. Entradas diarias por proyecto/subproyecto.
 *
 * Autorización: RLS (0004_.../0005_...). admin/oficina ven y editan todo; el
 * rol `campo` ve todas las entradas (las necesita para su trabajo diario)
 * pero solo puede crear/editar/borrar las suyas (la policy compara
 * `trabajador_id` con `auth.uid()`; el trigger lo sella al insertar); el rol
 * `cliente` no tiene acceso a bitácora en absoluto.
 *
 * Creación: la entrada y sus adjuntos se registran por
 * `src/services/bitacora-sync.service.ts` (idempotente, pensado para
 * conexión intermitente) — acá solo se listan y borran, y las fotos se leen
 * de vuelta con URL firmada.
 */
import { createClient } from "@/lib/supabase/server";
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

export async function deleteBitacora(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("bitacora_campo").delete().eq("id", id);
  if (error) throw new Error("No se pudo eliminar la entrada.");
}
