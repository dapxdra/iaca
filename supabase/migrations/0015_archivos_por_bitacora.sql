-- ============================================================================
-- IACA — Archivos de proyecto vinculados a su entrada de bitácora
-- ============================================================================
-- Qué hace esta migración:
--   1. `archivos_proyecto.bitacora_id` — la entrada desde la que se subió el
--      archivo (CSV del GPS, etc.), para poder descargarlo desde la propia
--      bitácora y no solo desde la ficha del proyecto.
--      `on delete set null`: borrar la entrada no borra el archivo; sigue
--      siendo del proyecto (los datos de campo valen más que la nota).
--   2. Backfill: no hay forma confiable de saber de qué entrada vino un
--      archivo viejo, así que quedan en null (se ven solo en el proyecto).
-- ============================================================================

alter table public.archivos_proyecto
  add column if not exists bitacora_id uuid
    references public.bitacora_campo (id) on delete set null;

create index if not exists idx_archivos_bitacora
  on public.archivos_proyecto (bitacora_id);
