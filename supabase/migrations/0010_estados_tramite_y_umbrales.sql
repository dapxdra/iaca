-- ============================================================================
-- IACA — Estados reales del trámite de planos y umbral de alerta por estado
-- ============================================================================
-- Qué hace esta migración:
--   1. Reemplaza los estados genéricos del trámite (enviado, en revisión…) por
--      las etapas del plano ante el CFIA y el Registro Nacional. Se conserva
--      `pendiente` como estado inicial: el trámite se crea (por ejemplo, al
--      crear el subproyecto) antes de que el plano se presente.
--   2. `alertas_tramite_umbral` — días sin movimiento tolerados en cada estado
--      en curso; reemplaza el umbral único `alertas_config.tramite_dias`.
--   3. Recrea `vw_tramites_sin_revision` con el umbral de cada trámite.
--   4. Actualiza los triggers de cierre de 0008_... con los estados nuevos.
--
-- Estados en curso (bloquean el cierre y generan alertas): pendiente,
-- sellado_cfia, calificacion_rn, publico_defectuoso. Finales: publico_inscrito,
-- publico_aprobado, publico_cancelado. Debe coincidir con
-- TRAMITE_ESTADOS_EN_CURSO (src/lib/proyecto-flujo.ts).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Nuevo enum de estados
-- ----------------------------------------------------------------------------
-- La vista depende de la columna: se borra antes de cambiar el tipo y se
-- recrea en el paso 3.
drop view public.vw_tramites_sin_revision;

alter type public.tramite_estado rename to tramite_estado_old;

create type public.tramite_estado as enum (
  'pendiente',
  'sellado_cfia',
  'calificacion_rn',
  'publico_defectuoso',
  'publico_inscrito',
  'publico_aprobado',
  'publico_cancelado'
);

-- Equivalencias para los trámites existentes: cada estado viejo pasa a la
-- etapa que significaba en la práctica.
alter table public.tramites_gubernamentales alter column estado drop default;
alter table public.tramites_gubernamentales
  alter column estado type public.tramite_estado using (
    case estado::text
      when 'pendiente'   then 'pendiente'
      when 'enviado'     then 'sellado_cfia'
      when 'en_revision' then 'calificacion_rn'
      when 'observado'   then 'publico_defectuoso'
      when 'aprobado'    then 'publico_inscrito'
      when 'rechazado'   then 'publico_cancelado'
    end
  )::public.tramite_estado;
alter table public.tramites_gubernamentales alter column estado set default 'pendiente';

drop type public.tramite_estado_old;

-- ----------------------------------------------------------------------------
-- 2. Umbral de alerta por estado
-- ----------------------------------------------------------------------------
-- Solo los estados en curso: un trámite en estado final no se alerta.
create table public.alertas_tramite_umbral (
  estado public.tramite_estado primary key
    check (estado in ('pendiente', 'sellado_cfia', 'calificacion_rn', 'publico_defectuoso')),
  dias int not null check (dias between 1 and 365),
  updated_at timestamptz not null default now()
);

-- Arranca con el umbral único que ya tenía configurado el admin.
insert into public.alertas_tramite_umbral (estado, dias)
select e.estado::public.tramite_estado, coalesce((select tramite_dias from public.alertas_config), 30)
from unnest(array['pendiente', 'sellado_cfia', 'calificacion_rn', 'publico_defectuoso']) as e(estado);

create trigger trg_alertas_tramite_umbral_updated_at before update on public.alertas_tramite_umbral
  for each row execute function public.set_updated_at();

alter table public.alertas_tramite_umbral enable row level security;

-- Mismo criterio que alertas_config: lee staff, edita solo admin. Sin insert
-- ni delete: las filas son fijas, una por estado en curso.
create policy "alertas_tramite_umbral_select" on public.alertas_tramite_umbral for select
  using (public.is_staff());
create policy "alertas_tramite_umbral_update" on public.alertas_tramite_umbral for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

alter table public.alertas_config drop column tramite_dias;

-- ----------------------------------------------------------------------------
-- 3. Vista de trámites sin movimiento, con su umbral
-- ----------------------------------------------------------------------------
-- Mismas columnas que en 0007_..., más `umbral_dias` y `supera_umbral`: el
-- job de alertas y el panel de /tramites filtran por `supera_umbral` porque
-- PostgREST no compara dos columnas entre sí.
create view public.vw_tramites_sin_revision
  with (security_invoker = true) as
select
  x.*,
  u.dias as umbral_dias,
  x.dias_sin_revision >= u.dias as supera_umbral
from (
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
  where t.estado in ('pendiente', 'sellado_cfia', 'calificacion_rn', 'publico_defectuoso')
) x
left join public.alertas_tramite_umbral u on u.estado = x.estado;

-- ----------------------------------------------------------------------------
-- 4. Triggers de cierre (0008_...) con los estados nuevos
-- ----------------------------------------------------------------------------
create or replace function public.check_cierre_proyecto()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.estado = 'cerrado' and old.estado is distinct from 'cerrado' then
    if exists (
      select 1 from public.tramites_gubernamentales t
      where t.proyecto_id = new.id
        and t.estado in ('pendiente', 'sellado_cfia', 'calificacion_rn', 'publico_defectuoso')
    ) then
      raise exception 'No se puede cerrar el proyecto: tiene trámites en curso.';
    end if;
    if exists (
      select 1 from public.subproyectos s
      where s.proyecto_id = new.id
        and s.estado not in ('cerrado', 'cancelado')
    ) then
      raise exception 'No se puede cerrar el proyecto: tiene subproyectos sin cerrar.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_cierre_subproyecto()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.estado = 'cerrado' and old.estado is distinct from 'cerrado' then
    if exists (
      select 1 from public.tramites_gubernamentales t
      where t.subproyecto_id = new.id
        and t.estado in ('pendiente', 'sellado_cfia', 'calificacion_rn', 'publico_defectuoso')
    ) then
      raise exception 'No se puede cerrar el subproyecto: tiene trámites en curso.';
    end if;
  end if;
  return new;
end;
$$;
