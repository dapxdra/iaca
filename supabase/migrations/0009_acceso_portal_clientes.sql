-- ============================================================================
-- IACA — Acceso de clientes al portal
-- ============================================================================
-- Qué hace esta migración:
--   1. Corrige `handle_new_user()`: el rol se leía de `raw_user_meta_data`, que
--      escribe quien se registra (`signUp({ options: { data: { role } } })`).
--      Con el registro público habilitado, cualquiera podía crearse un perfil
--      admin. Ahora el rol sale de `raw_app_meta_data`, que solo escribe el
--      servidor con la service role; sin rol ahí, el perfil nace INACTIVO
--      (RLS y el proxy lo tratan como sin acceso) hasta que un admin lo active.
--   2. `user_id_by_email()` — para vincular una ficha de cliente con un usuario
--      que ya existe. Solo la puede ejecutar la service role (desde
--      src/services/portal-clientes.service.ts): expone si un correo existe.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Alta de perfil sin confiar en datos del usuario
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := (new.raw_app_meta_data ->> 'role')::public.user_role;
begin
  insert into public.profiles (id, full_name, role, active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    coalesce(v_role, 'campo'),
    v_role is not null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Buscar usuario por correo (solo service role)
-- ----------------------------------------------------------------------------
create or replace function public.user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1
$$;

revoke execute on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
