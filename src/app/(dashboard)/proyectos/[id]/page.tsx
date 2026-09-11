import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, Download, FileText } from "lucide-react";
import { requireRole, isStaff } from "@/lib/auth";
import { formatColones, formatDate } from "@/lib/format";
import {
  getProyecto,
  listSubproyectos,
  listZonas,
  ESTADO_FLOW,
} from "@/services/proyectos.service";
import { listClienteOptions } from "@/services/clientes.service";
import { listProfileOptions } from "@/services/profiles.service";
import { listBitacora } from "@/services/bitacora.service";
import { listTramites } from "@/services/tramites.service";
import { getCobroProyecto } from "@/services/cobros.service";
import { listArchivosProyecto } from "@/services/archivos.service";
import { Section, DataItem } from "@/components/ui/section";
import { TableWrap, Th, Td } from "@/components/ui/table";
import { EstadoProyectoBadge, EstadoTramiteBadge, PROYECTO_LABEL } from "@/components/ui/badge";
import { DeleteForm } from "@/components/ui/delete-form";
import { ProyectoDialog } from "../proyecto-dialog";
import { EstadoControl } from "./estado-control";
import { SubproyectoDialog } from "./subproyecto-dialog";
import { deleteSubproyectoAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ProyectoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, profile] = await Promise.all([params, requireRole(["admin", "oficina"])]);
  const proyecto = await getProyecto(id);
  if (!proyecto) notFound();

  const canWrite = isStaff(profile.role);
  const [subproyectos, bitacora, tramites, cobro, archivos, clientes, responsables, zonas] =
    await Promise.all([
      listSubproyectos(id),
      listBitacora({ proyectoId: id, limit: 8 }),
      listTramites(id),
      getCobroProyecto(id),
      listArchivosProyecto(id),
      canWrite ? listClienteOptions() : Promise.resolve([]),
      canWrite ? listProfileOptions(["admin", "oficina", "campo"]) : Promise.resolve([]),
      canWrite ? listZonas() : Promise.resolve([]),
    ]);

  const estadoIdx = ESTADO_FLOW.indexOf(proyecto.estado);
  const cancelado = proyecto.estado === "cancelado";
  const cerrado = proyecto.estado === "cerrado";

  return (
    <div data-cy="page-proyecto-detalle" className="flex animate-fade-in flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/proyectos"
            className="inline-flex items-center gap-1.5 text-small text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Proyectos
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-h3 font-semibold tabular-nums text-foreground">
              {proyecto.codigo}
            </h1>
            <EstadoProyectoBadge estado={proyecto.estado} />
          </div>
          <p className="mt-1 text-body text-muted-foreground">{proyecto.nombre}</p>
        </div>
        {canWrite && (
          <ProyectoDialog
            clientes={clientes}
            responsables={responsables}
            zonas={zonas}
            proyecto={proyecto}
          />
        )}
      </div>

      {/* Flujo de estados */}
      <Section title="Flujo de trabajo" dataCy="proyecto-flujo">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-3">
          {ESTADO_FLOW.map((e, i) => {
            const done = !cancelado && (cerrado || i < estadoIdx);
            const current = !cancelado && !cerrado && i === estadoIdx;
            return (
              <li key={e} className="flex items-center">
                <div className="flex items-center gap-2">
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[0.75rem] font-semibold transition-colors ${
                      done
                        ? "border-accent bg-accent text-accent-foreground"
                        : current
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-surface-sunken text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span
                    className={`text-small font-medium ${
                      done || current ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {PROYECTO_LABEL[e]}
                  </span>
                </div>
                {i < ESTADO_FLOW.length - 1 && (
                  <span
                    className={`mx-2 h-px w-6 ${done ? "bg-accent" : "bg-border"}`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>

        {cancelado && (
          <p className="mt-4 rounded-md border border-red-600/30 bg-red-600/8 px-3 py-2 text-small font-medium text-red-700">
            Proyecto cancelado.
          </p>
        )}

        {canWrite && (
          <div className="mt-4 border-t border-border pt-4">
            <EstadoControl
              proyectoId={proyecto.id}
              estadoActual={proyecto.estado}
              tieneEntregaReal={Boolean(proyecto.fecha_entrega_real)}
            />
          </div>
        )}
      </Section>

      {/* Ficha */}
      <Section title="Información" dataCy="proyecto-info">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DataItem label="Cliente">
            {proyecto.cliente ? (
              <Link
                href="/clientes"
                className="text-accent transition-colors hover:text-primary hover:underline"
              >
                {proyecto.cliente.nombre}
              </Link>
            ) : (
              "—"
            )}
          </DataItem>
          <DataItem label="Tipo de servicio">{proyecto.tipo_servicio ?? "—"}</DataItem>
          <DataItem label="Responsable">
            {proyecto.responsable?.full_name ?? "Sin asignar"}
          </DataItem>
          <DataItem label="Ubicación">
            {[proyecto.provincia, proyecto.canton, proyecto.distrito]
              .filter(Boolean)
              .join(", ") || "—"}
          </DataItem>
          <DataItem label="Zona (KPI)">{proyecto.zona ?? "—"}</DataItem>
          <DataItem label="Inicio">{formatDate(proyecto.fecha_inicio)}</DataItem>
          <DataItem label="Entrega estimada">
            {formatDate(proyecto.fecha_estimada_entrega)}
          </DataItem>
          <DataItem label="Entrega real">{formatDate(proyecto.fecha_entrega_real)}</DataItem>
          <DataItem label="Monto a cobrar">{formatColones(proyecto.monto_cobrar)}</DataItem>
        </dl>
        {proyecto.descripcion && (
          <p className="mt-5 border-t border-border pt-4 text-body text-muted-foreground">
            {proyecto.descripcion}
          </p>
        )}
      </Section>

      {/* Subproyectos */}
      <Section
        title={`Subproyectos (${subproyectos.length})`}
        dataCy="proyecto-subproyectos"
        action={canWrite ? <SubproyectoDialog proyectoId={proyecto.id} /> : null}
      >
        {subproyectos.length === 0 ? (
          <p className="text-small text-muted-foreground">Sin subproyectos.</p>
        ) : (
          <ul className="-my-2 flex flex-col divide-y divide-border">
            {subproyectos.map((s) => (
              <li
                key={s.id}
                className="group flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <span className="text-body text-foreground">{s.nombre}</span>
                  {s.descripcion && (
                    <span className="ml-2 text-small text-muted-foreground">{s.descripcion}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <EstadoProyectoBadge estado={s.estado} />
                  {canWrite && (
                    <span className="opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
                      <DeleteForm
                        action={deleteSubproyectoAction}
                        id={s.id}
                        entityLabel={`el subproyecto "${s.nombre}"`}
                        dataCy={`subproyecto-delete-${s.id}`}
                      />
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Trámites */}
      <Section
        title={`Trámites (${tramites.length})`}
        dataCy="proyecto-tramites"
        action={
          <Link
            href="/tramites"
            className="inline-flex items-center gap-1 text-small font-medium text-accent hover:underline"
          >
            Ir a Trámites <ChevronRight className="h-4 w-4" />
          </Link>
        }
      >
        {tramites.length === 0 ? (
          <p className="text-small text-muted-foreground">Sin trámites registrados.</p>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Entidad</Th>
                <Th>Tipo</Th>
                <Th>Expediente</Th>
                <Th>Envío</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {tramites.map((t) => (
                <tr key={t.id}>
                  <Td className="text-foreground">{t.entidad}</Td>
                  <Td className="text-muted-foreground">{t.tipo_tramite}</Td>
                  <Td className="tabular-nums">{t.numero_expediente ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDate(t.fecha_envio)}
                  </Td>
                  <Td>
                    <EstadoTramiteBadge estado={t.estado} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Section>

      {/* Cobro */}
      <Section
        title="Cobro"
        dataCy="proyecto-cobro"
        action={
          <Link
            href={`/cobros/${proyecto.id}`}
            className="inline-flex items-center gap-1 text-small font-medium text-accent hover:underline"
          >
            Gestionar <ChevronRight className="h-4 w-4" />
          </Link>
        }
      >
        <dl className="grid gap-5 sm:grid-cols-3">
          <DataItem label="Monto a cobrar">{formatColones(cobro?.monto_cobrar ?? null)}</DataItem>
          <DataItem label="Total pagado">{formatColones(cobro?.total_pagado ?? 0)}</DataItem>
          <DataItem label="Saldo pendiente">
            <span
              className={
                (cobro?.saldo_pendiente ?? 0) > 0 ? "text-foreground" : "text-green-700"
              }
            >
              {formatColones(cobro?.saldo_pendiente ?? null)}
            </span>
          </DataItem>
        </dl>
      </Section>

      {/* Archivos (CSV subidos desde la bitácora) */}
      <Section title={`Archivos (${archivos.length})`} dataCy="proyecto-archivos">
        {archivos.length === 0 ? (
          <p className="text-small text-muted-foreground">
            Sin archivos. Se suben desde el formulario de bitácora.
          </p>
        ) : (
          <ul className="-my-2 flex flex-col divide-y divide-border">
            {archivos.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-body text-foreground">{a.nombre_archivo}</p>
                    <p className="text-small text-muted-foreground">
                      {a.subido_por?.full_name ?? "—"} · {formatDate(a.created_at)}
                      {a.tamano_bytes ? ` · ${(a.tamano_bytes / 1024).toFixed(0)} KB` : ""}
                    </p>
                  </div>
                </div>
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cy={`archivo-descargar-${a.id}`}
                    className="inline-flex shrink-0 items-center gap-1 text-small font-medium text-accent hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Descargar
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Bitácora reciente */}
      <Section
        title="Bitácora reciente"
        dataCy="proyecto-bitacora"
        action={
          <Link
            href="/bitacora"
            className="inline-flex items-center gap-1 text-small font-medium text-accent hover:underline"
          >
            Ver toda <ChevronRight className="h-4 w-4" />
          </Link>
        }
      >
        {bitacora.length === 0 ? (
          <p className="text-small text-muted-foreground">Sin entradas de bitácora.</p>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Actividad</Th>
                <Th>Trabajador</Th>
                <Th>Equipo</Th>
              </tr>
            </thead>
            <tbody>
              {bitacora.map((b) => (
                <tr key={b.id}>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDate(b.fecha)}
                  </Td>
                  <Td className="text-foreground">{b.actividad}</Td>
                  <Td className="text-muted-foreground">{b.trabajador?.full_name ?? "—"}</Td>
                  <Td className="text-muted-foreground">{b.equipo_utilizado ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Section>
    </div>
  );
}
