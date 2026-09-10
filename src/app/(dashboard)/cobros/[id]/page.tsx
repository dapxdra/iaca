import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireProfile, isStaff } from "@/lib/auth";
import { formatColones, formatDate } from "@/lib/format";
import { getCobroProyecto, listPagos } from "@/services/cobros.service";
import { Section, DataItem } from "@/components/ui/section";
import { TableWrap, Th, Td, EmptyRow } from "@/components/ui/table";
import { DeleteForm } from "@/components/ui/delete-form";
import { MontoCobrarForm, RegistrarPagoForm } from "./cobro-forms";
import { deletePagoAction } from "../actions";

export const dynamic = "force-dynamic";

const METODO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  sinpe_movil: "SINPE Móvil",
  transferencia: "Transferencia",
  cheque: "Cheque",
  otro: "Otro",
};

export default async function CobroDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, profile] = await Promise.all([params, requireProfile()]);
  const cobro = await getCobroProyecto(id);
  if (!cobro) notFound();

  const canWrite = isStaff(profile.role);
  const pagos = await listPagos(id);

  return (
    <div data-cy="page-cobro-detalle" className="flex flex-col gap-6">
      <Link
        href="/cobros"
        className="inline-flex items-center gap-1.5 text-small text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Cobros
      </Link>

      <div>
        <h1 className="text-h3 font-semibold text-foreground">{cobro.codigo}</h1>
        <p className="mt-1 text-body text-muted-foreground">{cobro.nombre}</p>
      </div>

      <Section title="Resumen" dataCy="cobro-resumen">
        <dl className="grid gap-4 sm:grid-cols-3">
          <DataItem label="Monto a cobrar">{formatColones(cobro.monto_cobrar)}</DataItem>
          <DataItem label="Total pagado">{formatColones(cobro.total_pagado)}</DataItem>
          <DataItem label="Saldo pendiente">
            <span
              className={
                (cobro.saldo_pendiente ?? 0) > 0 ? "text-foreground" : "text-green-700"
              }
            >
              {formatColones(cobro.saldo_pendiente)}
            </span>
          </DataItem>
        </dl>
      </Section>

      {canWrite && (
        <Section title="Definir monto a cobrar" dataCy="cobro-monto">
          <MontoCobrarForm proyectoId={id} montoActual={cobro.monto_cobrar} />
        </Section>
      )}

      {canWrite && (
        <Section title="Registrar pago / abono" dataCy="cobro-nuevo-pago">
          <RegistrarPagoForm proyectoId={id} />
        </Section>
      )}

      <Section title={`Pagos registrados (${pagos.length})`} dataCy="cobro-pagos">
        <TableWrap>
          <thead>
            <tr>
              <Th>Fecha</Th>
              <Th className="text-right">Monto</Th>
              <Th>Método</Th>
              <Th>Notas</Th>
              {canWrite && <Th className="w-px" />}
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 ? (
              <EmptyRow colSpan={canWrite ? 5 : 4}>Sin pagos registrados.</EmptyRow>
            ) : (
              pagos.map((p) => (
                <tr key={p.id} data-cy={`pago-row-${p.id}`}>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDate(p.fecha_pago)}
                  </Td>
                  <Td className="whitespace-nowrap text-right font-medium text-foreground">
                    {formatColones(p.monto)}
                  </Td>
                  <Td>{METODO_LABEL[p.metodo] ?? p.metodo}</Td>
                  <Td className="text-muted-foreground">{p.notas ?? "—"}</Td>
                  {canWrite && (
                    <Td className="text-right">
                      <DeleteForm
                        action={deletePagoAction}
                        id={p.id}
                        entityLabel="este pago"
                        dataCy={`pago-delete-${p.id}`}
                      />
                    </Td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Section>
    </div>
  );
}
