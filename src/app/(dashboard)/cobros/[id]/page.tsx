import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole, isStaff } from "@/lib/auth";
import { formatColones, formatDate } from "@/lib/format";
import { getCobroProyecto, listPagos } from "@/services/cobros.service";
import { Section } from "@/components/ui/section";
import { StatCard } from "@/components/ui/stat-card";
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
  const [{ id }, profile] = await Promise.all([params, requireRole(["admin", "oficina"])]);
  const cobro = await getCobroProyecto(id);
  if (!cobro) notFound();

  const canWrite = isStaff(profile.role);
  const pagos = await listPagos(id);
  const saldoPositivo = (cobro.saldo_pendiente ?? 0) > 0;

  return (
    <div data-cy="page-cobro-detalle" className="flex animate-fade-in flex-col gap-6">
      <div>
        <Link
          href="/cobros"
          className="inline-flex items-center gap-1.5 text-small text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Cobros
        </Link>
        <h1 className="mt-2 font-heading text-h3 font-semibold tabular-nums text-foreground">
          {cobro.codigo}
        </h1>
        <p className="mt-1 text-body text-muted-foreground">{cobro.nombre}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Monto a cobrar" value={formatColones(cobro.monto_cobrar)} />
        <StatCard
          label="Total pagado"
          value={formatColones(cobro.total_pagado)}
          tone="positive"
        />
        <StatCard
          label="Saldo pendiente"
          value={formatColones(cobro.saldo_pendiente)}
          tone={saldoPositivo ? "warn" : "positive"}
        />
      </div>

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
              <Th numeric>Monto</Th>
              <Th>Método</Th>
              <Th>Notas</Th>
              {canWrite && <Th className="w-0" />}
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 ? (
              <EmptyRow colSpan={canWrite ? 5 : 4}>Sin pagos registrados.</EmptyRow>
            ) : (
              pagos.map((p) => (
                <tr key={p.id} data-cy={`pago-row-${p.id}`} className="group">
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDate(p.fecha_pago)}
                  </Td>
                  <Td numeric className="whitespace-nowrap font-medium text-foreground">
                    {formatColones(p.monto)}
                  </Td>
                  <Td className="text-muted-foreground">{METODO_LABEL[p.metodo] ?? p.metodo}</Td>
                  <Td className="text-muted-foreground">{p.notas ?? "—"}</Td>
                  {canWrite && (
                    <Td className="text-right">
                      <span className="opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <DeleteForm
                          action={deletePagoAction}
                          id={p.id}
                          entityLabel="este pago"
                          dataCy={`pago-delete-${p.id}`}
                        />
                      </span>
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
