/**
 * Servicio de Storage — fotos de bitácora y archivos CSV de proyecto en los
 * buckets privados de Supabase (supabase/migrations/0005_...). Los buckets no
 * son públicos: toda lectura pasa por URL firmada (`getSignedUrls`), nunca
 * por una URL directa.
 *
 * Subidas: el navegador sube directo a Storage con una URL firmada de subida
 * (`createSignedUpload`) que emite el servidor después de validar. Los
 * archivos no pasan por nuestro servidor: así no chocan con el límite de
 * tamaño de cuerpo de las funciones (≈4.5 MB en Vercel) y cada archivo se
 * reintenta por separado con conexión inestable.
 *
 * Autorización: RLS de `storage.objects` (0005_...) — emitir la URL de subida
 * requiere permiso de insert, que solo tiene "field staff"
 * (admin/oficina/campo); nunca cliente.
 */
import { createClient } from "@/lib/supabase/server";
import { extensionOf } from "@/lib/uploads";

const BITACORA_FOTOS_BUCKET = "bitacora-fotos";
const ARCHIVOS_PROYECTO_BUCKET = "archivos-proyecto";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora — suficiente para ver/descargar en una sesión

export const BUCKETS = {
  bitacoraFotos: BITACORA_FOTOS_BUCKET,
  archivosProyecto: ARCHIVOS_PROYECTO_BUCKET,
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

/**
 * Las rutas se derivan solo de ids generados por el cliente, sin nada
 * aleatorio del lado del servidor: un reintento apunta siempre al mismo
 * objeto, y así un archivo ya subido no se duplica.
 */
export function bitacoraFotoPath(bitacoraId: string, fotoId: string, filename: string): string {
  return `${bitacoraId}/${fotoId}${extensionOf(filename)}`;
}

export function archivoCsvPath(proyectoId: string, archivoId: string, filename: string): string {
  const safeName = filename.replace(/[^\w.\-]+/g, "_");
  return `${proyectoId}/${archivoId}-${safeName}`;
}

/** URL firmada para que el navegador suba un archivo a `path` (válida 2 horas). */
export async function createSignedUpload(bucket: Bucket, path: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new Error("No se pudo preparar la subida de un archivo.");
  return data.token;
}

/** Tamaño y tipo de un objeto ya subido, o `null` si no existe (todavía). */
export async function getStoredFileInfo(
  bucket: Bucket,
  path: string
): Promise<{ size: number | null; contentType: string | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).info(path);
  if (error || !data) return null;
  return { size: data.size ?? null, contentType: data.contentType ?? null };
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
