"use client";

import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";
import { useOutbox } from "@/components/offline/outbox-provider";

/**
 * Indicador compacto para la barra del panel (fondo tinta): sin conexión y/o
 * cuántas entradas de bitácora esperan sincronizarse. No muestra nada cuando
 * todo está al día, para no ocupar espacio en el caso normal.
 */
export function OutboxStatus({ onNavigate }: { onNavigate?: () => void }) {
  const outbox = useOutbox();
  if (!outbox) return null;

  const { entries, online, syncing } = outbox;
  if (online && entries.length === 0) return null;

  const needsAction = entries.some((e) => e.error?.kind === "rejected" || e.error?.kind === "auth");
  const label =
    entries.length === 0
      ? "Sin conexión"
      : `${entries.length} sin sincronizar${online ? "" : " · sin conexión"}`;

  return (
    <Link
      href="/bitacora#pendientes"
      onClick={onNavigate}
      data-cy="outbox-status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[0.8125rem] font-medium text-paper/85 transition-colors hover:bg-white/10 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
    >
      {!online ? (
        <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <RefreshCw
          className={`h-3.5 w-3.5 shrink-0 ${syncing ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{label}</span>
      {/* Punto decorativo (el texto ya dice el estado): rojo si hay algo que
          requiere al usuario, ámbar si solo está esperando. */}
      {entries.length > 0 && (
        <span
          aria-hidden="true"
          className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${needsAction ? "bg-red-500" : "bg-amber-400"}`}
        />
      )}
    </Link>
  );
}
