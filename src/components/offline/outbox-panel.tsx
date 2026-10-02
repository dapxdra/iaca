"use client";

import { CloudOff, Paperclip, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { OutboxEntry } from "@/lib/bitacora-outbox";
import { useOutbox } from "@/components/offline/outbox-provider";

const timeFmt = new Intl.DateTimeFormat("es-CR", { hour: "2-digit", minute: "2-digit" });

function EstadoEntrada({ entry, online }: { entry: OutboxEntry; online: boolean }) {
  const { error } = entry;
  if (error?.kind === "rejected") {
    return <p className="text-small font-medium text-danger">{error.message}</p>;
  }
  if (error?.kind === "auth") {
    return <p className="text-small font-medium text-warning">{error.message}</p>;
  }
  if (!online) {
    return <p className="text-small text-muted-foreground">Esperando conexión.</p>;
  }
  if (error) {
    return (
      <p className="text-small text-muted-foreground">
        {error.message} Próximo intento: {timeFmt.format(entry.nextAttemptAt)}.
      </p>
    );
  }
  return <p className="text-small text-muted-foreground">Pendiente de envío.</p>;
}

/**
 * Entradas guardadas en este dispositivo que todavía no llegaron al
 * servidor. No aparecen en la tabla de abajo (que es lo que ya está en la
 * base) hasta que se sincronizan.
 */
export function OutboxPanel() {
  const outbox = useOutbox();
  if (!outbox || outbox.entries.length === 0) return null;

  const { entries, online, syncing, syncNow, discard } = outbox;

  return (
    <section
      id="pendientes"
      data-cy="outbox-panel"
      aria-labelledby="pendientes-title"
      className="scroll-mt-20 rounded-lg border border-warning/30 bg-surface-raised shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {online ? (
            <RefreshCw className={`h-4 w-4 text-warning ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />
          ) : (
            <CloudOff className="h-4 w-4 text-warning" aria-hidden="true" />
          )}
          <h2 id="pendientes-title" className="text-small font-semibold text-foreground">
            Sin sincronizar ({entries.length})
          </h2>
          <span className="text-small text-muted-foreground">· guardadas en este dispositivo</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={syncNow}
          loading={syncing}
          data-cy="outbox-sync-now"
        >
          Sincronizar ahora
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {entries.map((entry) => (
          <li
            key={entry.id}
            data-cy={`outbox-entry-${entry.id}`}
            className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-small text-muted-foreground">
                <span className="tabular-nums font-medium text-foreground">{entry.resumen.proyecto}</span>
                <span>{formatDate(entry.resumen.fecha)}</span>
                {entry.files.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                    {entry.files.length}
                  </span>
                )}
              </p>
              <p className="mt-0.5 line-clamp-2 text-foreground">{entry.resumen.actividad}</p>
              <div className="mt-1">
                <EstadoEntrada entry={entry} online={online} />
              </div>
            </div>
            {/* Solo se ofrece descartar lo que el servidor rechazó: una entrada
                que solo espera señal se va a enviar sola, y borrarla sería
                perder el registro de trabajo. */}
            {entry.error?.kind === "rejected" && (
              <Button
                variant="danger"
                size="sm"
                data-cy={`outbox-discard-${entry.id}`}
                onClick={() => {
                  if (window.confirm("¿Descartar esta entrada? Se borra de este dispositivo.")) {
                    void discard(entry.id);
                  }
                }}
              >
                Descartar
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
