import Link from "next/link";
import { dashboardPages } from "@/config/site";
import { requireProfile } from "@/lib/auth";
import { formatColones, formatDate } from "@/lib/format";
import { listCobrosProyectos } from "@/services/cobros.service";
import { DashboardPageHeader } from "../_components/page-header";
import { TableWrap, Th, Td, EmptyRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function CobrosPage() {
  await requireProfile();
  const cobros = await listCobrosProyectos();

  const totalPorCobrar = cobros.reduce((s, c) => s + (c.saldo_pendiente ?? 0), 0);
  const totalPagado = cobros.reduce((s, c) => s + c.total_pagado, 0);
  const sinMonto = cobros.filter((c) => c.monto_cobrar === null).length;

  return (
    <div data-cy="page-cobros" className="flex flex-col gap-6">
      <DashboardPageHeader content={dashboardPages.cobros} />

      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="border border-border p-4">
          <dt className="text-small text-muted-foreground">Saldo pendiente total</dt>
          <dd className="mt-1 text-h3 font-semibold text-foreground">
            {formatColones(totalPorCobrar)}
          </dd>
        </div>
        <div className="border border-border p-4">
          <dt className="text-small text-muted-foreground">Total cobrado</dt>
          <dd className="mt-1 text-h3 font-semibold text-foreground">
            {formatColones(totalPagado)}
          </dd>
        </div>
        <div className="border border-border p-4">
          <dt className="text-small text-muted-foreground">Proyectos sin monto definido</dt>
          <dd className="mt-1 text-h3 font-semibold text-foreground">{sinMonto}</dd>
        </div>
      </dl>

      <TableWrap data-cy="cobros-table">
        <thead>
          <tr>
            <Th>Proyecto</Th>
            <Th className="text-right">Monto a cobrar</Th>
            <Th className="text-right">Pagado</Th>
            <Th className="text-right">Saldo</Th>
            <Th>Último pago</Th>
            <Th className="w-px" />
          </tr>
        </thead>
        <tbody>
          {cobros.length === 0 ? (
            <EmptyRow colSpan={6}>No hay proyectos todavía.</EmptyRow>
          ) : (
            cobros.map((c) => (
              <tr key={c.proyecto_id} data-cy={`cobro-row-${c.proyecto_id}`}>
                <Td>
                  <span className="font-medium text-foreground">{c.codigo}</span>
                  <span className="block text-muted-foreground">{c.nombre}</span>
                </Td>
                <Td className="whitespace-nowrap text-right">{formatColones(c.monto_cobrar)}</Td>
                <Td className="whitespace-nowrap text-right">{formatColones(c.total_pagado)}</Td>
                <Td
                  className={`whitespace-nowrap text-right font-semibold ${
                    (c.saldo_pendiente ?? 0) > 0 ? "text-foreground" : "text-green-700"
                  }`}
                >
                  {formatColones(c.saldo_pendiente)}
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(c.fecha_ultimo_pago)}
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/cobros/${c.proyecto_id}`}
                    data-cy={`cobro-gestionar-${c.proyecto_id}`}
                    className="whitespace-nowrap text-small text-primary underline underline-offset-2"
                  >
                    Gestionar
                  </Link>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}
