import Link from "next/link";
import { dashboardPages } from "@/config/site";
import { requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listBitacora } from "@/services/bitacora.service";
import { listProyectoOptions } from "@/services/proyectos.service";
import { DashboardPageHeader } from "../_components/page-header";
import { TableWrap, Th, Td, EmptyRow } from "@/components/ui/table";
import { DeleteForm } from "@/components/ui/delete-form";
import { BitacoraDialog } from "./bitacora-dialog";
import { deleteBitacoraAction } from "./actions";

export const dynamic = "force-dynamic";

function horas(inicio: string | null, fin: string | null) {
  if (!inicio && !fin) return "—";
  return `${inicio?.slice(0, 5) ?? "··"} – ${fin?.slice(0, 5) ?? "··"}`;
}

export default async function BitacoraPage() {
  // Toda persona autenticada (incluye rol campo) puede ver y registrar.
  await requireProfile();
  const [entradas, proyectos] = await Promise.all([
    listBitacora({ limit: 150 }),
    listProyectoOptions(),
  ]);

  return (
    <div data-cy="page-bitacora" className="flex flex-col gap-6">
      <DashboardPageHeader
        content={dashboardPages.bitacora}
        action={
          proyectos.length > 0 ? <BitacoraDialog proyectos={proyectos} /> : null
        }
      />

      {proyectos.length === 0 && (
        <p className="border border-border bg-surface px-4 py-3 text-small text-muted-foreground">
          No hay proyectos activos. Pedí a la oficina que cree uno en{" "}
          <Link href="/proyectos" className="text-primary underline">
            Proyectos
          </Link>
          .
        </p>
      )}

      <TableWrap data-cy="bitacora-table">
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Proyecto</Th>
            <Th>Actividad</Th>
            <Th>Horario</Th>
            <Th>Trabajador</Th>
            <Th>Equipo</Th>
            <Th className="w-px" />
          </tr>
        </thead>
        <tbody>
          {entradas.length === 0 ? (
            <EmptyRow colSpan={7}>Todavía no hay entradas de bitácora.</EmptyRow>
          ) : (
            entradas.map((b) => (
              <tr key={b.id} data-cy={`bitacora-row-${b.id}`}>
                <Td className="whitespace-nowrap text-muted-foreground">{formatDate(b.fecha)}</Td>
                <Td className="whitespace-nowrap">
                  {b.proyecto ? (
                    <Link
                      href={`/proyectos/${b.proyecto.id}`}
                      className="text-primary underline underline-offset-2"
                    >
                      {b.proyecto.codigo}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="max-w-md text-foreground">{b.actividad}</Td>
                <Td className="whitespace-nowrap">{horas(b.hora_inicio, b.hora_fin)}</Td>
                <Td>{b.trabajador?.full_name ?? "—"}</Td>
                <Td>{b.equipo_utilizado ?? "—"}</Td>
                <Td className="text-right">
                  <DeleteForm
                    action={deleteBitacoraAction}
                    id={b.id}
                    entityLabel="esta entrada"
                    dataCy={`bitacora-delete-${b.id}`}
                  />
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}
