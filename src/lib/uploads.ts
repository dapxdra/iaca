/**
 * Límites de adjuntos de bitácora — constantes puras (sin acceso a datos) para
 * que las pueda importar tanto el Client Component del formulario (mostrar el
 * límite, cortar la selección) como `storage.service.ts` (validar de verdad
 * en el servidor). `storage.service.ts` toca `@/lib/supabase/server`
 * (depende de `next/headers`) y por eso no se puede importar desde el cliente.
 */
export const MAX_FOTOS_POR_ENTRADA = 4;
export const MAX_FOTO_MB = 5;
export const MAX_FOTO_BYTES = MAX_FOTO_MB * 1024 * 1024;

export const MAX_CSV_POR_ENTRADA = 2;
export const MAX_CSV_MB = 10;
export const MAX_CSV_BYTES = MAX_CSV_MB * 1024 * 1024;
