import { Users } from "lucide-react";
import { dashboardPages } from "@/config/site";
import { requireRole, isStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listClientes } from "@/services/clientes.service";
import { DashboardPageHeader } from "../_components/page-header";
import { SearchField } from "../_components/search-field";
import { TableWrap, Th, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteForm } from "@/components/ui/delete-form";
import { ClienteDialog } from "./cliente-dialog";
import { deleteClienteAction } from "./actions";

export const dynamic = "force-dynamic";

const TIPO_LABEL = {
  persona_fisica: "Física",
  persona_juridica: "Jurídica",
} as const;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, profile] = await Promise.all([searchParams, requireRole(["admin", "oficina"])]);
  const canWrite = isStaff(profile.role);
  const clientes = await listClientes(q);

  return (
    <div data-cy="page-clientes" className="flex animate-fade-in flex-col gap-6">
      <DashboardPageHeader
        content={dashboardPages.clientes}
        action={canWrite ? <ClienteDialog /> : null}
      />

      <SearchField placeholder="Nombre, identificación o correo" dataCy="clientes-search" />

      {clientes.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised shadow-sm">
          <EmptyState
            icon={Users}
            title={q ? "Sin coincidencias" : "Todavía no hay clientes"}
            description={
              q
                ? "Probá con otro nombre, identificación o correo."
                : "Registrá el primer cliente para empezar a crear proyectos."
            }
            action={!q && canWrite ? <ClienteDialog /> : null}
            dataCy="clientes-empty"
          />
        </div>
      ) : (
        <TableWrap data-cy="clientes-table">
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Tipo</Th>
              <Th>Identificación</Th>
              <Th>Contacto</Th>
              <Th>Alta</Th>
              {canWrite && <Th className="w-0 text-right">Acciones</Th>}
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} data-cy={`cliente-row-${c.id}`} className="group">
                <Td className="font-medium text-foreground">{c.nombre}</Td>
                <Td className="text-muted-foreground">{TIPO_LABEL[c.tipo]}</Td>
                <Td className="tabular-nums">{c.identificacion ?? "—"}</Td>
                <Td>
                  <div className="flex flex-col">
                    <span>{c.email ?? "—"}</span>
                    {c.telefono && (
                      <span className="text-muted-foreground tabular-nums">{c.telefono}</span>
                    )}
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(c.created_at)}
                </Td>
                {canWrite && (
                  <Td className="text-right">
                    <div className="flex justify-end gap-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <ClienteDialog cliente={c} />
                      <DeleteForm
                        action={deleteClienteAction}
                        id={c.id}
                        entityLabel={`el cliente "${c.nombre}"`}
                        dataCy={`cliente-delete-${c.id}`}
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
