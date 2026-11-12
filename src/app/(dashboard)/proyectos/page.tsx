import Link from "next/link";
import { ChevronRight, FolderKanban } from "lucide-react";
import { dashboardPages } from "@/config/site";
import { requireRole, isStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { parseDateRange } from "@/lib/date-range";
import {
  listProyectos,
  listTiposServicio,
  listZonas,
  type ProyectoEstado,
} from "@/services/proyectos.service";
import { listClienteOptions } from "@/services/clientes.service";
import { listProfileOptions } from "@/services/profiles.service";
import { DashboardPageHeader } from "../_components/page-header";
import { SearchField } from "../_components/search-field";
import { TableWrap, Th, Td, MobileOnly } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { EstadoProyectoBadge } from "@/components/ui/badge";
import { ProyectoDialog } from "./proyecto-dialog";
import { ProyectoFilters } from "./proyecto-filters";

export const dynamic = "force-dynamic";

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    estado?: string;
    zona?: string;
    desde?: string;
    hasta?: string;
  }>;
}) {
  const [params, profile] = await Promise.all([searchParams, requireRole(["admin", "oficina"])]);
  const canWrite = isStaff(profile.role);
  const fechaInicio = parseDateRange(params);

  const [proyectos, zonas, clientes, responsables, tiposServicio] = await Promise.all([
    listProyectos({
      search: params.q,
      estado: params.estado as ProyectoEstado | undefined,
      zona: params.zona,
      fechaInicio,
    }),
    listZonas(),
    canWrite ? listClienteOptions() : Promise.resolve([]),
    canWrite ? listProfileOptions(["admin", "oficina", "campo"]) : Promise.resolve([]),
    canWrite ? listTiposServicio() : Promise.resolve([]),
  ]);

  const hasFilters = Boolean(
    params.q || params.estado || params.zona || fechaInicio.desde || fechaInicio.hasta
  );

  return (
    <div data-cy="page-proyectos" className="flex animate-fade-in flex-col gap-6">
      <DashboardPageHeader
        content={dashboardPages.proyectos}
        action={
          canWrite && clientes.length > 0 ? (
            <ProyectoDialog
              clientes={clientes}
              responsables={responsables}
              zonas={zonas}
              tiposServicio={tiposServicio}
            />
          ) : null
        }
      />

      {canWrite && clientes.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised shadow-sm">
          <EmptyState
            icon={FolderKanban}
            title="Primero, un cliente"
            description="Los proyectos se asocian a un cliente. Creá al menos uno para empezar."
            action={
              <Link
                href="/clientes"
                className="inline-flex items-center gap-1 text-small font-medium text-accent hover:underline"
              >
                Ir a Clientes <ChevronRight className="h-4 w-4" />
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchField placeholder="Código o nombre" dataCy="proyectos-search" />
            <ProyectoFilters zonas={zonas} />
          </div>

          {proyectos.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface-raised shadow-sm">
              <EmptyState
                icon={FolderKanban}
                title={hasFilters ? "Sin coincidencias" : "Todavía no hay proyectos"}
                description={
                  hasFilters
                    ? "Ajustá la búsqueda o los filtros."
                    : "Creá el primer proyecto; el código IACA-año-NNN se asigna solo."
                }
              />
            </div>
          ) : (
            <TableWrap data-cy="proyectos-table">
              <thead>
                <tr>
                  <Th>Código</Th>
                  <Th hideOnMobile>Nombre</Th>
                  <Th hideOnMobile>Cliente</Th>
                  <Th>Estado</Th>
                  <Th hideOnMobile>Zona</Th>
                  <Th hideOnMobile>Entrega est.</Th>
                  <Th className="w-0" />
                </tr>
              </thead>
              <tbody>
                {proyectos.map((p) => (
                  <tr key={p.id} data-cy={`proyecto-row-${p.id}`} className="group">
                    <Td className="whitespace-nowrap font-medium tabular-nums">
                      <Link
                        href={`/proyectos/${p.id}`}
                        data-cy={`proyecto-link-${p.id}`}
                        className="text-accent transition-colors hover:text-primary hover:underline"
                      >
                        {p.codigo}
                      </Link>
                      <MobileOnly>
                        <span className="text-foreground">{p.nombre}</span>
                        {p.cliente && <span className="block">{p.cliente.nombre}</span>}
                      </MobileOnly>
                    </Td>
                    <Td hideOnMobile className="text-foreground">{p.nombre}</Td>
                    <Td hideOnMobile className="text-muted-foreground">{p.cliente?.nombre ?? "—"}</Td>
                    <Td>
                      <EstadoProyectoBadge estado={p.estado} />
                    </Td>
                    <Td hideOnMobile className="text-muted-foreground">{p.zona ?? "—"}</Td>
                    <Td hideOnMobile className="whitespace-nowrap text-muted-foreground">
                      {formatDate(p.fecha_estimada_entrega)}
                    </Td>
                    <Td className="text-right">
                      <Link
                        href={`/proyectos/${p.id}`}
                        aria-label={`Abrir ${p.codigo}`}
                        className="inline-grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-all duration-200 group-hover:bg-surface-sunken group-hover:text-foreground group-hover:translate-x-0.5"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </>
      )}
    </div>
  );
}
