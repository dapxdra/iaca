-- ============================================================================
-- IACA — Flujos separados de proyecto, subproyecto y trámite
-- ============================================================================
-- Qué hace esta migración:
--   1. Proyecto: Contacto → Cotización/Agenda → Cálculo → Georeferencia →
--      Dibujo → Entrega (+ cerrado/cancelado). `campo` se renombra a
--      `georeferencia` (los proyectos en Campo quedan en Georeferencia) y se
--      agrega `cotizacion_agenda`. El orden del flujo lo define ESTADO_FLOW
--      (src/lib/proyecto-flujo.ts), no el orden interno del enum.
--   2. Subproyecto: enum propio `subproyecto_estado` — Trámite → Carga APT →
--      Minutas (+ cerrado/cancelado). Los subproyectos abiertos arrancan en
--      Trámite. Se puede retroceder para corregir; cada retroceso suma 1 a
--      `subproyectos.correcciones` (trigger).
--   3. Subproyecto: estados de segundo plano simultáneos (Mantenimiento,
--      Apelación, Visado) en `subproyectos.estados_secundarios`. No cambian
--      el estado principal ni bloquean el cierre.
--   4. Trámite: `tipo_tramite` pasa de texto libre al enum `tramite_tipo`
--      (Plano catastrado, Consultoría, Alineamiento — el antiguo
--      `subproyecto_tipo`). El texto anterior se conserva en `notas`.
--      `subproyectos.tipo` se elimina: el tipo vive en el trámite.
--   5. Georeferencia es una compuerta: el proyecto no pasa de Georeferencia a
--      Dibujo mientras tenga subproyectos abiertos o trámites en curso.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Estados del proyecto
-- ----------------------------------------------------------------------------
alter type public.proyecto_estado rename value 'campo' to 'georeferencia';
alter type public.proyecto_estado add value if not exists 'cotizacion_agenda' after 'contacto';

-- ----------------------------------------------------------------------------
-- 2 y 3. Estados del subproyecto, correcciones y estados de segundo plano
-- ----------------------------------------------------------------------------
-- El orden del enum es el del flujo: el trigger de correcciones lo usa.
create type public.subproyecto_estado as enum (
  'tramite', 'carga_apt', 'minutas', 'cerrado', 'cancelado'
);

create type public.subproyecto_estado_secundario as enum (
  'mantenimiento', 'apelacion', 'visado'
);

alter table public.subproyectos alter column estado drop default;
alter table public.subproyectos
  alter column estado type public.subproyecto_estado using (
    case estado::text
      when 'cerrado'   then 'cerrado'
      when 'cancelado' then 'cancelado'
      else 'tramite'
    end
  )::public.subproyecto_estado;
alter table public.subproyectos alter column estado set default 'tramite';

alter table public.subproyectos
  add column correcciones int not null default 0 check (correcciones >= 0),
  add column estados_secundarios public.subproyecto_estado_secundario[] not null default '{}';

create or replace function public.contar_correccion_subproyecto()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Retroceso dentro del flujo (ej. Minutas → Carga APT) = una corrección.
  if new.estado < old.estado
     and old.estado in ('tramite', 'carga_apt', 'minutas')
     and new.estado in ('tramite', 'carga_apt', 'minutas') then
    new.correcciones := old.correcciones + 1;
  end if;
  return new;
end;
$$;

create trigger trg_subproyectos_correcciones before update of estado on public.subproyectos
  for each row execute function public.contar_correccion_subproyecto();

-- ----------------------------------------------------------------------------
-- 4. Tipo del trámite
-- ----------------------------------------------------------------------------
-- Las vistas dependen de `tipo_tramite`: se borran y se recrean abajo con la
-- misma definición (0010_... y 0011_...).
drop view public.vw_tramites_sin_revision;
drop view public.vw_tramites_cliente;

alter type public.subproyecto_tipo rename to tramite_tipo;

alter table public.tramites_gubernamentales add column tipo public.tramite_tipo;

-- Primero el tipo del subproyecto asociado; si no hay, se infiere del texto.
-- Lo que no se reconoce queda como plano catastrado (el trámite habitual).
update public.tramites_gubernamentales t
set tipo = coalesce(
  (select s.tipo from public.subproyectos s where s.id = t.subproyecto_id),
  case
    when t.tipo_tramite ilike '%alinea%' then 'alineamiento'
    when t.tipo_tramite ilike '%consult%' then 'consultoria'
    else 'plano_catastrado'
  end::public.tramite_tipo
);

-- El texto libre no se pierde: queda en las notas.
update public.tramites_gubernamentales
set notas = concat_ws(E'\n', notas, 'Tipo de trámite anterior: ' || tipo_tramite);

alter table public.tramites_gubernamentales drop column tipo_tramite;
alter table public.tramites_gubernamentales rename column tipo to tipo_tramite;
alter table public.tramites_gubernamentales alter column tipo_tramite set not null;

alter table public.subproyectos drop column tipo;

-- Igual que en 0010_...
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

-- Igual que en 0011_... (sin security_invoker, a propósito: ver ese archivo).
create view public.vw_tramites_cliente as
select
  t.id,
  t.proyecto_id,
  t.subproyecto_id,
  s.nombre as subproyecto_nombre,
  t.entidad,
  t.tipo_tramite,
  t.numero_expediente,
  t.estado,
  t.fecha_envio,
  t.fecha_ultima_revision,
  t.created_at
from public.tramites_gubernamentales t
join public.proyectos p on p.id = t.proyecto_id
left join public.subproyectos s on s.id = t.subproyecto_id
where p.cliente_id = public.current_user_cliente_id()
  and public.current_user_role() = 'cliente';

revoke all on public.vw_tramites_cliente from public, anon, authenticated;
grant select on public.vw_tramites_cliente to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Compuerta de Georeferencia (además del cierre de 0008_/0010_...)
-- ----------------------------------------------------------------------------
create or replace function public.check_cierre_proyecto()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.estado = 'cerrado' and old.estado is distinct from 'cerrado')
     or (new.estado = 'dibujo' and old.estado = 'georeferencia') then
    if exists (
      select 1 from public.tramites_gubernamentales t
      where t.proyecto_id = new.id
        and t.estado in ('pendiente', 'sellado_cfia', 'calificacion_rn', 'publico_defectuoso')
    ) then
      raise exception 'No se puede pasar a %: el proyecto tiene trámites en curso.', new.estado;
    end if;
    if exists (
      select 1 from public.subproyectos s
      where s.proyecto_id = new.id
        and s.estado not in ('cerrado', 'cancelado')
    ) then
      raise exception 'No se puede pasar a %: el proyecto tiene subproyectos sin cerrar.', new.estado;
    end if;
  end if;
  return new;
end;
$$;
