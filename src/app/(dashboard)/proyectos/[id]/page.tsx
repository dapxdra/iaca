import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireProfile, isStaff } from "@/lib/auth";
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
  const [{ id }, profile] = await Promise.all([params, requireProfile()]);
  const proyecto = await getProyecto(id);
  if (!proyecto) notFound();

  const canWrite = isStaff(profile.role);
  const [subproyectos, bitacora, tramites, cobro, clientes, responsables, zonas] =
    await Promise.all([
      listSubproyectos(id),
      listBitacora({ proyectoId: id, limit: 8 }),
      listTramites(id),
      getCobroProyecto(id),
      canWrite ? listClienteOptions() : Promise.resolve([]),
      canWrite ? listProfileOptions(["admin", "oficina", "campo"]) : Promise.resolve([]),
      canWrite ? listZonas() : Promise.resolve([]),
    ]);

  const estadoIdx = ESTADO_FLOW.indexOf(proyecto.estado);

  return (
    <div data-cy="page-proyecto-detalle" className="flex flex-col gap-6">
      <Link
        href="/proyectos"
        className="inline-flex items-center gap-1.5 text-small text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Proyectos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-h3 font-semibold text-foreground">{proyecto.codigo}</h1>
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
        <ol className="flex flex-wrap gap-2">
          {ESTADO_FLOW.map((e, i) => {
            const done = estadoIdx >= 0 && i <= estadoIdx;
            const cancel = proyecto.estado === "cancelado";
            return (
              <li
                key={e}
                className={`border px-3 py-1.5 text-small font-medium ${
                  done && !cancel
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {i + 1}. {PROYECTO_LABEL[e]}
              </li>
            );
          })}
        </ol>
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
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DataItem label="Cliente">
            {proyecto.cliente ? (
              <Link href="/clientes" className="text-primary underline underline-offset-2">
                {proyecto.cliente.nombre}
              </Link>
            ) : (
              "—"
            )}
          </DataItem>
          <DataItem label="Tipo de servicio">{proyecto.tipo_servicio ?? "—"}</DataItem>
          <DataItem label="Responsable">{proyecto.responsable?.full_name ?? "Sin asignar"}</DataItem>
          <DataItem label="Ubicación">
            {[proyecto.provincia, proyecto.canton, proyecto.distrito].filter(Boolean).join(", ") ||
              "—"}
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
          <p className="mt-4 border-t border-border pt-4 text-body text-muted-foreground">
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
          <ul className="flex flex-col divide-y divide-border">
            {subproyectos.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <span className="text-body text-foreground">{s.nombre}</span>
                  {s.descripcion && (
                    <span className="ml-2 text-small text-muted-foreground">{s.descripcion}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <EstadoProyectoBadge estado={s.estado} />
                  {canWrite && (
                    <DeleteForm
                      action={deleteSubproyectoAction}
                      id={s.id}
                      entityLabel={`el subproyecto "${s.nombre}"`}
                      dataCy={`subproyecto-delete-${s.id}`}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Trámites del proyecto */}
      <Section
        title={`Trámites (${tramites.length})`}
        dataCy="proyecto-tramites"
        action={
          <Link href="/tramites" className="text-small text-primary underline underline-offset-2">
            Ir a Trámites
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
                  <Td>{t.tipo_tramite}</Td>
                  <Td>{t.numero_expediente ?? "—"}</Td>
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
          <Link href="/cobros" className="text-small text-primary underline underline-offset-2">
            Gestionar en Cobros
          </Link>
        }
      >
        <dl className="grid gap-4 sm:grid-cols-3">
          <DataItem label="Monto a cobrar">{formatColones(cobro?.monto_cobrar ?? null)}</DataItem>
          <DataItem label="Total pagado">{formatColones(cobro?.total_pagado ?? 0)}</DataItem>
          <DataItem label="Saldo pendiente">
            {formatColones(cobro?.saldo_pendiente ?? null)}
          </DataItem>
        </dl>
      </Section>

      {/* Bitácora reciente */}
      <Section
        title="Bitácora reciente"
        dataCy="proyecto-bitacora"
        action={
          <Link href="/bitacora" className="text-small text-primary underline underline-offset-2">
            Ver toda
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
                  <Td className="whitespace-nowrap text-muted-foreground">{formatDate(b.fecha)}</Td>
                  <Td className="text-foreground">{b.actividad}</Td>
                  <Td>{b.trabajador?.full_name ?? "—"}</Td>
                  <Td>{b.equipo_utilizado ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Section>

    </div>
  );
}
