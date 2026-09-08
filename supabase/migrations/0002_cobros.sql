-- ============================================================================
-- IACA — Control de cobro (registro interno de pagos por proyecto)
-- ============================================================================
-- Alcance: registro interno de cuánto se debe cobrar por proyecto y qué
-- abonos/pagos se han recibido contra ese monto. NO genera comprobantes
-- fiscales (factura electrónica ante el Ministerio de Hacienda) — eso sigue
-- fuera de alcance del MVP, ver docs/REQUIREMENTS.md sección 11.

alter table public.proyectos
  add column monto_cobrar numeric(12, 2); -- null hasta que el proyecto esté cotizado

create type metodo_pago as enum ('efectivo', 'sinpe_movil', 'transferencia', 'cheque', 'otro');

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  monto numeric(12, 2) not null check (monto > 0),
  fecha_pago date not null default current_date,
  metodo metodo_pago not null default 'sinpe_movil',
  notas text,
  registrado_por uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index idx_pagos_proyecto on public.pagos (proyecto_id);
create index idx_pagos_fecha on public.pagos (fecha_pago);

-- Saldo pendiente calculado en consulta (no almacenado): igual criterio que
-- dias_sin_revision en 0001_init.sql — evita que quede desactualizado si se
-- corrige o elimina un pago.
create view public.vw_cobros_proyecto
  with (security_invoker = true) as
select
  p.id as proyecto_id,
  p.codigo,
  p.nombre,
  p.cliente_id,
  p.monto_cobrar,
  coalesce(sum(pg.monto), 0) as total_pagado,
  p.monto_cobrar - coalesce(sum(pg.monto), 0) as saldo_pendiente,
  max(pg.fecha_pago) as fecha_ultimo_pago
from public.proyectos p
left join public.pagos pg on pg.proyecto_id = p.id
group by p.id, p.codigo, p.nombre, p.cliente_id, p.monto_cobrar;

-- Corrige las vistas de 0001_init.sql: sin security_invoker, una vista corre
-- con los permisos de quien la creó (el rol que aplica las migraciones, no
-- el usuario autenticado que consulta vía la API), lo que rompe el
-- aislamiento de RLS de las tablas base. Ver aviso "Security Definer View"
-- de Supabase.
alter view public.vw_tramites_sin_revision set (security_invoker = true);
alter view public.vw_kpi_proyecto set (security_invoker = true);
alter view public.vw_kpi_zona set (security_invoker = true);

-- ----------------------------------------------------------------------------
-- Row Level Security — mismo criterio que clientes/proyectos: lectura para
-- cualquier usuario autenticado activo, escritura solo admin/oficina.
-- ----------------------------------------------------------------------------
alter table public.pagos enable row level security;

create policy "authenticated_read_pagos" on public.pagos for select
  using (auth.role() = 'authenticated');

create policy "staff_write_pagos" on public.pagos for all
  using (exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and pr.role in ('admin', 'oficina') and pr.active
  ));
