"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { processOutbox } from "@/lib/bitacora-sync";
import {
  deleteOutboxEntry,
  listOutbox,
  subscribeOutbox,
  type OutboxEntry,
} from "@/lib/bitacora-outbox";

/** Cada cuánto se revisa si a alguna entrada ya le toca reintentar. */
const TICK_MS = 30_000;

type OutboxContextValue = {
  userId: string;
  entries: OutboxEntry[];
  online: boolean;
  syncing: boolean;
  syncNow: () => void;
  discard: (id: string) => Promise<void>;
};

const OutboxContext = createContext<OutboxContextValue | null>(null);

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** `null` fuera del provider (roles sin bitácora, p. ej. `cliente`). */
export function useOutbox() {
  return useContext(OutboxContext);
}

/**
 * Motor de sincronización de la cola de bitácora. Vive en el layout del
 * panel (solo para roles con bitácora) para que siga enviando en cualquier
 * pantalla, no solo en /bitacora.
 *
 * Dispara un intento al montar, al volver la señal (`online`, forzado), al
 * volver a la pestaña y cada `TICK_MS` (este respeta la espera entre
 * reintentos de cada entrada). iOS no tiene Background Sync: sin la app
 * abierta no se envía nada, por eso se intenta apenas se vuelve a ella.
 */
export function OutboxProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  // `navigator.onLine` solo indica si hay red local, no internet: sirve para
  // el indicador y como disparador, nunca para decidir si se envía o no.
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [syncing, setSyncing] = useState(false);

  const run = useCallback(
    async (force: boolean) => {
      try {
        const synced = await processOutbox(userId, { force, onSend: () => setSyncing(true) });
        if (synced > 0) {
          router.refresh();
          toast({
            tone: "success",
            title: "Bitácora",
            description:
              synced === 1 ? "1 entrada pendiente se sincronizó." : `${synced} entradas pendientes se sincronizaron.`,
          });
        }
      } catch {
        // IndexedDB no disponible: no hay cola que procesar.
      } finally {
        setSyncing(false);
      }
    },
    [userId, router, toast]
  );

  useEffect(() => {
    const reload = () => {
      listOutbox(userId)
        .then(setEntries)
        .catch(() => setEntries([]));
    };
    reload();
    return subscribeOutbox(reload);
  }, [userId]);

  useEffect(() => {
    void run(false);

    const onOnline = () => void run(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") void run(false);
    };
    const tick = setInterval(() => void run(false), TICK_MS);

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [run]);

  const value = useMemo<OutboxContextValue>(
    () => ({
      userId,
      entries,
      online,
      syncing,
      syncNow: () => void run(true),
      discard: deleteOutboxEntry,
    }),
    [userId, entries, online, syncing, run]
  );

  return <OutboxContext.Provider value={value}>{children}</OutboxContext.Provider>;
}
