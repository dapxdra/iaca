/**
 * Cola local ("outbox") de entradas de bitácora pendientes de sincronizar,
 * en IndexedDB: sobrevive a recargas, a cerrar el navegador y a quedarse sin
 * batería. Guarda los archivos como `File` (IndexedDB acepta Blobs), así que
 * las fotos viajan con la entrada aunque se haya cerrado el formulario.
 *
 * Cada entrada lleva `ownerId`: en un teléfono compartido, lo que dejó en
 * cola un trabajador nunca se envía con la sesión de otro (el servidor
 * sellaría la entrada a nombre de quien esté logueado).
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type SyncManifest = {
  id: string;
  entrada: Record<string, string>;
  fotos: { id: string; nombre: string; tipo: string; tamano: number }[];
  csvs: { id: string; nombre: string; tamano: number }[];
};

export type OutboxError = {
  /** `auth`: falta iniciar sesión. `rejected`: el servidor no la acepta; reintentar no sirve. */
  kind: "transient" | "auth" | "rejected";
  message: string;
};

export type OutboxEntry = {
  id: string;
  ownerId: string;
  createdAt: number;
  manifest: SyncManifest;
  files: { id: string; file: File }[];
  /** Lo que se muestra en la lista de pendientes. */
  resumen: { proyecto: string; fecha: string; actividad: string };
  attempts: number;
  nextAttemptAt: number;
  error: OutboxError | null;
};

/** Quién usó el panel por última vez en este dispositivo (para `/campo`). */
export type OfflineSession = { userId: string; fullName: string };

export type OfflineProyecto = { id: string; codigo: string; nombre: string };

interface OutboxDB extends DBSchema {
  outbox: { key: string; value: OutboxEntry; indexes: { byOwner: string } };
  /** Datos de referencia para capturar sin señal: sesión y proyectos. */
  kv: { key: "session" | "proyectos"; value: OfflineSession | OfflineProyecto[] };
}

let dbPromise: Promise<IDBPDatabase<OutboxDB>> | null = null;

function db() {
  dbPromise ??= openDB<OutboxDB>("iaca-offline", 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore("outbox", { keyPath: "id" }).createIndex("byOwner", "ownerId");
      }
      if (oldVersion < 2) database.createObjectStore("kv");
    },
  });
  return dbPromise;
}

// Cambios → listeners de esta pestaña y, por BroadcastChannel, de las demás
// (el indicador de pendientes de otra pestaña abierta también se actualiza).
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function notify() {
  listeners.forEach((fn) => fn());
  channel?.postMessage("changed");
}

export function subscribeOutbox(fn: () => void): () => void {
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel("iaca-outbox");
    channel.onmessage = () => listeners.forEach((l) => l());
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function listOutbox(ownerId: string): Promise<OutboxEntry[]> {
  const entries = await (await db()).getAllFromIndex("outbox", "byOwner", ownerId);
  return entries.sort((a, b) => a.createdAt - b.createdAt);
}

export async function putOutboxEntry(entry: OutboxEntry): Promise<void> {
  await (await db()).put("outbox", entry);
  // Sin esto el navegador puede borrar IndexedDB cuando le falta espacio (y
  // Safari lo hace tras 7 días sin uso si la app no está instalada).
  // Se ignora el resultado: si lo niega, la cola funciona igual.
  void navigator.storage?.persist?.();
  notify();
}

export async function updateOutboxEntry(id: string, patch: Partial<OutboxEntry>): Promise<void> {
  const database = await db();
  const current = await database.get("outbox", id);
  if (!current) return;
  await database.put("outbox", { ...current, ...patch });
  notify();
}

export async function deleteOutboxEntry(id: string): Promise<void> {
  await (await db()).delete("outbox", id);
  notify();
}

// ---------------------------------------------------------------------------
// Datos de referencia para `/campo` (la captura que abre sin señal). Esa
// página es estática: no puede preguntarle al servidor quién es el usuario
// ni qué proyectos hay, así que el panel los deja guardados acá cada vez que
// se abre con señal.
// ---------------------------------------------------------------------------

export async function saveOfflineSession(session: OfflineSession): Promise<void> {
  await (await db()).put("kv", session, "session");
}

export async function getOfflineSession(): Promise<OfflineSession | null> {
  return ((await (await db()).get("kv", "session")) as OfflineSession | undefined) ?? null;
}

/**
 * Al cerrar sesión: `/campo` deja de ofrecer capturar a nombre de este
 * usuario, y un teléfono sin sesión no deja a la vista la lista de
 * proyectos. La cola no se toca — sigue siendo suya y se envía cuando vuelva.
 */
export async function clearOfflineSession(): Promise<void> {
  const database = await db();
  await Promise.all([database.delete("kv", "session"), database.delete("kv", "proyectos")]);
}

export async function saveOfflineProyectos(proyectos: OfflineProyecto[]): Promise<void> {
  await (await db()).put("kv", proyectos, "proyectos");
}

export async function getOfflineProyectos(): Promise<OfflineProyecto[]> {
  return ((await (await db()).get("kv", "proyectos")) as OfflineProyecto[] | undefined) ?? [];
}
