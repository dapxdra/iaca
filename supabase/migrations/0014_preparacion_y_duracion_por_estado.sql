-- ============================================================================
-- IACA — Estado Preparación del subproyecto y duración esperada por estado
-- ============================================================================
-- Qué hace esta migración:
--   1. Subproyecto: nuevo estado `preparacion` después de Minutas. Flujo:
--      Trámite → Carga APT → Minutas → Preparación (+ cerrado/cancelado).
--   2. `subproyectos.estado_cambiado_at` (como en proyectos, 0007_...) y
--      `subproyectos.estados_secundarios_desde` — desde cuándo está marcado
--      cada estado de segundo plano. Lo mantiene un trigger: la app solo
--      escribe `estados_secundarios`.
--   3. `alertas_estado_umbral` — duración esperada por estado; al superarla
--      se notifica. Valores iniciales:
--        Preparación 7 · Visado 15 · Carga APT y Minutas 10 (cada uno) ·
--        Mantenimiento 15 · Dibujo (proyecto) 7.
--      Los demás estados del proyecto siguen con `alertas_config.proyecto_dias`.
--   4. `vw_proyectos_sin_movimiento` expone el umbral de cada proyecto, y la
--      vista nueva `vw_subproyectos_demorados`, los días en cada estado con
--      duración esperada.
--   5. `notificaciones`: tipo `subproyecto_demorado`, con el subproyecto y el
--      estado que se demoró.
--
-- Postgres no deja usar un valor de enum agregado en la misma transacción:
-- por eso las vistas y constraints de abajo comparan contra `::text`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Estado Preparación
-- ----------------------------------------------------------------------------
-- `after 'minutas'`: el trigger de correcciones compara por orden del enum.
alter type public.subproyecto_estado add value if not exists 'preparacion' after 'minutas';

create or replace function public.contar_correccion_subproyecto()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Retroceso dentro del flujo (ej. Preparación → Minutas) = una corrección.
  if new.estado < old.estado
     and old.estado in ('tramite', 'carga_apt', 'minutas', 'preparacion')
     and new.estado in ('tramite', 'carga_apt', 'minutas', 'preparacion') then
    new.correcciones := old.correcciones + 1;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Desde cuándo está el subproyecto en cada estado
-- ----------------------------------------------------------------------------
alter table public.subproyectos
  add column estado_cambiado_at timestamptz not null default now(),
  -- { "<estado secundario>": "<timestamptz>" }, solo los marcados.
  add column estados_secundarios_desde jsonb not null default '{}';

-- Sin historial: `updated_at` es la mejor aproximación para lo existente
-- (mismo criterio que 0007_...). Se apaga el trigger de updated_at para que
-- el backfill no lo pise con now().
alter table public.subproyectos disable trigger trg_subproyectos_updated_at;
update public.subproyectos s
set estado_cambiado_at = s.updated_at,
    estados_secundarios_desde = coalesce(
      (select jsonb_object_agg(e::text, to_jsonb(s.updated_at))
       from unnest(s.estados_secundarios) as e),
      '{}'
    );
alter table public.subproyectos enable trigger trg_subproyectos_updated_at;

create trigger trg_subproyectos_estado_cambiado before update on public.subproyectos
  for each row execute function public.stamp_estado_cambiado_at();

-- Conserva la fecha de los estados que siguen marcados, pone now() a los
-- nuevos y quita los desmarcados. Corre siempre, así la columna no se puede
-- escribir a mano.
create or replace function public.stamp_estados_secundarios_desde()
returns trigger language plpgsql set search_path = '' as $$
declare
  previo jsonb := case when tg_op = 'UPDATE' then old.estados_secundarios_desde else '{}' end;
begin
  select coalesce(jsonb_object_agg(e::text, coalesce(previo -> e::text, to_jsonb(now()))), '{}')
  into new.estados_secundarios_desde
  from unnest(new.estados_secundarios) as e;
  return new;
end;
$$;

create trigger trg_subproyectos_secundarios_desde before insert or update on public.subproyectos
  for each row execute function public.stamp_estados_secundarios_desde();

-- ----------------------------------------------------------------------------
-- 3. Duración esperada por estado
-- ----------------------------------------------------------------------------
-- Clave de texto y no enum: mezcla estados de proyecto, de subproyecto y de
-- segundo plano, y Carga APT y Minutas comparten una sola duración.
create table public.alertas_estado_umbral (
  clave text primary key
    check (clave in ('preparacion', 'visado', 'apt_minutas', 'mantenimiento', 'dibujo')),
  dias int not null check (dias between 1 and 365),
  updated_at timestamptz not null default now()
);

insert into public.alertas_estado_umbral (clave, dias) values
  ('preparacion', 7),
  ('visado', 15),
  ('apt_minutas', 10),
  ('mantenimiento', 15),
  ('dibujo', 7);

create trigger trg_alertas_estado_umbral_updated_at before update on public.alertas_estado_umbral
  for each row execute function public.set_updated_at();

alter table public.alertas_estado_umbral enable row level security;

-- Mismo criterio que alertas_tramite_umbral (0010_...): filas fijas, lee
-- staff, edita solo admin.
create policy "alertas_estado_umbral_select" on public.alertas_estado_umbral for select
  using (public.is_staff());
create policy "alertas_estado_umbral_update" on public.alertas_estado_umbral for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 4. Vistas
-- ----------------------------------------------------------------------------
-- Mismas columnas que en 0007_..., más `umbral_dias` y `supera_umbral`: el
-- del estado si tiene uno propio (Dibujo), si no el general.
drop view public.vw_proyectos_sin_movimiento;

create view public.vw_proyectos_sin_movimiento
  with (security_invoker = true) as
select
  x.*,
  coalesce(u.dias, c.proyecto_dias) as umbral_dias,
  x.dias_sin_movimiento >= coalesce(u.dias, c.proyecto_dias) as supera_umbral
from (
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
  where p.estado not in ('cerrado', 'cancelado')
) x
left join public.alertas_estado_umbral u on u.clave = x.estado::text
cross join public.alertas_config c;

-- Una fila por subproyecto abierto y estado con duración esperada: el
-- principal (Carga APT, Minutas, Preparación) y cada secundario marcado
-- (Visado, Mantenimiento). Apelación y Trámite no tienen duración: el
-- trámite ya se alerta solo (vw_tramites_sin_revision).
create view public.vw_subproyectos_demorados
  with (security_invoker = true) as
select
  x.*,
  p.codigo as proyecto_codigo,
  p.responsable_id as proyecto_responsable_id,
  u.dias as umbral_dias,
  x.dias_en_estado >= u.dias as supera_umbral
from (
  select
    s.id,
    s.proyecto_id,
    s.nombre,
    s.estado::text as estado,
    case when s.estado::text in ('carga_apt', 'minutas') then 'apt_minutas'
         else s.estado::text end as clave,
    current_date - s.estado_cambiado_at::date as dias_en_estado
  from public.subproyectos s
  where s.estado::text in ('carga_apt', 'minutas', 'preparacion')
  union all
  select
    s.id,
    s.proyecto_id,
    s.nombre,
    e.key,
    e.key,
    current_date - e.value::timestamptz::date
  from public.subproyectos s
  cross join lateral jsonb_each_text(s.estados_secundarios_desde) as e
  where s.estado::text not in ('cerrado', 'cancelado')
) x
join public.alertas_estado_umbral u on u.clave = x.clave
join public.proyectos p on p.id = x.proyecto_id;

-- ----------------------------------------------------------------------------
-- 5. Notificaciones de subproyecto demorado
-- ----------------------------------------------------------------------------
alter type public.notificacion_tipo add value if not exists 'subproyecto_demorado';

alter table public.notificaciones
  add column subproyecto_id uuid references public.subproyectos (id) on delete cascade,
  -- Estado que se demoró: un subproyecto puede estar a la vez en Preparación,
  -- Visado y Mantenimiento, y cada uno se avisa por separado.
  add column subproyecto_estado text,
  add constraint chk_notificaciones_subproyecto check (
    (tipo::text = 'subproyecto_demorado') = (subproyecto_id is not null and subproyecto_estado is not null)
  );
