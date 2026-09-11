"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KpiZona } from "@/services/kpi.service";

// Recharts necesita valores concretos, no variables CSS. Se mantienen
// alineados con globals.css (navy / índigo-acento / verde).
const NAVY = "#262f66";
const ACCENT = "#4338ca";
const SLATE = "#575d83";
const GREEN = "#15803d";
const PAPER = "#fefef0";

const tooltipStyle = {
  border: `1px solid ${SLATE}33`,
  borderRadius: 8,
  fontSize: 12,
  background: PAPER,
  boxShadow: "0 4px 12px -2px rgb(26 24 37 / 0.12)",
  padding: "8px 10px",
} as const;

const axisTick = { fontSize: 12, fill: SLATE } as const;

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-72 place-items-center text-center text-small text-muted-foreground">
      {children}
    </div>
  );
}

export function ProyectosPorZonaChart({ zonas }: { zonas: KpiZona[] }) {
  const data = zonas.map((z) => ({
    zona: z.zona ?? "Sin zona",
    Activos: z.proyectos_activos,
    Cerrados: z.proyectos_cerrados,
  }));

  if (data.length === 0) return <EmptyChart>Sin datos para graficar.</EmptyChart>;

  return (
    <div className="h-72 w-full" data-cy="kpi-chart-zona">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={SLATE} strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="zona" tick={axisTick} tickLine={false} axisLine={{ stroke: `${SLATE}33` }} />
          <YAxis allowDecimals={false} tick={axisTick} width={28} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: `${SLATE}12` }} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
          <Bar dataKey="Activos" fill={ACCENT} radius={[3, 3, 0, 0]} maxBarSize={44} />
          <Bar dataKey="Cerrados" fill={GREEN} radius={[3, 3, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CicloPorZonaChart({ zonas }: { zonas: KpiZona[] }) {
  const data = zonas
    .filter((z) => z.promedio_dias_ciclo !== null)
    .map((z) => ({
      zona: z.zona ?? "Sin zona",
      dias: Math.round(z.promedio_dias_ciclo as number),
    }));

  if (data.length === 0) {
    return (
      <EmptyChart>Todavía no hay proyectos cerrados para calcular el ciclo promedio.</EmptyChart>
    );
  }

  return (
    <div className="h-72 w-full" data-cy="kpi-chart-ciclo">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={SLATE} strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="zona" tick={axisTick} tickLine={false} axisLine={{ stroke: `${SLATE}33` }} />
          <YAxis allowDecimals={false} tick={axisTick} width={28} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: `${SLATE}12` }} contentStyle={tooltipStyle} />
          <Bar dataKey="dias" radius={[3, 3, 0, 0]} maxBarSize={52}>
            {data.map((_, i) => (
              <Cell key={i} fill={NAVY} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
