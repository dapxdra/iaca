import Link from "next/link";
import { dashboardPages } from "@/config/site";
import { requireProfile, isStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import {
  listProyectos,
  listZonas,
  type ProyectoEstado,
} from "@/services/proyectos.service";
import { listClienteOptions } from "@/services/clientes.service";
import { listProfileOptions } from "@/services/profiles.service";
import { DashboardPageHeader } from "../_components/page-header";
import { SearchField } from "../_components/search-field";
import { TableWrap, Th, Td, EmptyRow } from "@/components/ui/table";
import { EstadoProyectoBadge } from "@/components/ui/badge";
import { ProyectoDialog } from "./proyecto-dialog";
import { ProyectoFilters } from "./proyecto-filters";

export const dynamic = "force-dynamic";

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; zona?: string }>;
}) {
  const [params, profile] = await Promise.all([searchParams, requireProfile()]);
  const canWrite = isStaff(profile.role);

  const [proyectos, zonas, clientes, responsables] = await Promise.all([
    listProyectos({
      search: params.q,
      estado: params.estado as ProyectoEstado | undefined,
      zona: params.zona,
    }),
    listZonas(),
    canWrite ? listClienteOptions() : Promise.resolve([]),
    canWrite ? listProfileOptions(["admin", "oficina", "campo"]) : Promise.resolve([]),
  ]);

  return (
    <div data-cy="page-proyectos" className="flex flex-col gap-6">
      <DashboardPageHeader
        content={dashboardPages.proyectos}
        action={
          canWrite && clientes.length > 0 ? (
            <ProyectoDialog clientes={clientes} responsables={responsables} zonas={zonas} />
          ) : null
        }
      />

      {canWrite && clientes.length === 0 && (
        <p className="border border-border bg-surface px-4 py-3 text-small text-muted-foreground">
          Creá al menos un <Link href="/clientes" className="text-primary underline">cliente</Link>{" "}
          antes de registrar proyectos.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SearchField placeholder="Código o nombre" dataCy="proyectos-search" />
        <ProyectoFilters zonas={zonas} />
      </div>

      <TableWrap data-cy="proyectos-table">
        <thead>
          <tr>
            <Th>Código</Th>
            <Th>Nombre</Th>
            <Th>Cliente</Th>
            <Th>Estado</Th>
            <Th>Zona</Th>
            <Th>Entrega est.</Th>
          </tr>
        </thead>
        <tbody>
          {proyectos.length === 0 ? (
            <EmptyRow colSpan={6}>No hay proyectos que coincidan.</EmptyRow>
          ) : (
            proyectos.map((p) => (
              <tr key={p.id} data-cy={`proyecto-row-${p.id}`}>
                <Td className="whitespace-nowrap font-medium">
                  <Link
                    href={`/proyectos/${p.id}`}
                    data-cy={`proyecto-link-${p.id}`}
                    className="text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    {p.codigo}
                  </Link>
                </Td>
                <Td className="text-foreground">{p.nombre}</Td>
                <Td>{p.cliente?.nombre ?? "—"}</Td>
                <Td>
                  <EstadoProyectoBadge estado={p.estado} />
                </Td>
                <Td>{p.zona ?? "—"}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(p.fecha_estimada_entrega)}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}
