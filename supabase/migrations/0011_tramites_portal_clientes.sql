-- ============================================================================
-- IACA — Trámites visibles para el cliente en su portal
-- ============================================================================
-- Qué hace esta migración:
--   1. `vw_tramites_cliente` — los trámites de los proyectos (y subproyectos)
--      del cliente que consulta, solo con las columnas que le corresponde ver:
--      entidad, tipo, expediente, estado y fechas, más el nombre del
--      subproyecto. Sin `notas` ni responsable (son operativos de IACA).
--
-- Por qué una vista y no una política sobre `tramites_gubernamentales`: RLS
-- filtra filas, no columnas; una política para el cliente le daría acceso a
-- `notas` por la API. La tabla sigue siendo solo staff (0005_...).
--
-- La vista corre con los permisos de su dueño (sin `security_invoker`) para
-- saltar la RLS staff-only de trámites y subproyectos; el filtro por
-- `current_user_cliente_id()` es lo que la restringe. Para staff, anon o un
-- perfil inactivo esa función devuelve null y la vista no devuelve filas.
-- ============================================================================

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
