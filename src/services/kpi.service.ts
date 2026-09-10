/**
 * Servicio de Reportes KPI. Solo lectura — se apoya en las vistas
 * `vw_kpi_proyecto` y `vw_kpi_zona` (supabase/migrations/0001_init.sql), que
 * ya calculan los agregados en la base de datos.
 */
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type KpiProyecto = {
  proyecto_id: string;
  codigo: string;
  nombre: string;
  zona: string | null;
  estado: Database["public"]["Enums"]["proyecto_estado"];
  fecha_inicio: string | null;
  fecha_estimada_entrega: string | null;
  fecha_entrega_real: string | null;
  total_subproyectos: number;
  total_entradas_bitacora: number;
  total_puntos: number;
  entregado_a_tiempo: boolean | null;
};

export type KpiZona = {
  zona: string | null;
  total_proyectos: number;
  proyectos_cerrados: number;
  proyectos_activos: number;
  promedio_dias_ciclo: number | null;
};

export type KpiResumen = {
  totalProyectos: number;
  activos: number;
  cerrados: number;
  entregadosATiempo: number;
  entregadosTarde: number;
  cumplimientoPct: number | null;
};

export async function getKpiProyectos(): Promise<KpiProyecto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_kpi_proyecto")
    .select(
      "proyecto_id, codigo, nombre, zona, estado, fecha_inicio, fecha_estimada_entrega, fecha_entrega_real, total_subproyectos, total_entradas_bitacora, total_puntos, entregado_a_tiempo"
    )
    .order("codigo", { ascending: false });
  if (error) throw new Error("No se pudieron cargar los KPI por proyecto.");
  return (data ?? []) as unknown as KpiProyecto[];
}

export async function getKpiZonas(): Promise<KpiZona[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_kpi_zona")
    .select("zona, total_proyectos, proyectos_cerrados, proyectos_activos, promedio_dias_ciclo")
    .order("total_proyectos", { ascending: false });
  if (error) throw new Error("No se pudieron cargar los KPI por zona.");
  return (data ?? []) as unknown as KpiZona[];
}

/** Totales de cabecera derivados de los KPI por proyecto. */
export function resumirKpi(proyectos: KpiProyecto[]): KpiResumen {
  const cerrados = proyectos.filter((p) => p.estado === "cerrado");
  const activos = proyectos.filter(
    (p) => p.estado !== "cerrado" && p.estado !== "cancelado"
  );
  const aTiempo = proyectos.filter((p) => p.entregado_a_tiempo === true).length;
  const tarde = proyectos.filter((p) => p.entregado_a_tiempo === false).length;
  const conDato = aTiempo + tarde;

  return {
    totalProyectos: proyectos.length,
    activos: activos.length,
    cerrados: cerrados.length,
    entregadosATiempo: aTiempo,
    entregadosTarde: tarde,
    cumplimientoPct: conDato === 0 ? null : Math.round((aTiempo / conDato) * 100),
  };
}
