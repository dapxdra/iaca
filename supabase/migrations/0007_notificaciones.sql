-- ============================================================================
-- IACA — Notificaciones de proyectos y trámites sin movimiento
-- ============================================================================
-- Qué hace esta migración:
--   1. `estado_cambiado_at` en proyectos y trámites: `updated_at` cambia con
--      cualquier edición (corregir un teléfono "reinicia" el reloj), así que no
--      sirve para saber hace cuánto no avanza el estado.
--   2. `alertas_config` — una sola fila con los umbrales que edita el admin.
--   3. Vistas `vw_proyectos_sin_movimiento` y `vw_tramites_sin_revision`
--      (recreada) con los días sin movimiento, calculados en consulta como el
--      resto de métricas de 0001_init.sql.
--   4. `notificaciones` — bandeja interna por usuario. La escribe solo el job
--      diario (/api/cron/alertas, service role); el usuario solo lee las suyas
--      y las marca como leídas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Fecha del último cambio de estado
-- ----------------------------------------------------------------------------
alter table public.proyectos
  add column estado_cambiado_at timestamptz not null default now();

-- No existe historial de estados: `updated_at` es la mejor aproximación para
-- los proyectos que ya existían. Sin esto, todos arrancarían "recién movidos".
-- Se apaga el trigger de updated_at para que el backfill no lo pise con now().
alter table public.proyectos disable trigger trg_proyectos_updated_at;
update public.proyectos set estado_cambiado_at = updated_at;
alter table public.proyectos enable trigger trg_proyectos_updated_at;

-- En trámites queda nulo hasta el primer cambio de estado: los días se cuentan
-- desde la fecha más reciente entre envío, última revisión y cambio de estado,
-- así los trámites existentes conservan exactamente el conteo que ya tenían.
alter table public.tramites_gubernamentales
  add column estado_cambiado_at timestamptz;

create or replace function public.stamp_estado_cambiado_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.estado is distinct from old.estado then
    new.estado_cambiado_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_proyectos_estado_cambiado before update on public.proyectos
  for each row execute function public.stamp_estado_cambiado_at();
create trigger trg_tramites_estado_cambiado before update on public.tramites_gubernamentales
  for each row execute function public.stamp_estado_cambiado_at();

-- ----------------------------------------------------------------------------
-- 2. Configuración de alertas (fila única)
-- ----------------------------------------------------------------------------
create table public.alertas_config (
  -- Fila única: la PK booleana con CHECK impide insertar una segunda.
  id boolean primary key default true check (id),
  proyecto_dias int not null default 15 check (proyecto_dias between 1 and 365),
  tramite_dias int not null default 30 check (tramite_dias between 1 and 365),
  -- Cada cuántos días se vuelve a avisar de algo que sigue sin moverse.
  recordatorio_dias int not null default 7 check (recordatorio_dias between 1 and 90),
  correo_activo boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.alertas_config (id) values (true);

create trigger trg_alertas_config_updated_at before update on public.alertas_config
  for each row execute function public.set_updated_at();

alter table public.alertas_config enable row level security;

create policy "alertas_config_select" on public.alertas_config for select
  using (public.is_staff());
create policy "alertas_config_update" on public.alertas_config for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 3. Vistas de días sin movimiento
-- ----------------------------------------------------------------------------
-- Un proyecto se considera en movimiento si cambió de estado o si hubo
-- bitácora de campo: en la fase "Campo" el estado no cambia durante semanas
-- aunque el equipo esté trabajando todos los días.
create view public.vw_proyectos_sin_movimiento
  with (security_invoker = true) as
select
  p.id,
  p.codigo,
  p.nombre,
  p.estado,
  p.responsable_id,
  p.estado_cambiado_at,
  b.ultima_bitacora,
  current_date - greatest(p.estado_cambiado_at::date, b.ultima_bitacora) as dias_sin_movimiento
from public.proyectos p
left join lateral (
  select max(bc.fecha) as ultima_bitacora
  from public.bitacora_campo bc
  where bc.proyecto_id = p.id
) b on true
where p.estado not in ('cerrado', 'cancelado');

-- Se recrea (no `create or replace`) porque la original usaba `t.*` y la lista
-- de columnas cambia. Cambios respecto de 0001_init.sql:
--   - incluye 'pendiente': un trámite que nunca se envió también se duerme;
--   - cuenta también el último cambio de estado;
--   - expone el responsable del proyecto, para avisarle si el trámite no tiene.
drop view public.vw_tramites_sin_revision;

create view public.vw_tramites_sin_revision
  with (security_invoker = true) as
select
  t.id,
  t.proyecto_id,
  t.entidad,
  t.tipo_tramite,
  t.numero_expediente,
  t.estado,
  t.fecha_envio,
  t.fecha_ultima_revision,
  t.responsable_id,
  p.responsable_id as proyecto_responsable_id,
  p.codigo as proyecto_codigo,
  p.nombre as proyecto_nombre,
  current_date - coalesce(
    greatest(t.fecha_ultima_revision, t.fecha_envio, t.estado_cambiado_at::date),
    t.created_at::date
  ) as dias_sin_revision
from public.tramites_gubernamentales t
join public.proyectos p on p.id = t.proyecto_id
where t.estado in ('pendiente', 'enviado', 'en_revision', 'observado');

-- ----------------------------------------------------------------------------
-- 4. Notificaciones internas
-- ----------------------------------------------------------------------------
create type notificacion_tipo as enum ('proyecto_sin_movimiento', 'tramite_sin_movimiento');

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  tipo notificacion_tipo not null,
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  tramite_id uuid references public.tramites_gubernamentales (id) on delete cascade,
  titulo text not null,
  mensaje text not null,
  -- Ruta interna (ej. /proyectos/<id>); el correo le antepone el dominio.
  enlace text not null,
  dias int not null,
  leida_at timestamptz,
  correo_enviado_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chk_notificaciones_tramite check (
    (tipo = 'tramite_sin_movimiento') = (tramite_id is not null)
  )
);

create index idx_notificaciones_usuario on public.notificaciones (usuario_id, created_at desc);
create index idx_notificaciones_no_leidas on public.notificaciones (usuario_id)
  where leida_at is null;
-- El job consulta "¿ya se avisó de esto hace poco?" antes de crear otra.
create index idx_notificaciones_recientes on public.notificaciones (created_at desc, proyecto_id);

alter table public.notificaciones enable row level security;

-- Sin política de insert ni delete: solo el job (service role) crea filas.
create policy "notificaciones_select" on public.notificaciones for select
  using (usuario_id = (select auth.uid()));
create policy "notificaciones_update" on public.notificaciones for update
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

-- La política de update deja tocar la fila propia; esto restringe a qué
-- columna: el usuario no puede reescribir el título ni el enlace.
revoke update on public.notificaciones from authenticated, anon;
grant update (leida_at) on public.notificaciones to authenticated;
