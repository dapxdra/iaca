-- ============================================================================
-- IACA — Tipo de subproyecto, eventos/indicaciones del proyecto y KPI por
-- tipo de servicio
-- ============================================================================
-- Qué hace esta migración:
--   1. `subproyectos.tipo` — Plano catastrado, Consultoría o Alineamiento.
--      Nullable: los subproyectos que ya existen no tienen tipo; la app lo
--      exige al crear uno nuevo.
--   2. `proyecto_eventos` — eventos e indicaciones con fecha, registrados en
--      el detalle del proyecto. Solo staff (admin/oficina): son notas
--      internas, el cliente no las ve.
--   3. `vw_kpi_tipo_servicio` — mismos agregados que `vw_kpi_zona`, agrupados
--      por `proyectos.tipo_servicio`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tipo de subproyecto
-- ----------------------------------------------------------------------------
create type public.subproyecto_tipo as enum ('plano_catastrado', 'consultoria', 'alineamiento');

alter table public.subproyectos add column tipo public.subproyecto_tipo;

-- ----------------------------------------------------------------------------
-- 2. Eventos / indicaciones del proyecto
-- ----------------------------------------------------------------------------
create table public.proyecto_eventos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  fecha date not null default current_date,
  descripcion text not null,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index idx_proyecto_eventos_proyecto on public.proyecto_eventos (proyecto_id, fecha desc);

alter table public.proyecto_eventos enable row level security;

create policy "proyecto_eventos_select" on public.proyecto_eventos for select
  using (public.is_staff());
create policy "proyecto_eventos_write" on public.proyecto_eventos for all
  using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- 3. KPI por tipo de servicio
-- ----------------------------------------------------------------------------
create view public.vw_kpi_tipo_servicio
  with (security_invoker = true) as
select
  tipo_servicio,
  count(*) as total_proyectos,
  count(*) filter (where estado = 'cerrado') as proyectos_cerrados,
  count(*) filter (where estado not in ('cerrado', 'cancelado')) as proyectos_activos,
  count(*) filter (where fecha_entrega_real <= fecha_estimada_entrega) as entregados_a_tiempo,
  count(*) filter (where fecha_entrega_real > fecha_estimada_entrega) as entregados_tarde,
  avg(fecha_entrega_real - fecha_inicio) filter (where fecha_entrega_real is not null) as promedio_dias_ciclo
from public.proyectos
group by tipo_servicio;
