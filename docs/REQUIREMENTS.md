# IACA — Documento de Requerimientos

**Proyecto:** IACA — Plataforma web informativa y de gestión para servicios de topografía
**Ubicación:** Costa Rica
**Versión:** 0.1 (borrador inicial, basado en la información brindada por Dap — pendiente de validar con el cliente final)
**Fecha:** Septiembre 2026

---

## 1. Resumen ejecutivo

IACA es una plataforma con dos caras:

1. **Sitio informativo público** — presenta los servicios de topografía de la empresa (levantamientos, agrimensura, curvas de nivel, trámites, etc.) a potenciales clientes.
2. **Aplicación interna de gestión** — controla todo el ciclo de vida de un proyecto de topografía: desde el primer contacto con el cliente hasta la entrega final, pasando por campo, cálculo y dibujo, incluyendo la bitácora de los trabajadores de campo, los datos topográficos crudos (coordenadas, CSV, DWG), los trámites ante entidades gubernamentales, el control de cobro y los reportes de KPI.

El sistema se rige por el sistema de referencia geodésico oficial de Costa Rica, **CR-SIRGAS (CRTM05)**, y debe integrarse con las herramientas que el equipo ya usa en campo (GPS, estación total, y la app **MapIt**, que exporta datos en CSV o PostgreSQL).

## 2. Objetivos del proyecto

- Centralizar el control de clientes, proyectos y subproyectos en un solo lugar, reemplazando el manejo disperso actual (hojas de cálculo, carpetas, WhatsApp, etc.).
- Dar trazabilidad completa a cada proyecto a lo largo del flujo **Contacto → Campo → Cálculo → Dibujo → Entrega**.
- Reducir el riesgo de "proyectos olvidados" en trámites gubernamentales mediante alertas automáticas de tiempo sin revisión.
- Ofrecer visibilidad gerencial mediante reportes KPI por proyecto, zona y trabajador.
- Presentar una imagen profesional de la empresa hacia clientes potenciales a través del sitio informativo.

## 3. Usuarios y roles

| Rol | Descripción | Acceso típico |
|---|---|---|
| **Administrador** | Dueño/gerente de la empresa | Acceso total: clientes, proyectos, trámites, KPI, usuarios |
| **Oficina (cálculo/dibujo)** | Personal que procesa datos, calcula y dibuja planos | Proyectos, subproyectos, archivos, trámites, cobros |
| **Campo** | Topógrafos/cadeneros en sitio | Bitácora de campo, carga de fotos, consulta de proyectos asignados |
| **Cliente** *(opcional, fase futura)* | Cliente final | Portal de solo lectura con el estado de su(s) proyecto(s) |
| **Visitante público** | Cualquier persona | Solo el sitio informativo (sin login) |

> Nota: definir con el cliente si el rol "Cliente" (portal externo) entra en el alcance del MVP o queda para una fase posterior — impacta el cálculo de horas (ver `PROPUESTA-TECNICA-Y-COSTOS.md`).

## 4. Alcance funcional

### 4.1 Gestión de clientes

- CRUD de clientes: persona física o jurídica, identificación, teléfono, correo, dirección, notas.
- Historial de proyectos por cliente.
- Búsqueda de clientes por nombre, identificación o correo.

### 4.2 Gestión de proyectos y subproyectos

- Cada **proyecto** tiene: código único (ej. `IACA-2026-014`), nombre, cliente asociado, tipo de servicio, estado dentro del flujo de trabajo, ubicación (provincia/cantón/distrito y coordenadas para el mapa), zona (agrupación libre para KPI), fechas (inicio, entrega estimada, entrega real) y responsable.
- Un proyecto puede dividirse en **subproyectos** (ej. distintas fincas o etapas dentro de un mismo proyecto), cada uno con su propio estado y avance.
- Cambios de estado quedan registrados (para trazabilidad y para los KPI de tiempo de ciclo).
- Filtros de búsqueda de proyectos por: ID/código, cliente, zona, estado, rango de fechas y responsable.

### 4.3 Bitácora de campo

- Los trabajadores de campo registran entradas diarias por proyecto/subproyecto: fecha, hora de inicio/fin, actividad realizada, equipo utilizado, clima, observaciones.
- Carga de **fotos de campo** asociadas a cada entrada de bitácora (con descripción opcional).
- Idealmente, captura de la ubicación desde la que se registra la entrada (geolocalización del dispositivo).
- Diseño pensado para uso desde celular/tablet en campo — ver requisito no funcional de "uso en campo" (sección 8).

### 4.4 Datos topográficos: coordenadas, CSV y DWG

- Importación de datos desde **MapIt** en dos formas: archivo **CSV** o conexión/exportación desde **PostgreSQL**.
- Cada punto topográfico se guarda con su código, coordenadas **Este/Norte en CRTM05** (CR-SIRGAS), elevación y descripción, y queda vinculado al proyecto/subproyecto y al archivo de origen.
- Soporte para adjuntar y descargar archivos **DWG** por proyecto (el MVP contempla almacenamiento y descarga; visualización/edición de DWG en el navegador queda como mejora futura por su complejidad y costo — ver sección 11).
- Validación básica de formato al importar CSV (columnas esperadas, tipos de dato, puntos duplicados).

### 4.5 Trámites ante entidades gubernamentales

- Durante la fase de entrega, se envían documentos/planos a entidades (Catastro Nacional, municipalidades, otras según el trámite).
- El sistema registra por trámite: entidad, tipo de trámite, número de expediente (si aplica), **fecha de envío**, estado (pendiente, enviado, en revisión, observado, aprobado, rechazado) y fecha de la última revisión conocida.
- **Alertas automáticas**: el sistema calcula los días transcurridos desde el envío (o desde la última revisión) y notifica cuando un trámite supera un umbral configurable sin ser revisado (ej. 15 o 30 días), para que ningún proyecto se quede "dormido" en una entidad.

### 4.6 Reportes KPI

- Indicadores por **proyecto**: tiempo de ciclo (inicio → entrega), cumplimiento de fecha estimada, cantidad de entradas de bitácora, cantidad de puntos topográficos.
- Indicadores por **zona**: proyectos activos/cerrados, tiempo promedio de ciclo, volumen de trabajo.
- Indicadores por **trabajador** *(sujeto a validar con el cliente si aplica para el MVP)*: entradas de bitácora, proyectos atendidos.
- Visualización mediante tablas y gráficos (barras/líneas), con filtro por rango de fechas, zona y estado.

### 4.7 Mapa y ubicación

- Cada proyecto muestra su ubicación en un mapa de **Google Maps** (pin con la dirección/coordenadas del proyecto).
- Esta ubicación general (lat/lng, WGS84) es **distinta** de las coordenadas topográficas de precisión (CRTM05) usadas en los puntos de campo — ver nota técnica en sección 6.
- Vista de mapa general con todos los proyectos activos, filtrable por zona/estado.

### 4.8 Búsqueda y filtros

- Buscador global de proyectos por ID/código, nombre, cliente.
- Filtros combinables: cliente, zona, estado del flujo, rango de fechas, responsable.

### 4.9 Sitio informativo (público)

- Landing page con los servicios que ofrece la empresa, información de contacto y, opcionalmente, un formulario de contacto que genere automáticamente un cliente/proyecto en estado "Contacto" dentro del sistema interno.
- No requiere autenticación.

### 4.10 Control de cobro

- Cada proyecto tiene un **monto total a cobrar** (se define cuando el proyecto ya está cotizado; puede quedar sin definir mientras tanto).
- Se registran los **pagos/abonos** recibidos contra ese monto: fecha, monto, método de pago (efectivo, SINPE móvil, transferencia, cheque, otro) y notas opcionales.
- El sistema calcula el **saldo pendiente** por proyecto en tiempo real (monto a cobrar menos la suma de pagos registrados) — no se almacena, para que nunca quede desactualizado.
- Es un **registro interno** de control de cobro. No genera comprobantes fiscales (factura electrónica ante el Ministerio de Hacienda) ni cotizaciones formales — ver sección 11.
- Acceso de escritura (registrar pagos, definir monto a cobrar) solo para roles `admin` y `oficina`, igual que clientes y proyectos.

## 5. Flujo de trabajo y estados

El ciclo de vida de todo proyecto sigue estos estados, en orden:

```
Contacto → Campo → Cálculo → Dibujo → Entrega
```

- **Contacto**: se registra el cliente y los datos iniciales de la solicitud.
- **Campo**: se agenda y ejecuta el levantamiento; se llena la bitácora y se cargan los datos de campo (CSV/coordenadas/fotos).
- **Cálculo**: la oficina procesa los datos topográficos.
- **Dibujo**: se elabora el plano/entregable (posible archivo DWG).
- **Entrega**: se entrega al cliente y, cuando corresponde, se envían documentos a entidades gubernamentales (sección 4.5); el proyecto puede quedar en seguimiento hasta que el trámite se resuelva, y luego se cierra.

Cada cambio de estado debe quedar registrado con fecha y usuario responsable, para poder calcular los KPI de tiempo de ciclo por etapa.

## 6. Autenticación y roles

- Autenticación con Supabase Auth (correo/contraseña como mínimo; magic link opcional).
- Autorización basada en el rol del usuario (`admin`, `oficina`, `campo`, `cliente`), reforzada con Row Level Security (RLS) en la base de datos — no solo en el frontend.
- El personal de campo debe poder trabajar desde el celular; validar si se requiere algún tipo de funcionamiento offline básico (ver sección 8 y "preguntas abiertas" en sección 12).

## 7. Nota técnica: sistemas de coordenadas

Este es un punto crítico del proyecto y debe manejarse con cuidado desde el modelo de datos:

- **CRTM05 (CR-SIRGAS)** — sistema de referencia geodésico oficial de Costa Rica (Decreto Ejecutivo N.º 40962-MOPT-MJP-RNP; norma técnica NTIG-CR01 del SNIT). Es el sistema en el que se capturan y calculan las coordenadas **Este/Norte** de los puntos topográficos en campo (los que entregan el GPS, la estación total y MapIt). Se manejan como coordenadas proyectadas en metros, **no** como latitud/longitud.
- **WGS84 (lat/lng)** — el sistema que usa Google Maps para ubicar un pin. Se usa únicamente para mostrar la ubicación *general* del proyecto en el mapa, no para los cálculos topográficos de precisión.

El sistema debe dejar claro en la interfaz cuál es cuál, y nunca mezclar ambos como si fueran intercambiables. La conversión entre CRTM05 y WGS84 (cuando se necesite, por ejemplo para ubicar automáticamente un punto de campo en el mapa) se hace mediante una transformación de proyección conocida (EPSG:5367 → EPSG:4326), documentada en el código, no de forma aproximada.

## 8. Requisitos no funcionales

- **Idioma**: interfaz en español (Costa Rica).
- **Responsivo / uso en campo**: la bitácora y la carga de fotos deben funcionar bien en celular con conexión de datos variable; evaluar con el cliente si se necesita cola de sincronización para conexión intermitente (afecta el alcance del MVP).
- **Seguridad**: RLS en base de datos, control de acceso por rol, almacenamiento de archivos (fotos, CSV, DWG) en buckets privados de Supabase Storage con URLs firmadas.
- **Auditoría**: registro de quién crea/modifica clientes, proyectos y trámites, y cuándo.
- **Respaldo**: respaldos automáticos de base de datos (Supabase los ofrece por defecto en planes pagos).
- **Rendimiento**: listados de proyectos y bitácora paginados; importación de CSV de puntos debe soportar archivos de varios miles de filas sin bloquear la interfaz.
- **Disponibilidad**: hospedaje en Vercel + Supabase, con SLA estándar de dichos proveedores (suficiente para una operación de este tamaño; no se contempla infraestructura de alta disponibilidad dedicada en el MVP).

## 9. Integraciones externas

| Integración | Propósito | Notas |
|---|---|---|
| **MapIt (CSV / PostgreSQL)** | Origen de los datos de campo (coordenadas) | Confirmar con el cliente el formato exacto de columnas del CSV y si la exportación a PostgreSQL es a una base propia a la que haya que conectarse, o un dump que se importa |
| **Google Maps (Maps JavaScript API + Geocoding)** | Mostrar ubicación de proyectos | Requiere API key con facturación habilitada en Google Cloud (tiene capa gratuita mensual) |
| **Supabase Storage** | Almacenamiento de fotos de bitácora, CSV y DWG | Buckets privados, acceso vía URLs firmadas |
| **Entidades gubernamentales** (Catastro Nacional, municipalidades, etc.) | No hay integración por API — el registro es manual (fecha de envío, estado, expediente) | Costa Rica ya permite el registro electrónico de planos ante Catastro Nacional en ciertos trámites; si el cliente usa ese canal, se puede evaluar automatizar la consulta de estado en una fase futura |

## 10. Notificaciones y alertas

- Alerta cuando un trámite gubernamental supera el umbral de días sin revisión (sección 4.5) — mínimo dentro de la app (panel de alertas); correo electrónico como mejora deseable.
- Notificación opcional cuando un proyecto pasa X días sin actividad de bitácora en la fase de "Campo".
- (Fase futura) recordatorios de fechas estimadas de entrega próximas a vencer.

## 11. Fuera de alcance del MVP (posibles fases futuras)

- Visualización/edición de archivos DWG dentro del navegador (por ahora: subir/descargar únicamente).
- Portal de cliente externo con seguimiento de su propio proyecto.
- Sincronización offline completa para trabajo de campo sin señal.
- Integración automática (vía API) con los sistemas de Catastro Nacional u otras entidades.
- Firma digital de documentos dentro de la plataforma.
- Facturación electrónica (comprobantes fiscales ante el Ministerio de Hacienda) y cotizaciones formales integradas — el **control de cobro interno** (registro de monto a cobrar y pagos, sección 4.10) sí está dentro del MVP.

## 12. Supuestos y preguntas abiertas para validar con el cliente

1. ¿El formato del CSV que exporta MapIt es siempre el mismo? ¿Puedes compartir un archivo de ejemplo real?
2. Cuando MapIt "brinda PostgreSQL", ¿es una base de datos a la que ustedes tienen acceso directo, o un export/dump puntual?
3. ¿Qué tan grandes son típicamente los archivos DWG (para dimensionar almacenamiento y decidir si vale la pena un visor en fases futuras)?
4. ¿Cuántas personas usarán el sistema en cada rol (admin, oficina, campo)? Esto afecta el plan de Supabase/Vercel necesario.
5. ¿El "cliente" final alguna vez necesitará ver el estado de su proyecto directamente (portal), o toda la comunicación sigue siendo manual (llamada, WhatsApp, correo)?
6. ¿Qué entidades gubernamentales son las más frecuentes además de Catastro Nacional (municipalidades específicas, INVU, SETENA, otras)? Ayuda a definir la lista predefinida en el sistema.
7. ¿Existe ya una lista fija de "zonas" para los reportes KPI, o se definen libremente por proyecto?
8. ¿El personal de campo trabajará regularmente en zonas sin señal de datos?

---

*Este documento es un borrador de trabajo (v0.1) preparado a partir de la información inicial. Se recomienda revisarlo junto con el cliente antes de cotizar en firme y de iniciar el desarrollo — las respuestas a la sección 12 pueden mover el alcance y, por lo tanto, el costo (ver `docs/PROPUESTA-TECNICA-Y-COSTOS.md`).*
