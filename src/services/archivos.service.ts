/**
 * Servicio de Archivos de proyecto (CSV subidos desde la bitácora; DWG/PDF
 * quedan para una fase futura — ver README). Autorización: RLS (0005_...),
 * lectura solo "field staff" (nunca cliente).
 */
import { createClient } from "@/lib/supabase/server";
import { BUCKETS, getSignedUrls } from "@/services/storage.service";
import type { Database } from "@/types/database";

export type ArchivoTipo = Database["public"]["Enums"]["archivo_tipo"];

export type ArchivoProyecto = {
  id: string;
  tipo: ArchivoTipo;
  nombre_archivo: string;
  tamano_bytes: number | null;
  created_at: string;
  subido_por: { full_name: string } | null;
  url: string | null;
};

const SELECT =
  "id, tipo, nombre_archivo, storage_path, tamano_bytes, created_at, " +
  "subido_por:profiles!archivos_proyecto_subido_por_fkey(full_name)";

export async function listArchivosProyecto(proyectoId: string): Promise<ArchivoProyecto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("archivos_proyecto")
    .select(SELECT)
    .eq("proyecto_id", proyectoId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("No se pudieron cargar los archivos del proyecto.");

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    tipo: ArchivoTipo;
    nombre_archivo: string;
    storage_path: string;
    tamano_bytes: number | null;
    created_at: string;
    subido_por: { full_name: string } | null;
  }>;

  const urls = await getSignedUrls(
    BUCKETS.archivosProyecto,
    rows.map((r) => r.storage_path)
  );

  return rows.map(({ storage_path, ...r }) => ({
    ...r,
    url: urls.get(storage_path) ?? null,
  }));
}
