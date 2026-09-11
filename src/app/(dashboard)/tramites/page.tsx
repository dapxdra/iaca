import Link from "next/link";
import { AlertTriangle, FileStack, ShieldCheck } from "lucide-react";
import { dashboardPages } from "@/config/site";
import { requireRole, isStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import {
  listTramites,
  listAlertas,
  UMBRAL_ALERTA_DIAS_DEFAULT,
} from "@/services/tramites.service";
import { listProyectoOptions } from "@/services/proyectos.service";
import { DashboardPageHeader } from "../_components/page-header";
import { TableWrap, Th, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { EstadoTramiteBadge } from "@/components/ui/badge";
import { DeleteForm } from "@/components/ui/delete-form";
import { TramiteDialog } from "./tramite-dialog";
import { deleteTramiteAction } from "./actions";

export const dynamic = "force-dynamic";

const UMBRALES = [15, 30, 45];

export default async function TramitesPage({
  searchParams,
}: {
  searchParams: Promise<{ umbral?: string }>;
}) {
  const [{ umbral }, profile] = await Promise.all([
    searchParams,
    requireRole(["admin", "oficina"]),
  ]);
  const canWrite = isStaff(profile.role);
  const umbralDias = UMBRALES.includes(Number(umbral))
    ? Number(umbral)
    : UMBRAL_ALERTA_DIAS_DEFAULT;

  const [alertas, tramites, proyectos] = await Promise.all([
    listAlertas(umbralDias),
    listTramites(),
    canWrite ? listProyectoOptions() : Promise.resolve([]),
  ]);

  return (
    <div data-cy="page-tramites" className="flex animate-fade-in flex-col gap-6">
      <DashboardPageHeader
        content={dashboardPages.tramites}
        action={
          canWrite && proyectos.length > 0 ? <TramiteDialog proyectos={proyectos} /> : null
        }
      />

      {/* Panel de alertas */}
      <section
        data-cy="tramites-alertas"
        className="animate-rise overflow-hidden rounded-lg border border-border bg-surface-raised shadow-sm"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-sunken px-5 py-3">
          <div className="flex items-center gap-2">
            {alertas.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-green-600" />
            )}
            <h2 className="text-body font-semibold text-foreground">
              Sin revisión hace {umbralDias}+ días
              <span className="ml-1.5 tabular-nums text-muted-foreground">({alertas.length})</span>
            </h2>
          </div>
          <div
            className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-raised p-0.5"
            role="group"
            aria-label="Umbral de días"
          >
            {UMBRALES.map((u) => (
              <Link
                key={u}
                href={`/tramites?umbral=${u}`}
                data-cy={`tramites-umbral-${u}`}
                aria-current={u === umbralDias ? "true" : undefined}
                className={`rounded-[4px] px-2.5 py-1 text-small font-medium tabular-nums transition-colors ${
                  u === umbralDias
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {u}
              </Link>
            ))}
          </div>
        </header>
        <div className="p-5">
          {alertas.length === 0 ? (
            <p className="flex items-center gap-2 text-small text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              Ningún trámite abierto supera el umbral.
            </p>
          ) : (
            <ul className="-my-2.5 flex flex-col divide-y divide-border">
              {alertas.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5"
                >
                  <div className="min-w-0">
                    <span className="font-medium tabular-nums text-foreground">
                      {a.proyecto_codigo}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {a.entidad} · {a.tipo_tramite}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-small text-muted-foreground">
                      envío {formatDate(a.fecha_envio)}
                    </span>
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/12 px-2 py-0.5 text-small font-semibold tabular-nums text-amber-700">
                      {a.dias_sin_revision} días
                    </span>
                    <EstadoTramiteBadge estado={a.estado} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Tabla completa */}
      {tramites.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised shadow-sm">
          <EmptyState
            icon={FileStack}
            title="Todavía no hay trámites"
            description="Registrá el primer envío a una entidad para darle seguimiento."
            action={canWrite && proyectos.length > 0 ? <TramiteDialog proyectos={proyectos} /> : null}
          />
        </div>
      ) : (
        <TableWrap data-cy="tramites-table">
          <thead>
            <tr>
              <Th>Proyecto</Th>
              <Th>Entidad</Th>
              <Th>Tipo</Th>
              <Th>Expediente</Th>
              <Th>Envío</Th>
              <Th>Últ. revisión</Th>
              <Th>Estado</Th>
              {canWrite && <Th className="w-0 text-right">Acciones</Th>}
            </tr>
          </thead>
          <tbody>
            {tramites.map((t) => (
              <tr key={t.id} data-cy={`tramite-row-${t.id}`} className="group">
                <Td className="whitespace-nowrap">
                  {t.proyecto ? (
                    <Link
                      href={`/proyectos/${t.proyecto.id}`}
                      className="tabular-nums text-accent transition-colors hover:text-primary hover:underline"
                    >
                      {t.proyecto.codigo}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="text-foreground">{t.entidad}</Td>
                <Td className="text-muted-foreground">{t.tipo_tramite}</Td>
                <Td className="tabular-nums">{t.numero_expediente ?? "—"}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(t.fecha_envio)}
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(t.fecha_ultima_revision)}
                </Td>
                <Td>
                  <EstadoTramiteBadge estado={t.estado} />
                </Td>
                {canWrite && (
                  <Td className="text-right">
                    <div className="flex justify-end gap-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <TramiteDialog proyectos={proyectos} tramite={t} />
                      <DeleteForm
                        action={deleteTramiteAction}
                        id={t.id}
                        entityLabel="este trámite"
                        dataCy={`tramite-delete-${t.id}`}
                      />
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
