-- ============================================================================
-- IACA — Mensajes del formulario público de contacto
-- ============================================================================
-- Qué hace esta migración:
--   1. `contacto_mensajes` — bandeja de las solicitudes que llegan por el
--      formulario del sitio público (src/components/contact-form.tsx).
--   2. RLS deliberadamente SIN política de insert: nadie inserta desde el
--      cliente, ni anon ni un usuario autenticado. El único camino es la
--      Server Action, que usa la service role key (server-only) y por eso
--      pasa por encima de RLS.
--
--      El motivo es el anti-spam: si `anon` pudiera insertar, un bot podría
--      llamar la API REST de Supabase directamente y saltarse el honeypot, la
--      validación y el límite por IP que aplica la Server Action. Sin política
--      de insert, la única puerta es la que sí valida.
--
--   3. Lectura y gestión: solo admin/oficina (`is_staff()`), igual que el
--      resto de la bandeja operativa. Campo y cliente no la ven.
--
-- Privacidad: no se guarda la IP en claro. Se guarda `ip_hash`, un SHA-256 de
-- la IP con una sal del servidor, que sirve para contar envíos del mismo
-- origen pero no permite reconstruir la dirección. Está declarado así en la
-- política de privacidad del sitio (src/config/site.ts → privacyPolicy).
-- ============================================================================

create type contacto_estado as enum ('nuevo', 'leido', 'respondido', 'spam');

create table public.contacto_mensajes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  telefono text,
  -- Coincide con `homeContent.services[].key` en src/config/site.ts. Se guarda
  -- como texto y no como enum porque el catálogo de servicios del sitio es
  -- contenido editable, no un estado del dominio.
  servicio text,
  ubicacion text,
  mensaje text not null,
  estado contacto_estado not null default 'nuevo',
  -- SHA-256 de (IP + sal del servidor). Nunca la IP en claro.
  ip_hash text,
  user_agent text,
  -- Notas internas de quien atiende la solicitud.
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Los mismos límites que valida zod en el servicio. Duplicarlos acá es
  -- intencional: la base es la última línea de defensa si alguna vez se
  -- inserta desde otro camino (un script, una importación).
  constraint chk_contacto_nombre_len check (char_length(nombre) between 2 and 120),
  constraint chk_contacto_email_len check (char_length(email) between 5 and 200),
  constraint chk_contacto_mensaje_len check (char_length(mensaje) between 10 and 4000),
  constraint chk_contacto_email_formato check (email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$')
);

-- La consulta caliente es "mensajes nuevos primero".
create index idx_contacto_mensajes_created_at
  on public.contacto_mensajes (created_at desc);

-- Índice del límite por IP: la Server Action cuenta los envíos del mismo
-- `ip_hash` en la última hora antes de aceptar uno nuevo.
create index idx_contacto_mensajes_ip_hash_created
  on public.contacto_mensajes (ip_hash, created_at desc)
  where ip_hash is not null;

create trigger trg_contacto_mensajes_updated_at before update on public.contacto_mensajes
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.contacto_mensajes enable row level security;

-- Sin política de insert a propósito (ver cabecera). La service role key de la
-- Server Action pasa por encima de RLS; cualquier otro origen queda bloqueado.

create policy "contacto_mensajes_select" on public.contacto_mensajes for select
  using (public.is_staff());

create policy "contacto_mensajes_update" on public.contacto_mensajes for update
  using (public.is_staff()) with check (public.is_staff());

create policy "contacto_mensajes_delete" on public.contacto_mensajes for delete
  using (public.is_staff());
