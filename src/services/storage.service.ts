/**
 * Servicio de Storage — subida de fotos de bitácora y archivos CSV de
 * proyecto a los buckets privados de Supabase (supabase/migrations/0005_...).
 * Los buckets no son públicos: toda lectura pasa por URL firmada
 * (`getSignedUrls`), nunca por una URL directa.
 *
 * Autorización: RLS de `storage.objects` (0005_...) — subir requiere
 * "field staff" (admin/oficina/campo); nunca cliente. Esto valida además el
 * tipo/tamaño de archivo en la app, porque el bucket no restringe MIME types
 * (los navegadores son inconsistentes con el MIME de un .csv).
 */
import { createClient } from "@/lib/supabase/server";
import { MAX_CSV_BYTES, MAX_FOTO_BYTES, MAX_FOTO_MB, MAX_CSV_MB } from "@/lib/uploads";

const BITACORA_FOTOS_BUCKET = "bitacora-fotos";
const ARCHIVOS_PROYECTO_BUCKET = "archivos-proyecto";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora — suficiente para ver/descargar en una sesión

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

/** `null` si el archivo es válido; si no, el mensaje de error para mostrar. */
export function validateFotoFile(file: File): string | null {
  if (file.size > MAX_FOTO_BYTES) {
    return `"${file.name}" pesa más de ${MAX_FOTO_MB} MB.`;
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `"${file.name}" no es una imagen soportada (JPG, PNG, WEBP o HEIC).`;
  }
  return null;
}

export function validateCsvFile(file: File): string | null {
  if (file.size > MAX_CSV_BYTES) {
    return `"${file.name}" pesa más de ${MAX_CSV_MB} MB.`;
  }
  if (extensionOf(file.name) !== ".csv") {
    return `"${file.name}" no es un archivo .csv.`;
  }
  return null;
}

/** Sube las fotos de una entrada de bitácora e inserta sus filas en `bitacora_fotos`. */
export async function uploadBitacoraFotos(bitacoraId: string, files: File[]): Promise<void> {
  if (files.length === 0) return;
  const supabase = await createClient();

  for (const file of files) {
    const path = `${bitacoraId}/${crypto.randomUUID()}${extensionOf(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(BITACORA_FOTOS_BUCKET)
      .upload(path, file, { contentType: file.type });
    if (uploadError) {
      throw new Error(`No se pudo subir la foto "${file.name}": ${uploadError.message}`);
    }

    const { error: insertError } = await supabase
      .from("bitacora_fotos")
      .insert({ bitacora_id: bitacoraId, storage_path: path });
    if (insertError) {
      throw new Error(`La foto "${file.name}" se subió pero no se pudo registrar.`);
    }
  }
}

/** Sube un CSV y lo registra en `archivos_proyecto` (tipo "csv"). */
export async function uploadArchivoCsv(
  proyectoId: string,
  subproyectoId: string | null,
  file: File,
  subidoPor: string
): Promise<void> {
  const supabase = await createClient();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${proyectoId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(ARCHIVOS_PROYECTO_BUCKET)
    .upload(path, file, { contentType: file.type || "text/csv" });
  if (uploadError) {
    throw new Error(`No se pudo subir "${file.name}": ${uploadError.message}`);
  }

  const { error: insertError } = await supabase.from("archivos_proyecto").insert({
    proyecto_id: proyectoId,
    subproyecto_id: subproyectoId,
    tipo: "csv",
    nombre_archivo: file.name,
    storage_path: path,
    tamano_bytes: file.size,
    subido_por: subidoPor,
  });
  if (insertError) {
    throw new Error(`"${file.name}" se subió pero no se pudo registrar.`);
  }
}

/** URLs firmadas en lote para un conjunto de rutas de un mismo bucket. */
export async function getSignedUrls(
  bucket: string,
  paths: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return map;

  for (const item of data) {
    if (item.signedUrl && !item.error) map.set(item.path ?? "", item.signedUrl);
  }
  return map;
}

export const BUCKETS = {
  bitacoraFotos: BITACORA_FOTOS_BUCKET,
  archivosProyecto: ARCHIVOS_PROYECTO_BUCKET,
} as const;
