-- ============================================================================
-- IACA — Datos de prueba para DESARROLLO LOCAL
-- ============================================================================
-- Se carga automáticamente después de las migraciones con:
--     npx supabase start      (primera vez)
--     npx supabase db reset   (recrea la base local desde cero)
--
-- ⚠️ SOLO PARA LA BASE LOCAL. Nunca ejecutar en producción: crea usuarios con
-- contraseña conocida. Todos los datos son ficticios (nombres, cédulas,
-- teléfonos y correos inventados; dominio .test).
--
-- Usuarios (contraseña de todos: Iaca1234!)
--   admin@iaca.test     → admin
--   oficina@iaca.test   → oficina
--   campo@iaca.test     → campo
--   cliente@iaca.test   → cliente (portal, ligado a "Inversiones Monteverde")
--
-- Las fechas son relativas a current_date / now() para que las alertas de
-- "sin movimiento hace X días" siempre tengan casos que mostrar.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Usuarios de Auth
-- ----------------------------------------------------------------------------
-- El rol va en raw_app_meta_data: el trigger handle_new_user (migración 0009)
-- crea el perfil con ese rol y active = true. Sin rol en app_meta_data el
-- perfil quedaría inactivo (comportamiento de producción para auto-registro).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  u.email, extensions.crypt('Iaca1234!', extensions.gen_salt('bf')), now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', u.rol),
  jsonb_build_object('full_name', u.nombre),
  now(), now(), '', '', '', ''
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'admin@iaca.test',   'admin',   'Admin Dev'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'oficina@iaca.test', 'oficina', 'Olga Oficina'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'campo@iaca.test',   'campo',   'Carlos Campo'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'cliente@iaca.test', 'cliente', 'Cliente Portal')
) as u (id, email, rol, nombre);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@iaca.test';

-- ----------------------------------------------------------------------------
-- 2. Clientes
-- ----------------------------------------------------------------------------
insert into public.clientes (id, tipo, nombre, identificacion, telefono, email, direccion, notas, created_by) values
  ('c0000000-0000-0000-0000-000000000001', 'persona_juridica', 'Inversiones Monteverde S.A.', '3-101-000001', '8800-0001', 'contacto@monteverde.test', 'Santa Elena, Puntarenas', 'Cliente con acceso al portal', 'a0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'persona_fisica',   'María Fernández Rojas',       '1-0000-0002',  '8800-0002', 'maria.fernandez@correo.test', 'San Isidro de Heredia', null, 'a0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000003', 'persona_fisica',   'José Pablo Vargas Solís',     '2-0000-0003',  '8800-0003', 'jp.vargas@correo.test', 'Grecia, Alajuela', null, 'a0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000004', 'persona_juridica', 'Desarrollos del Pacífico Ltda.', '3-102-000004', '8800-0004', 'info@pacifico.test', 'Tamarindo, Guanacaste', 'Fraccionamiento en etapas', 'a0000000-0000-0000-0000-000000000001');

-- Ligar el usuario cliente a su cliente (lo usa el portal, migración 0009).
update public.profiles
set cliente_id = 'c0000000-0000-0000-0000-000000000001'
where id = 'a0000000-0000-0000-0000-000000000004';

-- ----------------------------------------------------------------------------
-- 3. Proyectos (uno por etapa relevante, en distintas zonas)
-- ----------------------------------------------------------------------------
insert into public.proyectos (
  id, codigo, nombre, cliente_id, tipo_servicio, descripcion, estado,
  provincia, canton, distrito, zona, ubicacion,
  fecha_inicio, fecha_estimada_entrega, fecha_entrega_real,
  responsable_id, created_by, monto_cobrar, estado_cambiado_at
) values
  ('b0000000-0000-0000-0000-000000000001', 'IACA-2026-001', 'Levantamiento finca Monteverde',
   'c0000000-0000-0000-0000-000000000001', 'Levantamiento', 'Levantamiento planimétrico y altimétrico de finca de 4 ha.', 'calculo',
   'Puntarenas', 'Monteverde', 'Monteverde', 'Pacífico Norte',
   st_setsrid(st_makepoint(-84.8255, 10.3010), 4326)::geography,
   current_date - 40, current_date + 10, null,
   'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 850000, now() - interval '20 days'),

  ('b0000000-0000-0000-0000-000000000002', 'IACA-2026-002', 'Plano catastrado lote Heredia',
   'c0000000-0000-0000-0000-000000000002', 'Plano catastrado', 'Plano para segregación de lote urbano.', 'entrega',
   'Heredia', 'Santo Domingo', 'San Miguel', 'GAM',
   st_setsrid(st_makepoint(-84.0790, 9.9800), 4326)::geography,
   current_date - 60, current_date - 5, null,
   'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 320000, now() - interval '3 days'),

  ('b0000000-0000-0000-0000-000000000003', 'IACA-2026-003', 'Amojonamiento Grecia',
   'c0000000-0000-0000-0000-000000000003', 'Amojonamiento', 'Replanteo y colocación de mojones.', 'cerrado',
   'Alajuela', 'Grecia', 'Grecia', 'Occidente',
   st_setsrid(st_makepoint(-84.3110, 10.0730), 4326)::geography,
   current_date - 120, current_date - 70, current_date - 75,
   'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 280000, now() - interval '75 days'),

  ('b0000000-0000-0000-0000-000000000004', 'IACA-2026-004', 'Fraccionamiento Tamarindo etapa 1',
   'c0000000-0000-0000-0000-000000000004', 'Fraccionamiento', 'Planos de 12 lotes, curvas de nivel.', 'georeferencia',
   'Guanacaste', 'Santa Cruz', 'Tempate', 'Pacífico Norte',
   st_setsrid(st_makepoint(-85.8370, 10.2990), 4326)::geography,
   current_date - 15, current_date + 45, null,
   'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 2400000, now() - interval '15 days'),

  ('b0000000-0000-0000-0000-000000000005', 'IACA-2026-005', 'Curvas de nivel lote Santa Elena',
   'c0000000-0000-0000-0000-000000000001', 'Curvas de nivel', 'Consulta inicial, pendiente de cotizar.', 'contacto',
   'Puntarenas', 'Monteverde', 'Monteverde', 'Pacífico Norte',
   null,
   null, null, null,
   null, 'a0000000-0000-0000-0000-000000000002', null, now() - interval '25 days'),

  ('b0000000-0000-0000-0000-000000000006', 'IACA-2026-006', 'Medición finca cancelada',
   'c0000000-0000-0000-0000-000000000002', 'Levantamiento', 'El cliente desistió.', 'cancelado',
   'Heredia', 'Barva', 'Barva', 'GAM',
   null,
   current_date - 90, null, null,
   null, 'a0000000-0000-0000-0000-000000000002', null, now() - interval '80 days');

-- ----------------------------------------------------------------------------
-- 4. Subproyectos
-- ----------------------------------------------------------------------------
insert into public.subproyectos (id, proyecto_id, nombre, descripcion, estado, orden, correcciones, estados_secundarios, estado_cambiado_at) values
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Lote A', null, 'preparacion', 1, 0, '{}', now() - interval '12 days'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Lote B', null, 'tramite',     2, 1, '{visado}', now() - interval '30 days'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Plano principal', null, 'carga_apt', 1, 0, '{}', now() - interval '4 days'),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 'Mojones', null, 'cerrado', 1, 0, '{}', now() - interval '75 days'),
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', 'Lotes 1-6',  null, 'tramite', 1, 0, '{}', now() - interval '10 days'),
  ('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000004', 'Lotes 7-12', null, 'minutas', 2, 2, '{mantenimiento}', now() - interval '18 days');

-- ----------------------------------------------------------------------------
-- 5. Trámites gubernamentales
-- ----------------------------------------------------------------------------
insert into public.tramites_gubernamentales (
  proyecto_id, subproyecto_id, entidad, tipo_tramite, numero_expediente, estado,
  fecha_envio, fecha_ultima_revision, responsable_id, notas, estado_cambiado_at
) values
  ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'CFIA', 'plano_catastrado', 'CFIA-0001', 'sellado_cfia',
   current_date - 30, current_date - 25, 'a0000000-0000-0000-0000-000000000002', 'Sin respuesta desde hace semanas (debe disparar alerta).', now() - interval '25 days'),
  ('b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'Registro Nacional — Catastro', 'plano_catastrado', 'RN-2026-0002', 'calificacion_rn',
   current_date - 8, current_date - 2, 'a0000000-0000-0000-0000-000000000002', null, now() - interval '2 days'),
  ('b0000000-0000-0000-0000-000000000002', null, 'Municipalidad de Santo Domingo', 'alineamiento', null, 'pendiente',
   null, null, 'a0000000-0000-0000-0000-000000000002', null, now() - interval '6 days'),
  ('b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 'Registro Nacional — Catastro', 'plano_catastrado', 'RN-2026-0003', 'publico_inscrito',
   current_date - 100, current_date - 76, 'a0000000-0000-0000-0000-000000000002', null, now() - interval '76 days'),
  ('b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', 'Registro Nacional — Catastro', 'plano_catastrado', 'RN-2026-0004', 'publico_defectuoso',
   current_date - 20, current_date - 14, 'a0000000-0000-0000-0000-000000000001', 'Defecto en colindancias, corregir y reingresar.', now() - interval '14 days');

-- ----------------------------------------------------------------------------
-- 6. Bitácora de campo y puntos topográficos (CRTM05, metros)
-- ----------------------------------------------------------------------------
insert into public.bitacora_campo (proyecto_id, subproyecto_id, trabajador_id, fecha, hora_inicio, hora_fin, actividad, equipo_utilizado, clima, observaciones) values
  ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', current_date - 35, '07:00', '15:30', 'Levantamiento de linderos y detalles', 'GPS RTK', 'Nublado', 'Neblina por la tarde.'),
  ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', current_date - 34, '07:30', '12:00', 'Puntos de control y curvas', 'Estación total Leica', 'Soleado', null),
  ('b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', current_date - 5,  '06:30', '14:00', 'Georreferenciación de vértices', 'GPS RTK', 'Soleado', 'Acceso por camino de lastre.'),
  ('b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', current_date - 110, '08:00', '13:00', 'Colocación de mojones', 'Estación total Leica', 'Lluvioso', null);

insert into public.puntos_topograficos (proyecto_id, subproyecto_id, codigo_punto, este, norte, elevacion, descripcion, fuente) values
  ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'P1', 448512.312, 1139820.455, 1402.118, 'Mojón esquina NE', 'gps'),
  ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'P2', 448590.104, 1139788.210, 1398.502, 'Lindero', 'gps'),
  ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'P3', 448602.877, 1139701.634, 1391.045, 'Mojón esquina SE', 'mapit_csv'),
  ('b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', 'V1', 346120.500, 1138950.250, 12.340, 'Vértice lote 1', 'gps'),
  ('b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000005', 'V2', 346188.020, 1138912.775, 13.105, 'Vértice lote 2', 'gps');

-- ----------------------------------------------------------------------------
-- 7. Pagos, eventos y mensajes de contacto
-- ----------------------------------------------------------------------------
insert into public.pagos (proyecto_id, monto, fecha_pago, metodo, notas, registrado_por) values
  ('b0000000-0000-0000-0000-000000000001', 425000, current_date - 40, 'transferencia', 'Adelanto 50 %', 'a0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000002', 160000, current_date - 60, 'sinpe_movil',   'Adelanto', 'a0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000003', 280000, current_date - 75, 'efectivo',      'Pago total', 'a0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000004', 1200000, current_date - 15, 'transferencia', 'Adelanto etapa 1', 'a0000000-0000-0000-0000-000000000001');

insert into public.proyecto_eventos (proyecto_id, fecha, descripcion, created_by) values
  ('b0000000-0000-0000-0000-000000000001', current_date - 35, 'Inicio de trabajo de campo', 'a0000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000002', current_date - 8,  'Plano ingresado a Catastro', 'a0000000-0000-0000-0000-000000000002'),
  ('b0000000-0000-0000-0000-000000000004', current_date - 14, 'Catastro devuelve plano con defectos', 'a0000000-0000-0000-0000-000000000001');

insert into public.contacto_mensajes (nombre, email, telefono, servicio, ubicacion, mensaje, estado) values
  ('Ana Quesada', 'ana.quesada@correo.test', '8800-0010', 'Plano catastrado', 'Cartago', 'Hola, necesito un plano catastrado para un lote de 300 m². ¿Cuánto cuesta?', 'nuevo'),
  ('Luis Mora',   'luis.mora@correo.test',   null,        'Levantamiento',    'San Carlos', 'Quisiera cotizar un levantamiento de una finca de 10 hectáreas.', 'leido');
