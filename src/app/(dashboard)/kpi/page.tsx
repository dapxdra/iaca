import Link from "next/link";
import { dashboardPages } from "@/config/site";
import { requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getKpiProyectos, getKpiZonas, resumirKpi } from "@/services/kpi.service";
import { DashboardPageHeader } from "../_components/page-header";
import { Section } from "@/components/ui/section";
import { TableWrap, Th, Td, EmptyRow } from "@/components/ui/table";
import { EstadoProyectoBadge } from "@/components/ui/badge";
import { ProyectosPorZonaChart, CicloPorZonaChart } from "./kpi-charts";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border p-4">
      <div className="text-small text-muted-foreground">{label}</div>
      <div className="mt-1 text-h3 font-semibold text-foreground">{value}</div>
    </div>
  );
}

function entregaLabel(v: boolean | null) {
  if (v === null) return "—";
  return v ? "A tiempo" : "Tarde";
}

export default async function KpiPage() {
  await requireProfile();
  const [proyectos, zonas] = await Promise.all([getKpiProyectos(), getKpiZonas()]);
  const resumen = resumirKpi(proyectos);

  return (
    <div data-cy="page-kpi" className="flex flex-col gap-6">
      <DashboardPageHeader content={dashboardPages.kpi} />

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Proyectos" value={resumen.totalProyectos} />
        <Stat label="Activos" value={resumen.activos} />
        <Stat label="Cerrados" value={resumen.cerrados} />
        <Stat
          label="Cumplimiento de entrega"
          value={resumen.cumplimientoPct === null ? "—" : `${resumen.cumplimientoPct}%`}
        />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Proyectos por zona" dataCy="kpi-zona">
          <ProyectosPorZonaChart zonas={zonas} />
        </Section>
        <Section title="Ciclo promedio por zona (días)" dataCy="kpi-ciclo">
          <CicloPorZonaChart zonas={zonas} />
        </Section>
      </div>

      <Section title="Detalle por zona" dataCy="kpi-tabla-zona">
        <TableWrap>
          <thead>
            <tr>
              <Th>Zona</Th>
              <Th className="text-right">Proyectos</Th>
              <Th className="text-right">Activos</Th>
              <Th className="text-right">Cerrados</Th>
              <Th className="text-right">Ciclo prom. (días)</Th>
            </tr>
          </thead>
          <tbody>
            {zonas.length === 0 ? (
              <EmptyRow colSpan={5}>Sin datos.</EmptyRow>
            ) : (
              zonas.map((z) => (
                <tr key={z.zona ?? "sin-zona"}>
                  <Td className="text-foreground">{z.zona ?? "Sin zona"}</Td>
                  <Td className="text-right">{z.total_proyectos}</Td>
                  <Td className="text-right">{z.proyectos_activos}</Td>
                  <Td className="text-right">{z.proyectos_cerrados}</Td>
                  <Td className="text-right">
                    {z.promedio_dias_ciclo === null
                      ? "—"
                      : Math.round(z.promedio_dias_ciclo)}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Section>

      <Section title="Detalle por proyecto" dataCy="kpi-tabla-proyecto">
        <TableWrap>
          <thead>
            <tr>
              <Th>Código</Th>
              <Th>Zona</Th>
              <Th>Estado</Th>
              <Th className="text-right">Subproy.</Th>
              <Th className="text-right">Bitácora</Th>
              <Th className="text-right">Puntos</Th>
              <Th>Entrega est.</Th>
              <Th>Entrega</Th>
            </tr>
          </thead>
          <tbody>
            {proyectos.length === 0 ? (
              <EmptyRow colSpan={8}>Sin proyectos.</EmptyRow>
            ) : (
              proyectos.map((p) => (
                <tr key={p.proyecto_id}>
                  <Td className="whitespace-nowrap">
                    <Link
                      href={`/proyectos/${p.proyecto_id}`}
                      className="text-primary underline underline-offset-2"
                    >
                      {p.codigo}
                    </Link>
                  </Td>
                  <Td>{p.zona ?? "—"}</Td>
                  <Td>
                    <EstadoProyectoBadge estado={p.estado} />
                  </Td>
                  <Td className="text-right">{p.total_subproyectos}</Td>
                  <Td className="text-right">{p.total_entradas_bitacora}</Td>
                  <Td className="text-right">{p.total_puntos}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDate(p.fecha_estimada_entrega)}
                  </Td>
                  <Td className="whitespace-nowrap">{entregaLabel(p.entregado_a_tiempo)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Section>
    </div>
  );
}
