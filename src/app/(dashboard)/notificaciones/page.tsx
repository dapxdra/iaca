import Link from "next/link";
import { BellOff, FileStack, FolderKanban } from "lucide-react";
import { alertasContent, dashboardPages } from "@/config/site";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import {
  getAlertasConfig,
  listNotificaciones,
} from "@/services/notificaciones.service";
import { DashboardPageHeader } from "../_components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { ActionButton, AlertasConfigForm } from "./notificaciones-forms";
import {
  ejecutarRevisionAction,
  marcarLeidaAction,
  marcarTodasLeidasAction,
} from "./actions";

export const dynamic = "force-dynamic";

const FILTROS = [
  { key: "no-leidas", label: "No leídas" },
  { key: "todas", label: "Todas" },
] as const;

export default async function NotificacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const [{ ver }, profile] = await Promise.all([
    searchParams,
    requireRole(["admin", "oficina"]),
  ]);
  const soloNoLeidas = ver !== "todas";
  const esAdmin = profile.role === "admin";

  const [notificaciones, config] = await Promise.all([
    listNotificaciones(soloNoLeidas),
    esAdmin ? getAlertasConfig() : Promise.resolve(null),
  ]);
  const hayNoLeidas = notificaciones.some((n) => !n.leida_at);

  return (
    <div data-cy="page-notificaciones" className="flex animate-fade-in flex-col gap-6">
      <DashboardPageHeader
        content={dashboardPages.notificaciones}
        action={
          hayNoLeidas ? (
            <ActionButton
              action={marcarTodasLeidasAction}
              label={alertasContent.marcarTodasLabel}
              toastTitle="Listo"
              dataCy="notificaciones-marcar-todas"
            />
          ) : null
        }
      />

      <section
        data-cy="notificaciones-lista"
        className="animate-rise overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-sunken px-5 py-3">
          <h2 className="text-body font-semibold text-foreground">
            {soloNoLeidas ? "No leídas" : "Todas"}
            <span className="ml-1.5 tabular-nums text-muted-foreground">
              ({notificaciones.length})
            </span>
          </h2>
          <div
            className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-raised p-0.5"
            role="group"
            aria-label="Filtrar notificaciones"
          >
            {FILTROS.map((f) => {
              const activo = (f.key === "todas") === !soloNoLeidas;
              return (
                <Link
                  key={f.key}
                  href={f.key === "todas" ? "/notificaciones?ver=todas" : "/notificaciones"}
                  data-cy={`notificaciones-filtro-${f.key}`}
                  aria-current={activo ? "true" : undefined}
                  className={`rounded-[4px] px-2.5 py-1 text-small font-medium transition-colors ${
                    activo
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
        </header>

        {notificaciones.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={alertasContent.vacioTitulo}
            description={soloNoLeidas ? alertasContent.vacioNoLeidas : alertasContent.vacioTodas}
            dataCy="notificaciones-vacio"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {notificaciones.map((n) => {
              const Icon = n.tipo === "tramite_sin_movimiento" ? FileStack : FolderKanban;
              const leida = Boolean(n.leida_at);
              return (
                <li
                  key={n.id}
                  data-cy={`notificacion-${n.id}`}
                  className={`flex flex-wrap items-start gap-x-4 gap-y-3 px-5 py-4 ${
                    leida ? "" : "bg-accent/5"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${
                      leida
                        ? "border-border text-muted-foreground"
                        : "border-warning/40 bg-warning/12 text-warning"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 basis-60">
                    <p
                      className={`text-body ${
                        leida ? "text-muted-foreground" : "font-semibold text-foreground"
                      }`}
                    >
                      {!leida && <span className="sr-only">No leída: </span>}
                      {n.titulo}
                    </p>
                    <p className="mt-0.5 text-small text-muted-foreground">{n.mensaje}</p>
                    <p className="mt-1 text-small text-muted-foreground">
                      {formatDate(n.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={n.enlace}
                      data-cy={`notificacion-ver-${n.id}`}
                      className="rounded-md px-2 py-1 text-small font-semibold text-accent transition-colors hover:text-primary hover:underline"
                    >
                      Ver
                    </Link>
                    {!leida && (
                      <ActionButton
                        action={marcarLeidaAction}
                        id={n.id}
                        label={alertasContent.marcarLeidaLabel}
                        toastTitle="Listo"
                        variant="ghost"
                        dataCy={`notificacion-leida-${n.id}`}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {config && (
        <Section
          title={alertasContent.configTitulo}
          dataCy="alertas-config"
          action={
            <ActionButton
              action={ejecutarRevisionAction}
              label={alertasContent.ejecutarLabel}
              toastTitle="Revisión completada"
              dataCy="alertas-ejecutar"
            />
          }
        >
          <p className="mb-4 text-small text-muted-foreground">
            {alertasContent.configDescripcion}
          </p>
          <AlertasConfigForm config={config} />
        </Section>
      )}
    </div>
  );
}
