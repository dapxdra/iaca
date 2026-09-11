-- ============================================================================
-- IACA — Portal de cliente, acceso por rol más estricto, y Storage
-- ============================================================================
-- Qué hace esta migración:
--   1. `profiles.cliente_id` — enlaza un perfil con rol 'cliente' a su fila en
--      `clientes`, para poder filtrar "sus" proyectos. Un perfil admin/oficina/
--      campo nunca debería tener cliente_id (CHECK lo garantiza).
--   2. `current_user_cliente_id()` — helper SECURITY DEFINER, mismo patrón que
--      `current_user_role()` (evita recursión de RLS).
--   3. RLS más estricta, ahora que hay 4 roles con pantallas distintas
--      (ver CLAUDE.md / docs/REQUIREMENTS.md):
--        - `cliente`: solo lee SU fila de `clientes` y SUS proyectos (ningún
--          otro dato — ni bitácora, ni trámites, ni cobros, ni otros clientes).
--        - `campo`: lee proyectos (los necesita para elegir en qué proyecto
--          registra bitácora) y su propia bitácora/fotos; NO lee clientes,
--          trámites, pagos, subproyectos ni puntos topográficos.
--        - `admin`/`oficina`: sin cambios, acceso total de lectura.
--      La escritura no cambia (ya estaba restringida a admin/oficina, salvo
--      bitácora que ya permitía campo sobre sus propias filas).
--   4. Buckets privados de Storage (`bitacora-fotos`, `archivos-proyecto`) +
--      políticas: subir (insert) lo puede hacer cualquier "field staff"
--      (admin/oficina/campo, quienes usan la bitácora); borrar solo staff.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles.cliente_id
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column cliente_id uuid references public.clientes (id) on delete set null;

alter table public.profiles
  add constraint chk_profiles_cliente_id_role
  check (cliente_id is null or role = 'cliente');

create index idx_profiles_cliente_id on public.profiles (cliente_id);

-- ----------------------------------------------------------------------------
-- 2. Helper: cliente_id del usuario actual
-- ----------------------------------------------------------------------------
create or replace function public.current_user_cliente_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cliente_id from public.profiles where id = (select auth.uid()) and active
$$;

-- ----------------------------------------------------------------------------
-- 3. RLS — lectura por rol
-- ----------------------------------------------------------------------------
drop policy if exists "clientes_select"     on public.clientes;
drop policy if exists "proyectos_select"    on public.proyectos;
drop policy if exists "subproyectos_select" on public.subproyectos;
drop policy if exists "puntos_select"       on public.puntos_topograficos;
drop policy if exists "archivos_select"     on public.archivos_proyecto;
drop policy if exists "archivos_write"      on public.archivos_proyecto;
drop policy if exists "bitacora_select"     on public.bitacora_campo;
drop policy if exists "fotos_select"        on public.bitacora_fotos;
drop policy if exists "tramites_select"     on public.tramites_gubernamentales;
drop policy if exists "pagos_select"        on public.pagos;

-- clientes: staff ve todos; un cliente ve únicamente su propia fila.
create policy "clientes_select" on public.clientes for select
  using (
    public.is_staff()
    or (public.current_user_role() = 'cliente' and id = public.current_user_cliente_id())
  );

-- proyectos: field staff (admin/oficina/campo) ve todos; un cliente solo los
-- proyectos con su cliente_id.
create policy "proyectos_select" on public.proyectos for select
  using (
    public.is_field_staff()
    or (public.current_user_role() = 'cliente' and cliente_id = public.current_user_cliente_id())
  );

-- Detalle operativo interno: solo staff (ni campo ni cliente lo necesitan).
create policy "subproyectos_select" on public.subproyectos for select
  using (public.is_staff());
create policy "puntos_select" on public.puntos_topograficos for select
  using (public.is_staff());
create policy "tramites_select" on public.tramites_gubernamentales for select
  using (public.is_staff());
create policy "pagos_select" on public.pagos for select
  using (public.is_staff());

-- Bitácora: solo field staff (quienes trabajan en campo/oficina), nunca cliente.
create policy "bitacora_select" on public.bitacora_campo for select
  using (public.is_field_staff());
create policy "fotos_select" on public.bitacora_fotos for select
  using (public.is_field_staff());

-- Archivos de proyecto (CSV/DWG/fotos de campo referenciadas desde bitácora):
-- field staff puede ver y subir; solo staff puede editar/borrar.
create policy "archivos_select" on public.archivos_proyecto for select
  using (public.is_field_staff());
create policy "archivos_insert" on public.archivos_proyecto for insert
  with check (public.is_field_staff());
create policy "archivos_update" on public.archivos_proyecto for update
  using (public.is_staff()) with check (public.is_staff());
create policy "archivos_delete" on public.archivos_proyecto for delete
  using (public.is_staff());

-- ----------------------------------------------------------------------------
-- 4. Storage: buckets privados + políticas
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('bitacora-fotos', 'bitacora-fotos', false, 8388608),   -- 8 MB por foto
  ('archivos-proyecto', 'archivos-proyecto', false, 15728640) -- 15 MB por archivo
on conflict (id) do nothing;

drop policy if exists "bitacora_fotos_insert" on storage.objects;
drop policy if exists "bitacora_fotos_select" on storage.objects;
drop policy if exists "bitacora_fotos_delete" on storage.objects;
drop policy if exists "archivos_proyecto_insert" on storage.objects;
drop policy if exists "archivos_proyecto_select" on storage.objects;
drop policy if exists "archivos_proyecto_delete" on storage.objects;

create policy "bitacora_fotos_insert" on storage.objects for insert
  with check (bucket_id = 'bitacora-fotos' and public.is_field_staff());
create policy "bitacora_fotos_select" on storage.objects for select
  using (bucket_id = 'bitacora-fotos' and public.is_field_staff());
create policy "bitacora_fotos_delete" on storage.objects for delete
  using (bucket_id = 'bitacora-fotos' and public.is_staff());

create policy "archivos_proyecto_insert" on storage.objects for insert
  with check (bucket_id = 'archivos-proyecto' and public.is_field_staff());
create policy "archivos_proyecto_select" on storage.objects for select
  using (bucket_id = 'archivos-proyecto' and public.is_field_staff());
create policy "archivos_proyecto_delete" on storage.objects for delete
  using (bucket_id = 'archivos-proyecto' and public.is_staff());
