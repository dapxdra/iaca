-- ============================================================================
-- IACA — Esquema inicial de base de datos (Supabase / Postgres)
-- ============================================================================
-- Notas de dominio importantes:
--
-- 1. Coordenadas: este proyecto maneja DOS sistemas de coordenadas distintos
--    y NO deben confundirse:
--      a) Coordenadas topográficas (Este/Norte) en CRTM05 (CR-SIRGAS),
--         EPSG:5367 — son las que entrega el equipo de topografía / la app
--         MapIt / los archivos CSV de campo. Se guardan como NUMERIC, no
--         como geography, porque son coordenadas proyectadas en metros,
--         no lat/lng.
--      b) Ubicación general del proyecto en WGS84 (lat/lng, EPSG:4326) —
--         solo para mostrar el pin en Google Maps. Esta SÍ se guarda como
--         "geography(Point,4326)" vía la extensión PostGIS.
--    La conversión CRTM05 -> WGS84 (para ubicar el proyecto en el mapa) se
--    hace en la capa de aplicación (o con una función de PostGIS con la
--    proyección EPSG:5367 registrada), nunca se asume que son intercambiables.
--
-- 2. "dias_sin_revision" en tramites_gubernamentales se calcula en tiempo de
--    consulta (no se almacena) para que la alerta de "proyecto sin revisión
--    hace X días" siempre esté actualizada.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "postgis";

-- ----------------------------------------------------------------------------
-- Roles y perfiles
-- ----------------------------------------------------------------------------
create type user_role as enum ('admin', 'oficina', 'campo', 'cliente');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role user_role not null default 'campo',
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Clientes
-- ----------------------------------------------------------------------------
create type cliente_tipo as enum ('persona_fisica', 'persona_juridica');

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  tipo cliente_tipo not null default 'persona_fisica',
  nombre text not null,
  identificacion text,                 -- cédula física o jurídica
  telefono text,
  email text,
  direccion text,
  notas text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_clientes_nombre on public.clientes using gin (to_tsvector('spanish', nombre));

-- ----------------------------------------------------------------------------
-- Proyectos y subproyectos
-- ----------------------------------------------------------------------------
create type proyecto_estado as enum (
  'contacto', 'campo', 'calculo', 'dibujo', 'entrega', 'cerrado', 'cancelado'
);

create table public.proyectos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,          -- ej. IACA-2026-014
  nombre text not null,
  cliente_id uuid not null references public.clientes (id),
  tipo_servicio text,                    -- ej. "Levantamiento", "Amojonamiento", "Curvas de nivel"
  descripcion text,
  estado proyecto_estado not null default 'contacto',
  provincia text,
  canton text,
  distrito text,
  zona text,                             -- agrupación libre usada en reportes KPI por zona
  ubicacion geography(Point, 4326),       -- lat/lng para Google Maps (WGS84)
  fecha_inicio date,
  fecha_estimada_entrega date,
  fecha_entrega_real date,
  responsable_id uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_proyectos_cliente on public.proyectos (cliente_id);
create index idx_proyectos_estado on public.proyectos (estado);
create index idx_proyectos_zona on public.proyectos (zona);
create index idx_proyectos_codigo on public.proyectos (codigo);

create table public.subproyectos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  nombre text not null,
  descripcion text,
  estado proyecto_estado not null default 'contacto',
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_subproyectos_proyecto on public.subproyectos (proyecto_id);

-- ----------------------------------------------------------------------------
-- Puntos topográficos (coordenadas CR-SIRGAS / CRTM05, provenientes de
-- CSV de MapIt, GPS o digitación manual)
-- ----------------------------------------------------------------------------
create type punto_fuente as enum ('mapit_csv', 'gps', 'manual', 'postgresql_import');

create table public.puntos_topograficos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  subproyecto_id uuid references public.subproyectos (id) on delete set null,
  codigo_punto text not null,
  este numeric(12, 3) not null,          -- coordenada X en CRTM05 (metros)
  norte numeric(12, 3) not null,         -- coordenada Y en CRTM05 (metros)
  elevacion numeric(9, 3),
  descripcion text,
  fuente punto_fuente not null default 'manual',
  archivo_origen_id uuid,                -- referencia lógica a archivos_proyecto
  created_at timestamptz not null default now()
);
create index idx_puntos_proyecto on public.puntos_topograficos (proyecto_id);
create index idx_puntos_subproyecto on public.puntos_topograficos (subproyecto_id);

-- ----------------------------------------------------------------------------
-- Archivos del proyecto (CSV, DWG, PDF, etc. — el binario vive en
-- Supabase Storage, aquí solo se referencia)
-- ----------------------------------------------------------------------------
create type archivo_tipo as enum ('csv', 'dwg', 'pdf', 'imagen', 'otro');

create table public.archivos_proyecto (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  subproyecto_id uuid references public.subproyectos (id) on delete set null,
  tipo archivo_tipo not null,
  nombre_archivo text not null,
  storage_path text not null,            -- ruta dentro del bucket de Supabase Storage
  tamano_bytes bigint,
  subido_por uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index idx_archivos_proyecto on public.archivos_proyecto (proyecto_id);

alter table public.puntos_topograficos
  add constraint fk_puntos_archivo foreign key (archivo_origen_id)
  references public.archivos_proyecto (id) on delete set null;

-- ----------------------------------------------------------------------------
-- Bitácora de campo
-- ----------------------------------------------------------------------------
create table public.bitacora_campo (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  subproyecto_id uuid references public.subproyectos (id) on delete set null,
  trabajador_id uuid not null references public.profiles (id),
  fecha date not null default current_date,
  hora_inicio time,
  hora_fin time,
  actividad text not null,
  equipo_utilizado text,                 -- ej. "Estación total Leica", "GPS RTK"
  clima text,
  observaciones text,
  ubicacion geography(Point, 4326),       -- de dónde se registró la entrada (opcional)
  created_at timestamptz not null default now()
);
create index idx_bitacora_proyecto on public.bitacora_campo (proyecto_id);
create index idx_bitacora_trabajador on public.bitacora_campo (trabajador_id);
create index idx_bitacora_fecha on public.bitacora_campo (fecha);

create table public.bitacora_fotos (
  id uuid primary key default gen_random_uuid(),
  bitacora_id uuid not null references public.bitacora_campo (id) on delete cascade,
  storage_path text not null,
  descripcion text,
  created_at timestamptz not null default now()
);
create index idx_bitacora_fotos_bitacora on public.bitacora_fotos (bitacora_id);

-- ----------------------------------------------------------------------------
-- Trámites / envíos a entidades gubernamentales
-- ----------------------------------------------------------------------------
create type tramite_estado as enum (
  'pendiente', 'enviado', 'en_revision', 'observado', 'aprobado', 'rechazado'
);

create table public.tramites_gubernamentales (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos (id) on delete cascade,
  entidad text not null,                 -- ej. "Catastro Nacional", "Municipalidad de...", "SETENA", "INVU"
  tipo_tramite text not null,            -- ej. "Inscripción de plano", "Visado municipal"
  numero_expediente text,
  estado tramite_estado not null default 'pendiente',
  fecha_envio date,
  fecha_ultima_revision date,
  responsable_id uuid references public.profiles (id),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tramites_proyecto on public.tramites_gubernamentales (proyecto_id);
create index idx_tramites_estado on public.tramites_gubernamentales (estado);

-- Vista: días transcurridos desde el envío sin una revisión registrada,
-- usada para las alertas de "proyectos sin revisión hace X días".
create view public.vw_tramites_sin_revision as
select
  t.*,
  p.codigo as proyecto_codigo,
  p.nombre as proyecto_nombre,
  coalesce(
    (current_date - t.fecha_ultima_revision),
    (current_date - t.fecha_envio)
  ) as dias_sin_revision
from public.tramites_gubernamentales t
join public.proyectos p on p.id = t.proyecto_id
where t.estado in ('enviado', 'en_revision', 'observado');

-- ----------------------------------------------------------------------------
-- Vistas de apoyo para reportes KPI (por proyecto y por zona)
-- ----------------------------------------------------------------------------
create view public.vw_kpi_proyecto as
select
  p.id as proyecto_id,
  p.codigo,
  p.nombre,
  p.zona,
  p.estado,
  p.fecha_inicio,
  p.fecha_estimada_entrega,
  p.fecha_entrega_real,
  (select count(*) from public.subproyectos s where s.proyecto_id = p.id) as total_subproyectos,
  (select count(*) from public.bitacora_campo b where b.proyecto_id = p.id) as total_entradas_bitacora,
  (select count(*) from public.puntos_topograficos pt where pt.proyecto_id = p.id) as total_puntos,
  case
    when p.fecha_entrega_real is not null and p.fecha_estimada_entrega is not null
      then (p.fecha_entrega_real <= p.fecha_estimada_entrega)
    else null
  end as entregado_a_tiempo
from public.proyectos p;

create view public.vw_kpi_zona as
select
  zona,
  count(*) as total_proyectos,
  count(*) filter (where estado = 'cerrado') as proyectos_cerrados,
  count(*) filter (where estado not in ('cerrado', 'cancelado')) as proyectos_activos,
  avg(fecha_entrega_real - fecha_inicio) filter (where fecha_entrega_real is not null) as promedio_dias_ciclo
from public.proyectos
group by zona;

-- ----------------------------------------------------------------------------
-- Trigger genérico para updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_clientes_updated_at before update on public.clientes
  for each row execute function public.set_updated_at();
create trigger trg_proyectos_updated_at before update on public.proyectos
  for each row execute function public.set_updated_at();
create trigger trg_subproyectos_updated_at before update on public.subproyectos
  for each row execute function public.set_updated_at();
create trigger trg_tramites_updated_at before update on public.tramites_gubernamentales
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) — políticas base.
-- Ajustar según reglas de negocio finales (ej. un trabajador de campo solo
-- ve sus propios proyectos asignados, un cliente solo ve sus proyectos).
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.proyectos enable row level security;
alter table public.subproyectos enable row level security;
alter table public.puntos_topograficos enable row level security;
alter table public.archivos_proyecto enable row level security;
alter table public.bitacora_campo enable row level security;
alter table public.bitacora_fotos enable row level security;
alter table public.tramites_gubernamentales enable row level security;

-- Por defecto: cualquier usuario autenticado con perfil activo puede leer.
-- (placeholder — refinar por rol antes de producción)
create policy "authenticated_read_profiles" on public.profiles for select
  using (auth.role() = 'authenticated');
create policy "authenticated_read_clientes" on public.clientes for select
  using (auth.role() = 'authenticated');
create policy "authenticated_read_proyectos" on public.proyectos for select
  using (auth.role() = 'authenticated');
create policy "authenticated_read_subproyectos" on public.subproyectos for select
  using (auth.role() = 'authenticated');
create policy "authenticated_read_puntos" on public.puntos_topograficos for select
  using (auth.role() = 'authenticated');
create policy "authenticated_read_archivos" on public.archivos_proyecto for select
  using (auth.role() = 'authenticated');
create policy "authenticated_read_bitacora" on public.bitacora_campo for select
  using (auth.role() = 'authenticated');
create policy "authenticated_read_fotos" on public.bitacora_fotos for select
  using (auth.role() = 'authenticated');
create policy "authenticated_read_tramites" on public.tramites_gubernamentales for select
  using (auth.role() = 'authenticated');

-- Escritura: solo roles admin/oficina/campo (no cliente) por defecto.
create policy "staff_write_clientes" on public.clientes for all
  using (exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and pr.role in ('admin', 'oficina') and pr.active
  ));
create policy "staff_write_proyectos" on public.proyectos for all
  using (exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and pr.role in ('admin', 'oficina') and pr.active
  ));
create policy "campo_write_bitacora" on public.bitacora_campo for insert
  with check (exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and pr.role in ('admin', 'oficina', 'campo') and pr.active
  ));
