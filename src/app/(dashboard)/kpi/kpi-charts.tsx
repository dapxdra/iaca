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

// Tokens del design system (design-system/MASTER.md). Recharts necesita
// valores concretos, no variables CSS.
const NAVY = "#262f66";
const SLATE = "#575d83";
const GREEN = "#15803d";

export function ProyectosPorZonaChart({ zonas }: { zonas: KpiZona[] }) {
  const data = zonas.map((z) => ({
    zona: z.zona ?? "Sin zona",
    Activos: z.proyectos_activos,
    Cerrados: z.proyectos_cerrados,
  }));

  if (data.length === 0) {
    return <p className="text-small text-muted-foreground">Sin datos para graficar.</p>;
  }

  return (
    <div className="h-72 w-full" data-cy="kpi-chart-zona">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={SLATE} strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="zona" tick={{ fontSize: 12, fill: SLATE }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: SLATE }} width={32} />
          <Tooltip
            contentStyle={{
              border: `1px solid ${SLATE}`,
              borderRadius: 0,
              fontSize: 12,
              background: "#fefeda",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Activos" fill={NAVY} />
          <Bar dataKey="Cerrados" fill={GREEN} />
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
      <p className="text-small text-muted-foreground">
        Todavía no hay proyectos cerrados para calcular el ciclo promedio.
      </p>
    );
  }

  return (
    <div className="h-72 w-full" data-cy="kpi-chart-ciclo">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={SLATE} strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="zona" tick={{ fontSize: 12, fill: SLATE }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: SLATE }} width={32} />
          <Tooltip
            contentStyle={{
              border: `1px solid ${SLATE}`,
              borderRadius: 0,
              fontSize: 12,
              background: "#fefeda",
            }}
          />
          <Bar dataKey="dias">
            {data.map((_, i) => (
              <Cell key={i} fill={NAVY} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
