/**
 * Límites y validación de adjuntos de bitácora — código puro (sin acceso a
 * datos) para que lo usen tanto el navegador (avisar antes de enviar) como el
 * Route Handler de sincronización (validar de verdad en el servidor).
 * `storage.service.ts` toca `@/lib/supabase/server` (depende de
 * `next/headers`) y por eso no se puede importar desde el cliente.
 */
export const MAX_FOTOS_POR_ENTRADA = 4;
export const MAX_FOTO_MB = 5;
export const MAX_FOTO_BYTES = MAX_FOTO_MB * 1024 * 1024;

export const MAX_CSV_POR_ENTRADA = 2;
export const MAX_CSV_MB = 10;
export const MAX_CSV_BYTES = MAX_CSV_MB * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

/**
 * `null` si el archivo es válido; si no, el mensaje de error para mostrar.
 * Se aplica a la foto ya comprimida (src/lib/image-compression.ts): solo
 * falla si no se pudo comprimir (p. ej. HEIC fuera de Safari) y es grande.
 */
export function validateFotoFile(file: File): string | null {
  if (file.size > MAX_FOTO_BYTES) {
    return `"${file.name}" pesa más de ${MAX_FOTO_MB} MB y este navegador no pudo comprimirla.`;
  }
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
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
