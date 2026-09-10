-- ============================================================================
-- IACA — Endurecimiento de seguridad (hallazgos de Supabase Advisors)
-- ============================================================================

-- Función con search_path mutable: sin esto, el planificador resuelve
-- nombres de objetos sin calificar según el search_path de quien ejecuta la
-- función, lo que en teoría permite "secuestrar" la función con un objeto
-- malicioso del mismo nombre en otro esquema. La función no referencia
-- ningún objeto sin calificar (solo `new.updated_at` y `now()`, que vive en
-- pg_catalog y siempre es resoluble), así que fijar search_path a vacío es
-- seguro y no cambia el comportamiento.
alter function public.set_updated_at() set search_path = '';

-- NOTA — spatial_ref_sys (catálogo de sistemas de referencia de PostGIS):
-- Supabase Advisors marca esta tabla por no tener RLS habilitado. Se intentó
-- `alter table public.spatial_ref_sys enable row level security;` y falló
-- con "must be owner of table spatial_ref_sys" — la tabla la crea la
-- extensión PostGIS y ni la API de migraciones ni el rol admin de Supabase
-- tienen ownership sobre ella (limitación de Supabase, no de este proyecto).
-- Se acepta como riesgo bajo: son definiciones EPSG públicas (8500 filas
-- idénticas en cualquier instalación de PostGIS del mundo), sin datos de
-- clientes/proyectos. Si en el futuro se necesita cerrarlo del todo, la única
-- vía documentada por Supabase es mover la extensión a un esquema propio
-- (`alter extension postgis set schema extensions;`) y ocultar ese esquema
-- de la API expuesta — es un cambio más disruptivo, no se hizo aquí.
