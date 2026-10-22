import Link from "next/link";
import { ChevronRight, CircleDollarSign, Receipt, Wallet } from "lucide-react";
import { dashboardPages } from "@/config/site";
import { requireRole } from "@/lib/auth";
import { formatColones, formatDate } from "@/lib/format";
import { listCobrosProyectos, parseEstadoCobro } from "@/services/cobros.service";
import { listClienteOptions } from "@/services/clientes.service";
import { DashboardPageHeader } from "../_components/page-header";
import { SearchField } from "../_components/search-field";
import { TableWrap, Th, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { CobroFilters } from "./cobro-filters";
import { Cotizador } from "./cotizador";

export const dynamic = "force-dynamic";

export default async function CobrosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; cliente?: string }>;
}) {
  const [params, profile] = await Promise.all([searchParams, requireRole(["admin", "oficina"])]);
  // El total cobrado (ingresos del negocio) es solo para admin. Oficina sigue
  // viendo lo pagado por proyecto porque es quien registra los pagos.
  const verTotalCobrado = profile.role === "admin";

  const [cobros, clientes] = await Promise.all([
    listCobrosProyectos({
      search: params.q,
      estado: parseEstadoCobro(params.estado),
      clienteId: params.cliente,
    }),
    listClienteOptions(),
  ]);

  const hasFilters = Boolean(params.q || params.estado || params.cliente);
  const filtroHint = hasFilters ? "Según los filtros" : undefined;
  const totalPorCobrar = cobros.reduce((s, c) => s + (c.saldo_pendiente ?? 0), 0);
  const totalPagado = verTotalCobrado ? cobros.reduce((s, c) => s + c.total_pagado, 0) : 0;
  const sinMonto = cobros.filter((c) => c.monto_cobrar === null).length;

  return (
    <div data-cy="page-cobros" className="flex animate-fade-in flex-col gap-6">
      <DashboardPageHeader content={dashboardPages.cobros} />

      <div className={`grid gap-4 ${verTotalCobrado ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <StatCard
          label="Saldo pendiente total"
          value={formatColones(totalPorCobrar)}
          icon={Wallet}
          tone="warn"
          hint={filtroHint}
        />
        {verTotalCobrado && (
          <StatCard
            label="Total cobrado"
            value={formatColones(totalPagado)}
            icon={CircleDollarSign}
            tone="positive"
            hint={filtroHint}
          />
        )}
        <StatCard
          label="Proyectos sin monto"
          value={sinMonto}
          icon={Receipt}
          tone="neutral"
          hint={filtroHint ?? "Sin cotización cargada"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchField placeholder="Código o nombre" dataCy="cobros-search" />
        <CobroFilters clientes={clientes} />
      </div>

      {cobros.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised shadow-sm">
          <EmptyState
            icon={Receipt}
            title={hasFilters ? "Sin coincidencias" : "No hay proyectos"}
            description={
              hasFilters
                ? "Ajustá la búsqueda o los filtros."
                : "Cuando existan proyectos aparecerá acá su estado de cobro."
            }
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
                    (c.saldo_pendiente ?? 0) > 0 ? "text-foreground" : "text-success"
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

      <Cotizador />
    </div>
  );
}
