/**
 * Lado navegador de la sincronización de bitácora (el servidor es
 * `src/services/bitacora-sync.service.ts`, vía `/api/sync/bitacora`).
 *
 * Toda entrada pasa primero por la cola local (`bitacora-outbox.ts`) y
 * recién después se intenta enviar: si no hay señal, ya quedó guardada en el
 * dispositivo y se reintenta sola (`processOutbox`, disparado por
 * `OutboxProvider`). Se borra de la cola solo cuando el servidor confirma.
 *
 * Un envío: manda el manifiesto (campos + metadatos de adjuntos con ids del
 * cliente) → sube directo a Storage los archivos que el servidor reporta
 * como pendientes → vuelve a mandar el manifiesto para que los registre.
 * Cada paso se puede repetir sin duplicar nada.
 */
import { createClient } from "@/lib/supabase/client";
import { toFieldErrors, type FormState } from "@/lib/form";
import { bitacoraSchema } from "@/lib/bitacora-schema";
import type { PendingUpload } from "@/services/bitacora-sync.service";
import {
  MAX_CSV_POR_ENTRADA,
  MAX_FOTOS_POR_ENTRADA,
  validateCsvFile,
  validateFotoFile,
} from "@/lib/uploads";
import { compressPhoto } from "@/lib/image-compression";
import {
  deleteOutboxEntry,
  listOutbox,
  putOutboxEntry,
  updateOutboxEntry,
  type OutboxEntry,
  type SyncManifest,
} from "@/lib/bitacora-outbox";

const SYNC_URL = "/api/sync/bitacora";

/** Rondas de subida por envío; cada una reintenta solo lo que falta. */
const MAX_UPLOAD_ROUNDS = 2;

/** Espera antes del reintento automático N (el último se repite). */
const BACKOFF_MS = [30_000, 2 * 60_000, 10 * 60_000, 30 * 60_000];

/**
 * Margen antes de que el reintento automático tome una entrada recién
 * encolada: el formulario ya la está enviando, y dos envíos simultáneos de lo
 * mismo, aunque inofensivos, dan dos avisos de "sincronizada".
 */
const FRESH_ENTRY_GRACE_MS = 60_000;

type SyncResponse = { pendientes: PendingUpload[]; rechazados: string[] };

type SyncOutcome =
  | { kind: "ok" }
  /** Sin conexión: no cuenta como intento fallido, se espera a tener red. */
  | { kind: "offline" }
  | { kind: "transient" | "auth"; message: string }
  | { kind: "rejected"; message: string; fieldErrors?: Record<string, string> };

/**
 * Los errores de validación de la entrada vuelven como `entrada.<campo>`; se
 * les quita el prefijo para pintarlos bajo cada input. Los de adjuntos no
 * tienen input propio y van como mensaje general.
 */
function rejectedFrom(body: { message?: string; fieldErrors?: Record<string, string> } | null): SyncOutcome {
  const message = body?.message ?? "El servidor rechazó la entrada.";
  const all = body?.fieldErrors ?? {};
  const fieldErrors = Object.fromEntries(
    Object.entries(all)
      .filter(([key]) => key.startsWith("entrada."))
      .map(([key, value]) => [key.slice("entrada.".length), value])
  );
  if (Object.keys(fieldErrors).length > 0) return { kind: "rejected", message, fieldErrors };
  return { kind: "rejected", message: Object.values(all)[0] ?? message };
}

async function postManifest(
  manifest: SyncManifest
): Promise<{ ok: true; data: SyncResponse } | { ok: false; outcome: SyncOutcome }> {
  let res: Response;
  try {
    res = await fetch(SYNC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manifest),
    });
  } catch {
    return { ok: false, outcome: { kind: "offline" } };
  }
  const body = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: body as SyncResponse };
  // Ver el contrato de códigos en src/app/api/sync/bitacora/route.ts.
  if (res.status === 401) {
    return { ok: false, outcome: { kind: "auth", message: "Iniciá sesión de nuevo para enviarla." } };
  }
  if (res.status === 403 || res.status === 422) return { ok: false, outcome: rejectedFrom(body) };
  return { ok: false, outcome: { kind: "transient", message: "El servidor no respondió bien." } };
}

/**
 * De a un archivo por vez: con señal débil, subidas en paralelo se reparten
 * el ancho de banda y fallan todas juntas en vez de terminar alguna.
 */
async function uploadPending(pendientes: PendingUpload[], files: Map<string, File>) {
  const supabase = createClient();
  for (const p of pendientes) {
    const file = files.get(p.id);
    if (!file) continue;
    // El resultado se ignora a propósito: la siguiente llamada al servidor
    // verifica qué llegó de verdad a Storage y reemite URL para lo que falte.
    await supabase.storage
      .from(p.bucket)
      .uploadToSignedUrl(p.path, p.token, file, { contentType: file.type || "text/csv" })
      .catch(() => null);
  }
}

async function sendEntry(entry: OutboxEntry): Promise<SyncOutcome> {
  const files = new Map(entry.files.map((f) => [f.id, f.file]));

  let result = await postManifest(entry.manifest);
  for (let round = 0; result.ok && result.data.pendientes.length > 0 && round < MAX_UPLOAD_ROUNDS; round++) {
    await uploadPending(result.data.pendientes, files);
    result = await postManifest(entry.manifest);
  }
  if (!result.ok) return result.outcome;

  const { pendientes, rechazados } = result.data;
  if (pendientes.length > 0) {
    return {
      kind: "transient",
      message: `La entrada llegó; faltan ${pendientes.length} archivo(s) por subir.`,
    };
  }
  if (rechazados.length > 0) {
    return { kind: "rejected", message: `La entrada se guardó, pero ${rechazados.join(" ")}` };
  }
  return { kind: "ok" };
}

/** Envía una entrada de la cola y deja la cola en el estado que corresponde. */
async function syncEntry(entry: OutboxEntry): Promise<SyncOutcome> {
  const outcome = await sendEntry(entry);
  if (outcome.kind === "ok") {
    await deleteOutboxEntry(entry.id);
  } else if (outcome.kind === "transient") {
    const delay = BACKOFF_MS[Math.min(entry.attempts, BACKOFF_MS.length - 1)];
    await updateOutboxEntry(entry.id, {
      attempts: entry.attempts + 1,
      nextAttemptAt: Date.now() + delay,
      error: { kind: "transient", message: outcome.message },
    });
  } else if (outcome.kind !== "offline") {
    await updateOutboxEntry(entry.id, { error: { kind: outcome.kind, message: outcome.message } });
  }
  return outcome;
}

let processing = false;

/**
 * Recorre la cola del usuario y envía lo que toca. `force` ignora la espera
 * entre reintentos (volvió la señal, o el usuario tocó "Sincronizar ahora").
 * `onSend` avisa antes de cada envío real (para el indicador; la mayoría de
 * las llamadas no encuentran nada que enviar). Devuelve cuántas entradas
 * quedaron sincronizadas.
 */
export async function processOutbox(
  ownerId: string,
  { force = false, onSend }: { force?: boolean; onSend?: () => void } = {}
): Promise<number> {
  const run = async () => {
    let synced = 0;
    for (const entry of await listOutbox(ownerId)) {
      if (entry.error?.kind === "rejected") continue;
      if (!force && entry.nextAttemptAt > Date.now()) continue;
      onSend?.();
      const outcome = await syncEntry(entry);
      if (outcome.kind === "ok") synced++;
      // Sin red o sin sesión, las demás fallarían igual: se corta acá.
      if (outcome.kind === "offline" || outcome.kind === "auth") break;
    }
    return synced;
  };

  // Una sola pestaña sincroniza a la vez (Web Locks); si otra ya lo está
  // haciendo, esta no hace nada. El flag cubre navegadores sin Web Locks.
  if (navigator.locks) {
    return navigator.locks.request("iaca-outbox-sync", { ifAvailable: true }, (lock) =>
      lock ? run() : 0
    );
  }
  if (processing) return 0;
  processing = true;
  try {
    return await run();
  } finally {
    processing = false;
  }
}

// El mismo `File` conserva su id entre reintentos del formulario: así el
// servidor reconoce lo que ya subió y no lo duplica.
const fileIds = new WeakMap<File, string>();
function idFor(file: File): string {
  let id = fileIds.get(file);
  if (!id) {
    id = crypto.randomUUID();
    fileIds.set(file, id);
  }
  return id;
}

function filesOf(formData: FormData, key: string, max: number): File[] {
  return formData
    .getAll(key)
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, max);
}

/**
 * Guarda la entrada en la cola y la intenta enviar en el acto. `bitacoraId`
 * lo genera el formulario una vez y lo reusa en cada reintento: es lo que
 * hace que tocar "Registrar" de nuevo tras un error no cree otra entrada.
 *
 * Valida antes de encolar (con el mismo schema que el servidor): sin señal
 * no hay quien avise del error, y la entrada quedaría trabada en la cola.
 *
 * `onSynced` corre solo si la entrada llegó al servidor. Sirve para refrescar
 * la página: hacerlo sin señal haría que Next, al fallar el refresco, cayera
 * a una navegación completa y mostrara la página de error del navegador.
 */
export async function enqueueBitacora(opts: {
  ownerId: string;
  bitacoraId: string;
  formData: FormData;
  proyectoLabel: (proyectoId: string) => string;
  onSynced: () => void;
}): Promise<FormState> {
  const { ownerId, bitacoraId, formData } = opts;
  const entrada = Object.fromEntries(
    Array.from(formData.entries()).filter((e): e is [string, string] => typeof e[1] === "string")
  );
  const parsed = bitacoraSchema.safeParse(entrada);
  if (!parsed.success) {
    return { status: "error", message: "Revisá los campos marcados.", fieldErrors: toFieldErrors(parsed.error) };
  }

  // De a una: decodificar varias fotos grandes a la vez puede agotar la
  // memoria de un teléfono de gama baja. El límite de tamaño se valida
  // después, sobre lo que de verdad se va a guardar y subir.
  const fotos: File[] = [];
  for (const original of filesOf(formData, "fotos", MAX_FOTOS_POR_ENTRADA)) {
    fotos.push(await compressPhoto(original));
  }
  const csvs = filesOf(formData, "csv", MAX_CSV_POR_ENTRADA);
  const invalid = [...fotos.map(validateFotoFile), ...csvs.map(validateCsvFile)].find(Boolean);
  if (invalid) return { status: "error", message: invalid };

  const files = [...fotos, ...csvs].map((file) => ({ id: idFor(file), file }));
  const entry: OutboxEntry = {
    id: bitacoraId,
    ownerId,
    createdAt: Date.now(),
    manifest: {
      id: bitacoraId,
      entrada,
      fotos: fotos.map((f) => ({ id: idFor(f), nombre: f.name, tipo: f.type, tamano: f.size })),
      csvs: csvs.map((f) => ({ id: idFor(f), nombre: f.name, tamano: f.size })),
    },
    files,
    resumen: {
      proyecto: opts.proyectoLabel(parsed.data.proyecto_id),
      fecha: parsed.data.fecha,
      actividad: parsed.data.actividad,
    },
    attempts: 0,
    nextAttemptAt: Date.now() + FRESH_ENTRY_GRACE_MS,
    error: null,
  };

  try {
    await putOutboxEntry(entry);
  } catch {
    // Sin IndexedDB (modo privado de algunos navegadores, almacenamiento
    // lleno): se intenta igual el envío directo, sin red de seguridad.
    const outcome = await sendEntry(entry);
    if (outcome.kind === "ok") {
      opts.onSynced();
      return { status: "success", message: "Entrada registrada." };
    }
    return {
      status: "error",
      message:
        outcome.kind === "offline"
          ? "Sin conexión, y este navegador no permite guardar la entrada en el dispositivo."
          : outcome.message,
    };
  }

  const outcome = await syncEntry(entry);
  switch (outcome.kind) {
    case "ok":
      opts.onSynced();
      return { status: "success", message: "Entrada registrada." };
    case "offline":
      return {
        status: "success",
        message: "Sin señal: quedó guardada en este dispositivo y se enviará sola al volver la conexión.",
      };
    case "transient":
      return {
        status: "success",
        message: `Quedó guardada en este dispositivo y se reintentará sola. ${outcome.message}`,
      };
    case "auth":
      return { status: "success", message: `Quedó guardada en este dispositivo. ${outcome.message}` };
    case "rejected":
      // El formulario sigue abierto con los datos: se saca de la cola para
      // que el usuario corrija y reenvíe, en vez de dejarla trabada ahí.
      await deleteOutboxEntry(entry.id);
      return { status: "error", message: outcome.message, fieldErrors: outcome.fieldErrors };
  }
}
