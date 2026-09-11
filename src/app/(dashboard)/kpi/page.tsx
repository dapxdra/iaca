import Link from "next/link";
import { CalendarCheck, CheckCircle2, FolderKanban, Layers } from "lucide-react";
import { dashboardPages } from "@/config/site";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getKpiProyectos, getKpiZonas, resumirKpi } from "@/services/kpi.service";
import { DashboardPageHeader } from "../_components/page-header";
import { Section } from "@/components/ui/section";
import { StatCard } from "@/components/ui/stat-card";
import { TableWrap, Th, Td, EmptyRow } from "@/components/ui/table";
import { EstadoProyectoBadge } from "@/components/ui/badge";
import { ProyectosPorZonaChart, CicloPorZonaChart } from "./kpi-charts";

export const dynamic = "force-dynamic";

function EntregaTag({ v }: { v: boolean | null }) {
  if (v === null) return <span className="text-muted-foreground">—</span>;
  return v ? (
    <span className="inline-flex items-center gap-1 text-small font-medium text-green-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> A tiempo
    </span>
  ) : (
    <span className="text-small font-medium text-red-700">Tarde</span>
  );
}

export default async function KpiPage() {
  await requireRole(["admin", "oficina"]);
  const [proyectos, zonas] = await Promise.all([getKpiProyectos(), getKpiZonas()]);
  const resumen = resumirKpi(proyectos);

  return (
    <div data-cy="page-kpi" className="flex animate-fade-in flex-col gap-6">
      <DashboardPageHeader content={dashboardPages.kpi} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Proyectos" value={resumen.totalProyectos} icon={FolderKanban} />
        <StatCard label="Activos" value={resumen.activos} icon={Layers} tone="accent" />
        <StatCard label="Cerrados" value={resumen.cerrados} icon={CheckCircle2} tone="positive" />
        <StatCard
          label="Cumplimiento de entrega"
          value={resumen.cumplimientoPct === null ? "—" : `${resumen.cumplimientoPct}%`}
          icon={CalendarCheck}
          tone={
            resumen.cumplimientoPct === null
              ? "neutral"
              : resumen.cumplimientoPct >= 70
                ? "positive"
                : "warn"
          }
        />
      </div>

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
              <Th numeric>Proyectos</Th>
              <Th numeric>Activos</Th>
              <Th numeric>Cerrados</Th>
              <Th numeric>Ciclo prom. (días)</Th>
            </tr>
          </thead>
          <tbody>
            {zonas.length === 0 ? (
              <EmptyRow colSpan={5}>Sin datos.</EmptyRow>
            ) : (
              zonas.map((z) => (
                <tr key={z.zona ?? "sin-zona"}>
                  <Td className="text-foreground">{z.zona ?? "Sin zona"}</Td>
                  <Td numeric>{z.total_proyectos}</Td>
                  <Td numeric>{z.proyectos_activos}</Td>
                  <Td numeric>{z.proyectos_cerrados}</Td>
                  <Td numeric>
                    {z.promedio_dias_ciclo === null ? "—" : Math.round(z.promedio_dias_ciclo)}
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
              <Th numeric>Subproy.</Th>
              <Th numeric>Bitácora</Th>
              <Th numeric>Puntos</Th>
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
                      className="tabular-nums text-accent transition-colors hover:text-primary hover:underline"
                    >
                      {p.codigo}
                    </Link>
                  </Td>
                  <Td className="text-muted-foreground">{p.zona ?? "—"}</Td>
                  <Td>
                    <EstadoProyectoBadge estado={p.estado} />
                  </Td>
                  <Td numeric>{p.total_subproyectos}</Td>
                  <Td numeric>{p.total_entradas_bitacora}</Td>
                  <Td numeric>{p.total_puntos}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDate(p.fecha_estimada_entrega)}
                  </Td>
                  <Td>
                    <EntregaTag v={p.entregado_a_tiempo} />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </Section>
    </div>
  );
}
