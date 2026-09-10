import { dashboardPages } from "@/config/site";
import { requireProfile, isStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listClientes } from "@/services/clientes.service";
import { DashboardPageHeader } from "../_components/page-header";
import { SearchField } from "../_components/search-field";
import { TableWrap, Th, Td, EmptyRow } from "@/components/ui/table";
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
  const [{ q }, profile] = await Promise.all([searchParams, requireProfile()]);
  const canWrite = isStaff(profile.role);
  const clientes = await listClientes(q);

  return (
    <div data-cy="page-clientes" className="flex flex-col gap-6">
      <DashboardPageHeader
        content={dashboardPages.clientes}
        action={canWrite ? <ClienteDialog /> : null}
      />

      <SearchField placeholder="Nombre, identificación o correo" dataCy="clientes-search" />

      <TableWrap data-cy="clientes-table">
        <thead>
          <tr>
            <Th>Nombre</Th>
            <Th>Tipo</Th>
            <Th>Identificación</Th>
            <Th>Contacto</Th>
            <Th>Alta</Th>
            {canWrite && <Th className="w-px whitespace-nowrap text-right">Acciones</Th>}
          </tr>
        </thead>
        <tbody>
          {clientes.length === 0 ? (
            <EmptyRow colSpan={canWrite ? 6 : 5}>
              {q ? "Ningún cliente coincide con la búsqueda." : "Todavía no hay clientes."}
            </EmptyRow>
          ) : (
            clientes.map((c) => (
              <tr key={c.id} data-cy={`cliente-row-${c.id}`}>
                <Td className="font-medium text-foreground">{c.nombre}</Td>
                <Td>{TIPO_LABEL[c.tipo]}</Td>
                <Td>{c.identificacion ?? "—"}</Td>
                <Td>
                  <div className="flex flex-col">
                    <span>{c.email ?? "—"}</span>
                    <span className="text-muted-foreground">{c.telefono ?? ""}</span>
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(c.created_at)}
                </Td>
                {canWrite && (
                  <Td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
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
            ))
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}
