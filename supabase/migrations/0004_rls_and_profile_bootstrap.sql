-- ============================================================================
-- IACA — Bootstrap de perfiles + RLS por rol (reemplaza las políticas
-- placeholder de 0001_init.sql y 0002_cobros.sql)
-- ============================================================================
-- Qué hace esta migración:
--   1. Crea el perfil automáticamente cuando se registra un usuario en
--      Supabase Auth (trigger sobre auth.users). Sin esto, un usuario podía
--      iniciar sesión pero no tener fila en public.profiles y toda consulta
--      con RLS por rol fallaba.
--   2. Backfill: el/los usuarios que ya existían quedan como 'admin' para
--      poder operar el panel desde el primer día.
--   3. Función `current_user_role()` (SECURITY DEFINER) que lee el rol del
--      usuario actual SIN pasar por RLS — evita la recursión infinita de
--      "para leer profiles necesito una policy que lee profiles".
--   4. Políticas RLS definitivas: lectura para cualquier usuario con perfil
--      activo; escritura de clientes/proyectos/trámites/pagos solo para
--      admin/oficina; escritura de bitácora también para campo (y solo sobre
--      sus propias entradas).
--   5. Triggers BEFORE INSERT que sellan created_by / registrado_por /
--      trabajador_id con auth.uid() — el cliente no puede falsificar autoría.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1 + 2. Perfil automático al registrarse + backfill de usuarios existentes
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'campo')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuarios ya registrados antes de este trigger: crear su perfil como admin
-- (bootstrap — hay que poder entrar al panel para promover/crear a los demás).
insert into public.profiles (id, full_name, role)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
  'admin'
from auth.users u
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. Rol del usuario actual, sin recursión de RLS
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid()) and active
$$;

revoke execute on function public.current_user_role() from anon;

create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.current_user_role() in ('admin', 'oficina')
$$;

create or replace function public.is_field_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.current_user_role() in ('admin', 'oficina', 'campo')
$$;

-- ----------------------------------------------------------------------------
-- 4. Políticas RLS — borrar placeholders de 0001/0002 y recrear
-- ----------------------------------------------------------------------------
drop policy if exists "authenticated_read_profiles"    on public.profiles;
drop policy if exists "authenticated_read_clientes"    on public.clientes;
drop policy if exists "authenticated_read_proyectos"   on public.proyectos;
drop policy if exists "authenticated_read_subproyectos" on public.subproyectos;
drop policy if exists "authenticated_read_puntos"      on public.puntos_topograficos;
drop policy if exists "authenticated_read_archivos"    on public.archivos_proyecto;
drop policy if exists "authenticated_read_bitacora"    on public.bitacora_campo;
drop policy if exists "authenticated_read_fotos"       on public.bitacora_fotos;
drop policy if exists "authenticated_read_tramites"    on public.tramites_gubernamentales;
drop policy if exists "authenticated_read_pagos"       on public.pagos;
drop policy if exists "staff_write_clientes"           on public.clientes;
drop policy if exists "staff_write_proyectos"          on public.proyectos;
drop policy if exists "staff_write_pagos"              on public.pagos;
drop policy if exists "campo_write_bitacora"           on public.bitacora_campo;

-- profiles ------------------------------------------------------------------
create policy "profiles_select" on public.profiles for select
  using (id = (select auth.uid()) or public.is_staff());
create policy "profiles_update_admin" on public.profiles for update
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
create policy "profiles_insert_admin" on public.profiles for insert
  with check (public.current_user_role() = 'admin');

-- Lectura general: cualquier usuario con perfil activo -----------------------
create policy "clientes_select"     on public.clientes            for select using (public.current_user_role() is not null);
create policy "proyectos_select"    on public.proyectos           for select using (public.current_user_role() is not null);
create policy "subproyectos_select" on public.subproyectos        for select using (public.current_user_role() is not null);
create policy "puntos_select"       on public.puntos_topograficos for select using (public.current_user_role() is not null);
create policy "archivos_select"     on public.archivos_proyecto   for select using (public.current_user_role() is not null);
create policy "bitacora_select"     on public.bitacora_campo      for select using (public.current_user_role() is not null);
create policy "fotos_select"        on public.bitacora_fotos      for select using (public.current_user_role() is not null);
create policy "tramites_select"     on public.tramites_gubernamentales for select using (public.current_user_role() is not null);
create policy "pagos_select"        on public.pagos               for select using (public.current_user_role() is not null);

-- Escritura de oficina (admin/oficina) ------------------------------------
create policy "clientes_write"     on public.clientes            for all using (public.is_staff()) with check (public.is_staff());
create policy "proyectos_write"    on public.proyectos           for all using (public.is_staff()) with check (public.is_staff());
create policy "subproyectos_write" on public.subproyectos        for all using (public.is_staff()) with check (public.is_staff());
create policy "puntos_write"       on public.puntos_topograficos for all using (public.is_staff()) with check (public.is_staff());
create policy "archivos_write"     on public.archivos_proyecto   for all using (public.is_staff()) with check (public.is_staff());
create policy "tramites_write"     on public.tramites_gubernamentales for all using (public.is_staff()) with check (public.is_staff());
create policy "pagos_write"        on public.pagos               for all using (public.is_staff()) with check (public.is_staff());

-- Bitácora de campo: admin/oficina sobre cualquier entrada; campo solo sobre
-- las suyas. Se separan los comandos para poder exigir `trabajador_id` propio.
create policy "bitacora_insert" on public.bitacora_campo for insert
  with check (
    public.is_field_staff()
    and (public.is_staff() or trabajador_id = (select auth.uid()))
  );
create policy "bitacora_update" on public.bitacora_campo for update
  using (public.is_staff() or trabajador_id = (select auth.uid()))
  with check (public.is_staff() or trabajador_id = (select auth.uid()));
create policy "bitacora_delete" on public.bitacora_campo for delete
  using (public.is_staff() or trabajador_id = (select auth.uid()));

create policy "fotos_write" on public.bitacora_fotos for all
  using (
    public.is_field_staff()
    and exists (
      select 1 from public.bitacora_campo b
      where b.id = bitacora_id
        and (public.is_staff() or b.trabajador_id = (select auth.uid()))
    )
  )
  with check (
    public.is_field_staff()
    and exists (
      select 1 from public.bitacora_campo b
      where b.id = bitacora_id
        and (public.is_staff() or b.trabajador_id = (select auth.uid()))
    )
  );

-- ----------------------------------------------------------------------------
-- 5. Sellado de autoría (BEFORE INSERT) — el usuario no envía estos campos;
--    si los envía, se sobrescriben con el usuario autenticado.
-- ----------------------------------------------------------------------------
create or replace function public.stamp_created_by()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.created_by := coalesce(new.created_by, (select auth.uid()));
  return new;
end;
$$;

create trigger trg_clientes_created_by  before insert on public.clientes
  for each row execute function public.stamp_created_by();
create trigger trg_proyectos_created_by before insert on public.proyectos
  for each row execute function public.stamp_created_by();

create or replace function public.stamp_pago_registrado_por()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.registrado_por := coalesce(new.registrado_por, (select auth.uid()));
  return new;
end;
$$;
create trigger trg_pagos_registrado_por before insert on public.pagos
  for each row execute function public.stamp_pago_registrado_por();

create or replace function public.stamp_bitacora_trabajador()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.trabajador_id := coalesce(new.trabajador_id, (select auth.uid()));
  return new;
end;
$$;
create trigger trg_bitacora_trabajador before insert on public.bitacora_campo
  for each row execute function public.stamp_bitacora_trabajador();
