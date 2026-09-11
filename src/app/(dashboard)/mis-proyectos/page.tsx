import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { dashboardPages } from "@/config/site";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listProyectos } from "@/services/proyectos.service";
import { DashboardPageHeader } from "../_components/page-header";
import { TableWrap, Th, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { EstadoProyectoBadge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

/**
 * Portal de cliente — RLS (`proyectos_select` en 0005_...) ya filtra por
 * `cliente_id`, así que `listProyectos()` sin filtros devuelve exactamente
 * "sus" proyectos y ninguno ajeno. Vista de solo lectura: sin crear, editar
 * ni eliminar.
 */
export default async function MisProyectosPage() {
  await requireRole(["cliente"]);
  const proyectos = await listProyectos();

  return (
    <div data-cy="page-mis-proyectos" className="flex animate-fade-in flex-col gap-6">
      <DashboardPageHeader content={dashboardPages["mis-proyectos"]} />

      {proyectos.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised shadow-sm">
          <EmptyState
            icon={FolderKanban}
            title="Todavía no hay proyectos"
            description="Cuando IACA registre un proyecto a tu nombre, va a aparecer acá."
          />
        </div>
      ) : (
        <TableWrap data-cy="mis-proyectos-table">
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Nombre</Th>
              <Th>Estado</Th>
              <Th>Zona</Th>
              <Th>Entrega est.</Th>
              <Th className="w-0" />
            </tr>
          </thead>
          <tbody>
            {proyectos.map((p) => (
              <tr key={p.id} data-cy={`mi-proyecto-row-${p.id}`}>
                <Td className="whitespace-nowrap font-medium tabular-nums">
                  <Link
                    href={`/mis-proyectos/${p.id}`}
                    className="text-accent transition-colors hover:text-primary hover:underline"
                  >
                    {p.codigo}
                  </Link>
                </Td>
                <Td className="text-foreground">{p.nombre}</Td>
                <Td>
                  <EstadoProyectoBadge estado={p.estado} />
                </Td>
                <Td className="text-muted-foreground">{p.zona ?? "—"}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(p.fecha_estimada_entrega)}
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/mis-proyectos/${p.id}`}
                    className="whitespace-nowrap text-small font-medium text-accent hover:underline"
                  >
                    Ver detalle
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
