import Link from "next/link";
import { ClipboardList, ImageOff } from "lucide-react";
import { dashboardPages } from "@/config/site";
import { requireRole, isStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listBitacora } from "@/services/bitacora.service";
import { listProyectoOptions } from "@/services/proyectos.service";
import { DashboardPageHeader } from "../_components/page-header";
import { TableWrap, Th, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteForm } from "@/components/ui/delete-form";
import { BitacoraDialog } from "./bitacora-dialog";
import { deleteBitacoraAction } from "./actions";

export const dynamic = "force-dynamic";

function horas(inicio: string | null, fin: string | null) {
  if (!inicio && !fin) return "—";
  return `${inicio?.slice(0, 5) ?? "··"} – ${fin?.slice(0, 5) ?? "··"}`;
}

export default async function BitacoraPage() {
  const profile = await requireRole(["admin", "oficina", "campo"]);
  const [entradas, proyectos] = await Promise.all([
    listBitacora({ limit: 150 }),
    listProyectoOptions(),
  ]);

  return (
    <div data-cy="page-bitacora" className="flex animate-fade-in flex-col gap-6">
      <DashboardPageHeader
        content={dashboardPages.bitacora}
        action={proyectos.length > 0 ? <BitacoraDialog proyectos={proyectos} /> : null}
      />

      {proyectos.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised shadow-sm">
          <EmptyState
            icon={ClipboardList}
            title="No hay proyectos activos"
            description="Pedí a la oficina que cree un proyecto para poder registrar bitácora."
            action={
              isStaff(profile.role) ? (
                <Link
                  href="/proyectos"
                  className="text-small font-medium text-accent hover:underline"
                >
                  Ir a Proyectos
                </Link>
              ) : null
            }
          />
        </div>
      ) : entradas.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised shadow-sm">
          <EmptyState
            icon={ClipboardList}
            title="Todavía no hay entradas"
            description="Registrá la primera actividad de campo."
            action={<BitacoraDialog proyectos={proyectos} />}
          />
        </div>
      ) : (
        <TableWrap data-cy="bitacora-table">
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th>Proyecto</Th>
              <Th>Actividad</Th>
              <Th>Horario</Th>
              <Th>Trabajador</Th>
              <Th>Equipo</Th>
              <Th>Fotos</Th>
              <Th className="w-0" />
            </tr>
          </thead>
          <tbody>
            {entradas.map((b) => (
              <tr key={b.id} data-cy={`bitacora-row-${b.id}`} className="group">
                <Td className="whitespace-nowrap text-muted-foreground">{formatDate(b.fecha)}</Td>
                <Td className="whitespace-nowrap">
                  {!b.proyecto ? (
                    "—"
                  ) : isStaff(profile.role) ? (
                    <Link
                      href={`/proyectos/${b.proyecto.id}`}
                      className="tabular-nums text-accent transition-colors hover:text-primary hover:underline"
                    >
                      {b.proyecto.codigo}
                    </Link>
                  ) : (
                    <span className="tabular-nums text-foreground">{b.proyecto.codigo}</span>
                  )}
                </Td>
                <Td className="max-w-md text-foreground">{b.actividad}</Td>
                <Td className="whitespace-nowrap tabular-nums text-muted-foreground">
                  {horas(b.hora_inicio, b.hora_fin)}
                </Td>
                <Td className="text-muted-foreground">{b.trabajador?.full_name ?? "—"}</Td>
                <Td className="text-muted-foreground">{b.equipo_utilizado ?? "—"}</Td>
                <Td>
                  {b.fotos.length === 0 ? (
                    <span className="text-muted-foreground">
                      <ImageOff className="h-4 w-4" />
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      {b.fotos.slice(0, 3).map((f) =>
                        f.url ? (
                          // Miniatura de una URL firmada (privada, expira) — <img>
                          // simple, no next/image (dominio y query cambian por request).
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={f.id}
                            src={f.url}
                            alt={f.descripcion ?? "Foto de bitácora"}
                            className="h-8 w-8 rounded-md border border-border object-cover"
                          />
                        ) : null
                      )}
                      {b.fotos.length > 3 && (
                        <span className="text-small text-muted-foreground">
                          +{b.fotos.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </Td>
                <Td className="text-right">
                  <span className="opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <DeleteForm
                      action={deleteBitacoraAction}
                      id={b.id}
                      entityLabel="esta entrada"
                      dataCy={`bitacora-delete-${b.id}`}
                    />
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
