/**
 * Sincronización de bitácora desde el dispositivo de campo.
 *
 * Todo es idempotente: los ids (entrada, fotos, CSV) los genera el cliente y
 * viajan en cada intento, así que reenviar lo mismo después de un corte de
 * señal nunca duplica nada. Es la base para la cola offline: el dispositivo
 * puede reintentar cuantas veces haga falta sin saber hasta dónde llegó el
 * intento anterior.
 *
 * Cada llamada a `syncBitacora` reconcilia el manifiesto con lo que ya hay
 * en el servidor:
 *   1. crea la entrada si no existe;
 *   2. registra en la base los adjuntos cuyo archivo ya está en Storage;
 *   3. devuelve una URL firmada de subida para los que todavía faltan.
 * El cliente sube esos archivos y vuelve a llamar hasta que no quede ninguno
 * pendiente (ver `src/lib/bitacora-sync.ts`).
 *
 * Autorización: la de siempre, por RLS (0004_.../0005_...). Si el id ya
 * existe y la entrada es de otro trabajador, se rechaza acá además, para no
 * emitir URLs de subida bajo una entrada ajena.
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isStaff, type SessionProfile } from "@/lib/auth";
import { bitacoraSchema } from "@/lib/bitacora-schema";
import {
  BUCKETS,
  archivoCsvPath,
  bitacoraFotoPath,
  createSignedUpload,
  getStoredFileInfo,
  type Bucket,
} from "@/services/storage.service";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_CSV_BYTES,
  MAX_CSV_MB,
  MAX_CSV_POR_ENTRADA,
  MAX_FOTO_BYTES,
  MAX_FOTO_MB,
  MAX_FOTOS_POR_ENTRADA,
  extensionOf,
} from "@/lib/uploads";

const nombreArchivo = z.string().trim().min(1).max(255);

const fotoSchema = z.object({
  id: z.string().uuid(),
  nombre: nombreArchivo,
  tipo: z.enum(ALLOWED_IMAGE_TYPES, "Imagen no soportada (JPG, PNG, WEBP o HEIC)."),
  tamano: z.number().int().positive().max(MAX_FOTO_BYTES, `Máximo ${MAX_FOTO_MB} MB por foto.`),
});

const csvSchema = z.object({
  id: z.string().uuid(),
  nombre: nombreArchivo.refine((n) => extensionOf(n) === ".csv", "Debe ser un archivo .csv."),
  tamano: z.number().int().positive().max(MAX_CSV_BYTES, `Máximo ${MAX_CSV_MB} MB por CSV.`),
});

export const bitacoraSyncSchema = z.object({
  id: z.string().uuid(),
  entrada: bitacoraSchema,
  fotos: z.array(fotoSchema).max(MAX_FOTOS_POR_ENTRADA).default([]),
  csvs: z.array(csvSchema).max(MAX_CSV_POR_ENTRADA).default([]),
});

export type BitacoraSyncInput = z.infer<typeof bitacoraSyncSchema>;

/** Un archivo que el cliente todavía tiene que subir. */
export type PendingUpload = { id: string; bucket: Bucket; path: string; token: string };

export type BitacoraSyncResult = {
  /** `true` si en esta llamada se creó la entrada o se registró algún adjunto. */
  changed: boolean;
  pendientes: PendingUpload[];
  /** Adjuntos que llegaron a Storage pero no pasan la validación; no se registran. */
  rechazados: string[];
};

/** Error que el cliente no debe reintentar: el mismo envío fallaría igual. */
export class SyncRejectedError extends Error {
  readonly status = 403;
}

type EntradaRow = { proyecto_id: string; subproyecto_id: string | null };

/** Crea la entrada con el id del cliente, o devuelve la existente si es de este usuario. */
async function ensureEntrada(
  input: BitacoraSyncInput,
  profile: SessionProfile
): Promise<{ entrada: EntradaRow; created: boolean }> {
  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("bitacora_campo")
    .insert({ ...input.entrada, id: input.id, trabajador_id: profile.userId })
    .select("proyecto_id, subproyecto_id")
    .single();

  if (inserted) return { entrada: inserted, created: true };
  // 23505 = el id ya existe: es un reintento de un envío que sí llegó.
  if (error?.code !== "23505") throw new Error("No se pudo registrar la entrada de bitácora.");

  const { data: existing } = await supabase
    .from("bitacora_campo")
    .select("proyecto_id, subproyecto_id, trabajador_id")
    .eq("id", input.id)
    .single();
  if (!existing || (existing.trabajador_id !== profile.userId && !isStaff(profile.role))) {
    throw new SyncRejectedError("Esta entrada pertenece a otro usuario.");
  }
  return { entrada: existing, created: false };
}

async function registeredIds(table: "bitacora_fotos" | "archivos_proyecto", ids: string[]) {
  if (ids.length === 0) return new Set<string>();
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).select("id").in("id", ids);
  if (error) throw new Error("No se pudo verificar los adjuntos.");
  return new Set((data ?? []).map((r) => r.id));
}

type Adjunto = {
  id: string;
  nombre: string;
  bucket: Bucket;
  path: string;
  maxBytes: number;
  allowedTypes?: readonly string[];
};

/**
 * Separa los adjuntos no registrados en: ya subidos y válidos (listos para
 * registrar), subidos pero inválidos, y todavía sin subir (se les emite URL).
 */
async function classify(adjuntos: Adjunto[]) {
  const listos: (Adjunto & { size: number | null })[] = [];
  const rechazados: string[] = [];
  const pendientes: PendingUpload[] = [];

  await Promise.all(
    adjuntos.map(async (a) => {
      const info = await getStoredFileInfo(a.bucket, a.path);
      if (!info) {
        const token = await createSignedUpload(a.bucket, a.path);
        pendientes.push({ id: a.id, bucket: a.bucket, path: a.path, token });
        return;
      }
      // El manifiesto ya se validó, pero el archivo lo sube el navegador
      // directo a Storage: se verifica lo que de verdad llegó, no lo declarado.
      const tooBig = info.size !== null && info.size > a.maxBytes;
      const badType =
        a.allowedTypes && !(info.contentType && a.allowedTypes.includes(info.contentType));
      if (tooBig || badType) rechazados.push(`"${a.nombre}" no cumple los límites permitidos.`);
      else listos.push({ ...a, size: info.size });
    })
  );

  return { listos, rechazados, pendientes };
}

export async function syncBitacora(
  input: BitacoraSyncInput,
  profile: SessionProfile
): Promise<BitacoraSyncResult> {
  const { entrada, created } = await ensureEntrada(input, profile);

  const [fotosRegistradas, csvsRegistrados] = await Promise.all([
    registeredIds("bitacora_fotos", input.fotos.map((f) => f.id)),
    registeredIds("archivos_proyecto", input.csvs.map((c) => c.id)),
  ]);

  // Rutas a partir de la entrada guardada, no del manifiesto: si un reintento
  // llega con otro proyecto, los CSV siguen yendo al proyecto de la entrada.
  const fotos = input.fotos
    .filter((f) => !fotosRegistradas.has(f.id))
    .map<Adjunto>((f) => ({
      id: f.id,
      nombre: f.nombre,
      bucket: BUCKETS.bitacoraFotos,
      path: bitacoraFotoPath(input.id, f.id, f.nombre),
      maxBytes: MAX_FOTO_BYTES,
      allowedTypes: ALLOWED_IMAGE_TYPES,
    }));
  const csvs = input.csvs
    .filter((c) => !csvsRegistrados.has(c.id))
    .map<Adjunto>((c) => ({
      id: c.id,
      nombre: c.nombre,
      bucket: BUCKETS.archivosProyecto,
      path: archivoCsvPath(entrada.proyecto_id, c.id, c.nombre),
      maxBytes: MAX_CSV_BYTES,
    }));

  const [fotosState, csvsState] = await Promise.all([classify(fotos), classify(csvs)]);

  const supabase = await createClient();
  // ignoreDuplicates = `on conflict do nothing`: si dos intentos corren a la
  // vez (por ejemplo, dos pestañas), el segundo no falla ni duplica.
  if (fotosState.listos.length > 0) {
    const { error } = await supabase.from("bitacora_fotos").upsert(
      fotosState.listos.map((f) => ({ id: f.id, bitacora_id: input.id, storage_path: f.path })),
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (error) throw new Error("Las fotos se subieron pero no se pudieron registrar.");
  }
  if (csvsState.listos.length > 0) {
    const { error } = await supabase.from("archivos_proyecto").upsert(
      csvsState.listos.map((c) => ({
        id: c.id,
        proyecto_id: entrada.proyecto_id,
        subproyecto_id: entrada.subproyecto_id,
        tipo: "csv" as const,
        nombre_archivo: c.nombre,
        storage_path: c.path,
        tamano_bytes: c.size,
        subido_por: profile.userId,
      })),
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (error) throw new Error("Los CSV se subieron pero no se pudieron registrar.");
  }

  return {
    changed: created || fotosState.listos.length > 0 || csvsState.listos.length > 0,
    pendientes: [...fotosState.pendientes, ...csvsState.pendientes],
    rechazados: [...fotosState.rechazados, ...csvsState.rechazados],
  };
}
