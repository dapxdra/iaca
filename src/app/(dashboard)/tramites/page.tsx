import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { dashboardPages } from "@/config/site";
import { requireProfile, isStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import {
  listTramites,
  listAlertas,
  UMBRAL_ALERTA_DIAS_DEFAULT,
} from "@/services/tramites.service";
import { listProyectoOptions } from "@/services/proyectos.service";
import { DashboardPageHeader } from "../_components/page-header";
import { TableWrap, Th, Td, EmptyRow } from "@/components/ui/table";
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
  const [{ umbral }, profile] = await Promise.all([searchParams, requireProfile()]);
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
    <div data-cy="page-tramites" className="flex flex-col gap-6">
      <DashboardPageHeader
        content={dashboardPages.tramites}
        action={
          canWrite && proyectos.length > 0 ? <TramiteDialog proyectos={proyectos} /> : null
        }
      />

      {/* Panel de alertas */}
      <section data-cy="tramites-alertas" className="border border-border">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-body font-semibold text-foreground">
              Sin revisión hace {umbralDias}+ días ({alertas.length})
            </h2>
          </div>
          <div className="flex items-center gap-1 text-small">
            <span className="text-muted-foreground">Umbral:</span>
            {UMBRALES.map((u) => (
              <Link
                key={u}
                href={`/tramites?umbral=${u}`}
                data-cy={`tramites-umbral-${u}`}
                className={`px-2 py-0.5 ${
                  u === umbralDias
                    ? "bg-primary text-primary-foreground"
                    : "text-primary underline underline-offset-2"
                }`}
              >
                {u}
              </Link>
            ))}
          </div>
        </header>
        <div className="p-4">
          {alertas.length === 0 ? (
            <p className="text-small text-muted-foreground">
              Ningún trámite abierto supera el umbral. 👍
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {alertas.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div>
                    <span className="font-medium text-foreground">{a.proyecto_codigo}</span>{" "}
                    <span className="text-muted-foreground">
                      · {a.entidad} · {a.tipo_tramite}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-small text-muted-foreground">
                      envío {formatDate(a.fecha_envio)}
                    </span>
                    <span className="border border-amber-600/50 bg-amber-600/10 px-2 py-0.5 text-small font-semibold text-amber-700">
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
            {canWrite && <Th className="w-px whitespace-nowrap text-right">Acciones</Th>}
          </tr>
        </thead>
        <tbody>
          {tramites.length === 0 ? (
            <EmptyRow colSpan={canWrite ? 8 : 7}>Todavía no hay trámites registrados.</EmptyRow>
          ) : (
            tramites.map((t) => (
              <tr key={t.id} data-cy={`tramite-row-${t.id}`}>
                <Td className="whitespace-nowrap">
                  {t.proyecto ? (
                    <Link
                      href={`/proyectos/${t.proyecto.id}`}
                      className="text-primary underline underline-offset-2"
                    >
                      {t.proyecto.codigo}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="text-foreground">{t.entidad}</Td>
                <Td>{t.tipo_tramite}</Td>
                <Td>{t.numero_expediente ?? "—"}</Td>
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
                  <Td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
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
            ))
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}
