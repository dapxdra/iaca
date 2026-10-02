"use client";

import { useEffect, useState } from "react";
import { CloudOff, FolderX, LogIn, Wifi } from "lucide-react";
import { offlineCaptureContent as t, siteConfig } from "@/config/site";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BitacoraForm } from "@/components/offline/bitacora-form";
import { OutboxPanel } from "@/components/offline/outbox-panel";
import { InstallPrompt } from "@/components/offline/install-prompt";
import { OutboxProvider, useOutbox } from "@/components/offline/outbox-provider";
import {
  getOfflineProyectos,
  getOfflineSession,
  type OfflineProyecto,
  type OfflineSession,
} from "@/lib/bitacora-outbox";
import { registerServiceWorker } from "@/lib/service-worker";

type State =
  | { status: "loading" }
  | { status: "no-session" }
  | { status: "ready"; session: OfflineSession; proyectos: OfflineProyecto[] };

// Enlaces con <a> y no con <Link>: Link precarga por fetch, que sin señal
// falla; una navegación completa la atiende el service worker.

function CampoStatus({ fullName }: { fullName: string }) {
  const online = useOutbox()?.online ?? true;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-small">
      <p className="text-muted-foreground">
        {t.userLabel} <span className="font-semibold text-foreground">{fullName}</span>
      </p>
      <div className="flex items-center gap-3">
        <span
          data-cy="campo-connection"
          className={`inline-flex items-center gap-1.5 font-medium ${online ? "text-success" : "text-warning"}`}
        >
          {online ? (
            <Wifi className="h-4 w-4" aria-hidden="true" />
          ) : (
            <CloudOff className="h-4 w-4" aria-hidden="true" />
          )}
          {online ? t.onlineLabel : t.offlineLabel}
        </span>
        <a href="/bitacora" data-cy="campo-panel-link" className="font-medium text-accent hover:underline">
          {t.panelLabel}
        </a>
      </div>
    </div>
  );
}

/**
 * Captura de bitácora que funciona sin servidor: usuario y proyectos salen
 * de lo que el panel dejó en IndexedDB (`OfflineSetup`), y cada entrada va a
 * la cola local, que se envía sola al volver la señal (`OutboxProvider`).
 */
export function CampoCapture() {
  const [state, setState] = useState<State>({ status: "loading" });
  // Cambiar la key vuelve a montar el formulario: queda vacío y con un id de
  // entrada nuevo para la siguiente.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    registerServiceWorker();
    Promise.all([getOfflineSession(), getOfflineProyectos()])
      .then(([session, proyectos]) =>
        setState(session ? { status: "ready", session, proyectos } : { status: "no-session" })
      )
      .catch(() => setState({ status: "no-session" }));
  }, []);

  return (
    <main id="contenido" data-cy="page-campo" className="min-h-svh bg-background">
      <header className="border-b border-ink/60 bg-ink px-4 py-3 text-paper">
        <p className="mx-auto max-w-2xl text-h3 font-semibold tracking-tight">{siteConfig.name}</p>
      </header>

      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
        <div>
          <h1 className="text-h3 font-semibold text-foreground">{t.title}</h1>
          <p className="mt-1.5 text-body text-muted-foreground">{t.description}</p>
        </div>

        {state.status === "loading" && <p className="text-small text-muted-foreground">{t.loading}</p>}

        {state.status === "no-session" && (
          <div className="rounded-lg border border-border bg-surface-raised shadow-sm">
            <EmptyState
              icon={LogIn}
              title={t.noSessionTitle}
              description={t.noSessionDescription}
              dataCy="campo-no-session"
              action={
                <a href="/login" className={buttonClass("primary", "sm")}>
                  {t.noSessionAction}
                </a>
              }
            />
          </div>
        )}

        {state.status === "ready" && (
          <OutboxProvider userId={state.session.userId}>
            <CampoStatus fullName={state.session.fullName} />
            <InstallPrompt />
            <OutboxPanel />
            {state.proyectos.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface-raised shadow-sm">
                <EmptyState
                  icon={FolderX}
                  title={t.noProyectosTitle}
                  description={t.noProyectosDescription}
                  dataCy="campo-no-proyectos"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-surface-raised p-5 shadow-sm">
                <BitacoraForm
                  key={formKey}
                  ownerId={state.session.userId}
                  proyectos={state.proyectos}
                  onDone={() => setFormKey((k) => k + 1)}
                />
              </div>
            )}
          </OutboxProvider>
        )}
      </div>
    </main>
  );
}
