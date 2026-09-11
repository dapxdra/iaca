import Link from "next/link";
import { ChevronRight, CircleDollarSign, Receipt, Wallet } from "lucide-react";
import { dashboardPages } from "@/config/site";
import { requireRole } from "@/lib/auth";
import { formatColones, formatDate } from "@/lib/format";
import { listCobrosProyectos } from "@/services/cobros.service";
import { DashboardPageHeader } from "../_components/page-header";
import { TableWrap, Th, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";

export const dynamic = "force-dynamic";

export default async function CobrosPage() {
  await requireRole(["admin", "oficina"]);
  const cobros = await listCobrosProyectos();

  const totalPorCobrar = cobros.reduce((s, c) => s + (c.saldo_pendiente ?? 0), 0);
  const totalPagado = cobros.reduce((s, c) => s + c.total_pagado, 0);
  const sinMonto = cobros.filter((c) => c.monto_cobrar === null).length;

  return (
    <div data-cy="page-cobros" className="flex animate-fade-in flex-col gap-6">
      <DashboardPageHeader content={dashboardPages.cobros} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Saldo pendiente total"
          value={formatColones(totalPorCobrar)}
          icon={Wallet}
          tone="warn"
        />
        <StatCard
          label="Total cobrado"
          value={formatColones(totalPagado)}
          icon={CircleDollarSign}
          tone="positive"
        />
        <StatCard
          label="Proyectos sin monto"
          value={sinMonto}
          icon={Receipt}
          tone="neutral"
          hint="Sin cotización cargada"
        />
      </div>

      {cobros.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised shadow-sm">
          <EmptyState
            icon={Receipt}
            title="No hay proyectos"
            description="Cuando existan proyectos aparecerá acá su estado de cobro."
          />
        </div>
      ) : (
        <TableWrap data-cy="cobros-table">
          <thead>
            <tr>
              <Th>Proyecto</Th>
              <Th numeric>Monto a cobrar</Th>
              <Th numeric>Pagado</Th>
              <Th numeric>Saldo</Th>
              <Th>Último pago</Th>
              <Th className="w-0" />
            </tr>
          </thead>
          <tbody>
            {cobros.map((c) => (
              <tr key={c.proyecto_id} data-cy={`cobro-row-${c.proyecto_id}`} className="group">
                <Td>
                  <span className="font-medium tabular-nums text-foreground">{c.codigo}</span>
                  <span className="block text-muted-foreground">{c.nombre}</span>
                </Td>
                <Td numeric className="whitespace-nowrap">
                  {formatColones(c.monto_cobrar)}
                </Td>
                <Td numeric className="whitespace-nowrap text-muted-foreground">
                  {formatColones(c.total_pagado)}
                </Td>
                <Td
                  numeric
                  className={`whitespace-nowrap font-semibold ${
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
                    className="inline-flex items-center gap-1 whitespace-nowrap text-small font-medium text-accent transition-all hover:underline group-hover:translate-x-0.5"
                  >
                    Gestionar <ChevronRight className="h-4 w-4" />
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
