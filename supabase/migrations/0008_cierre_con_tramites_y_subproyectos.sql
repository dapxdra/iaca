-- ============================================================================
-- IACA — Reglas de cierre de proyectos y subproyectos
-- ============================================================================
-- Qué hace esta migración:
--   1. `subproyecto_id` (opcional) en trámites, para saber a qué subproyecto
--      corresponde cada trámite (ej. la inscripción del plano de un lote).
--   2. Un proyecto no se puede cerrar si tiene trámites en curso o algún
--      subproyecto sin terminar (cerrado o cancelado).
--   3. Un subproyecto no se puede cerrar si tiene trámites en curso.
--
-- La app valida lo mismo antes (con mensajes detallados); los triggers son la
-- garantía de que la regla se cumple aunque se escriba por otro camino.
-- "En curso" = cualquier estado no final: pendiente, enviado, en_revision,
-- observado. Debe coincidir con TRAMITE_ESTADOS_EN_CURSO (src/lib/proyecto-flujo.ts).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Trámite → subproyecto
-- ----------------------------------------------------------------------------
-- FK compuesta: garantiza que el subproyecto pertenezca al mismo proyecto del
-- trámite. Al borrar el subproyecto solo se limpia `subproyecto_id` (el
-- trámite sigue colgando del proyecto).
alter table public.subproyectos
  add constraint subproyectos_id_proyecto_key unique (id, proyecto_id);

alter table public.tramites_gubernamentales
  add column subproyecto_id uuid,
  add constraint tramites_gubernamentales_subproyecto_fkey
    foreign key (subproyecto_id, proyecto_id)
    references public.subproyectos (id, proyecto_id)
    on delete set null (subproyecto_id);

create index idx_tramites_subproyecto on public.tramites_gubernamentales (subproyecto_id);

-- ----------------------------------------------------------------------------
-- 2. Cierre del proyecto
-- ----------------------------------------------------------------------------
create or replace function public.check_cierre_proyecto()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.estado = 'cerrado' and old.estado is distinct from 'cerrado' then
    if exists (
      select 1 from public.tramites_gubernamentales t
      where t.proyecto_id = new.id
        and t.estado in ('pendiente', 'enviado', 'en_revision', 'observado')
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

create trigger trg_proyectos_check_cierre before update on public.proyectos
  for each row execute function public.check_cierre_proyecto();

-- ----------------------------------------------------------------------------
-- 3. Cierre del subproyecto
-- ----------------------------------------------------------------------------
create or replace function public.check_cierre_subproyecto()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.estado = 'cerrado' and old.estado is distinct from 'cerrado' then
    if exists (
      select 1 from public.tramites_gubernamentales t
      where t.subproyecto_id = new.id
        and t.estado in ('pendiente', 'enviado', 'en_revision', 'observado')
    ) then
      raise exception 'No se puede cerrar el subproyecto: tiene trámites en curso.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_subproyectos_check_cierre before update on public.subproyectos
  for each row execute function public.check_cierre_subproyecto();
