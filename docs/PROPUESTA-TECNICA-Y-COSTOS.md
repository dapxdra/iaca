# IACA — Stack Tecnológico y Estimación de Costos

Este documento complementa `REQUIREMENTS.md` con la recomendación técnica y una idea de
cuánto cobrar por el proyecto. Los números de la sección de costos son una **estimación
de referencia**, no una cotización cerrada — deben ajustarse una vez se resuelvan las
preguntas abiertas del documento de requerimientos (sección 12).

## 1. Stack tecnológico recomendado

Tu stack de preferencia (React, TypeScript, Tailwind, Supabase, Vercel, Git, Node.js) es
una muy buena elección para este proyecto: es 100% TypeScript de punta a punta (frontend
y backend), lo cual importa para un equipo de un solo desarrollador — un lenguaje, un
repositorio, menos piezas que mantener.

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | **Next.js (App Router)** sobre React + TypeScript | Une el sitio informativo (con buen SEO/SSR) y la app interna en un solo proyecto; Server Actions cubren la necesidad de "backend" sin un servicio aparte; despliegue nativo en Vercel |
| Estilos | **Tailwind CSS** | Ya lo tienes como preferencia; rápido para construir las pantallas de gestión (tablas, formularios, dashboards) |
| Base de datos + backend | **Supabase (Postgres)** | Auth, Row Level Security por rol, Storage para fotos/CSV/DWG, y **extensión PostGIS** habilitada para el manejo de ubicación en el mapa — todo en un solo proveedor |
| Hosting | **Vercel** | Despliegue automático por rama/PR, ideal para Next.js |
| Control de versiones | **Git / GitHub** | — |
| Runtime | **Node.js** | Usado por Next.js (Server Actions, Route Handlers) y para scripts puntuales (ej. procesos de importación masiva) |

### Piezas adicionales necesarias (no mencionadas en tu lista, pero requeridas por los requerimientos)

| Necesidad | Recomendación |
|---|---|
| Formularios + validación (clientes, proyectos, bitácora) | `react-hook-form` + `zod` |
| Importar CSV de MapIt | `papaparse` |
| Mapa de ubicación de proyectos | Google Maps JavaScript API (`@googlemaps/js-api-loader`) — requiere API key con facturación en Google Cloud (tiene cuota gratuita mensual) |
| Coordenadas CRTM05 ↔ WGS84 | `proj4` (soporta definir la proyección EPSG:5367 de Costa Rica) |
| Gráficos de KPI | `recharts` |
| Íconos | `lucide-react` |
| Pruebas | `Vitest` (coherente con lo que ya usas en FIGA) |
| Archivos DWG | MVP: solo almacenar y descargar el binario original desde Supabase Storage (no requiere librería). Visor en el navegador queda para una fase futura — ver nota de costo abajo |

Este es exactamente el stack que ya dejé instalado en el repositorio inicializado (ver
`README.md` del proyecto).

## 2. Alternativas consideradas y por qué no

- **Backend separado en .NET / Node+Express**: tiene sentido si ya tuvieras esa
  infraestructura o un equipo de backend dedicado. Para un proyecto de este tamaño,
  desarrollado por una sola persona, Supabase + Server Actions de Next.js cubre auth,
  base de datos, storage y lógica de servidor con mucho menos código de "plomería" que
  mantener.
- **Firebase (Firestore) en vez de Supabase**: Firestore es NoSQL, y este proyecto tiene
  relaciones fuertes (cliente → proyecto → subproyecto → puntos/bitácora/trámites) que
  encajan mucho mejor en un modelo relacional con Postgres. Supabase además da SQL real,
  RLS y PostGIS, que Firestore no ofrece de forma nativa.
- **Visor DWG en el navegador desde el inicio**: existen librerías (ej. visores basados en
  motores CAD) pero son costosas en tiempo de integración y, en algunos casos, en
  licenciamiento. Se recomienda dejarlo fuera del MVP y resolverlo con "subir/descargar"
  el archivo original; se puede evaluar en una fase 2 si el cliente lo prioriza.

## 3. Estimación de horas por módulo (MVP)

Basado en el alcance descrito en `REQUIREMENTS.md`, **sin** portal de cliente externo,
**sin** visor DWG en navegador y **sin** sincronización offline completa (esos quedan
como fase futura, presupuesto aparte):

| Módulo | Horas estimadas |
|---|---|
| Planeación, UX y modelo de datos | 30 – 40 |
| Infraestructura base (Auth, roles, RLS, layout, despliegue) | 30 – 40 |
| Clientes | 20 – 25 |
| Proyectos y subproyectos (incl. flujo de estados) | 45 – 60 |
| Bitácora de campo + carga de fotos | 45 – 60 |
| Importación CSV/coordenadas de MapIt + manejo de archivos DWG (subir/descargar) | 40 – 55 |
| Trámites gubernamentales + alertas de tiempo sin revisión | 30 – 40 |
| Reportes KPI (por proyecto y por zona) | 35 – 45 |
| Mapa (Google Maps) + filtros de búsqueda | 30 – 40 |
| Sitio informativo público | 20 – 25 |
| QA, despliegue, documentación y capacitación al equipo | 25 – 35 |
| **Total estimado** | **≈ 350 – 465 horas** |

## 4. Idea de cuánto cobrar

Según referencias de mercado local, una tarifa de desarrollador full-stack de nivel medio
en Costa Rica ronda **₡4,500 – ₡7,500 por hora** (~US$9–15), y de nivel senior/arquitecto
**₡7,500 – ₡12,000 por hora** (~US$15–24), usando un tipo de cambio de referencia de
≈₡500/US$1 ([fuente de tarifas](https://www.dostecnologiaynegocios.com/2026/03/tarifas-de-profesionales-en-tecnologias.html)).

Este proyecto, sin embargo, no es un sitio web genérico: exige conocimiento específico de
geodesia (CR-SIRGAS/CRTM05), manejo de archivos técnicos (CSV topográfico, DWG), un flujo
de trabajo con reglas de negocio reales, y cumplimiento con trámites gubernamentales. Ese
nivel de especialización normalmente justifica cobrar en la parte alta del rango de
mercado local, o incluso por encima, en vez de una tarifa de "página web informativa".

**Recomendación:** cotizar en un rango de **US$18 – US$25 por hora** (≈₡9,000 – ₡12,500),
o bien como **precio fijo por fases** (recomendado, para que el cliente tenga
previsibilidad y tú no absorbas el riesgo de horas extra por cambios de alcance menores):

| Escenario | Horas | Precio estimado (USD) | Precio estimado (CRC, ref. ₡500/US$) |
|---|---|---|---|
| Piso (menor complejidad real) | 350 h × $18 | **≈ $6,300** | ≈ ₡3,150,000 |
| Techo (mayor complejidad real) | 465 h × $25 | **≈ $11,625** | ≈ ₡5,812,500 |

**Rango sugerido para cotizar al cliente: US$6,500 – US$11,500** (ajustar según lo que
se aclare en la sección 12 de `REQUIREMENTS.md` — por ejemplo, si el cliente pide portal
externo o visor DWG, eso se cotiza aparte, no se regala dentro de este rango).

### Estructura de pago sugerida (por hitos)

1. **30% al iniciar** — firma de contrato y arranque (planeación + infraestructura base).
2. **40% a mitad de camino** — al completar los módulos de campo/bitácora/datos
   topográficos y quedar en construcción cálculo/dibujo/trámites.
3. **30% a la entrega** — sistema desplegado, capacitación al equipo y documentación.

### Después del lanzamiento

Es buena práctica ofrecer un **retainer de mantenimiento** (soporte, corrección de
errores, ajustes menores) por separado del desarrollo inicial — por ejemplo, un bloque de
horas mensual (5–10 h/mes) o una tarifa fija mensual, en vez de dejarlo implícito dentro
del precio del proyecto.

> Importante: esto es una guía de referencia, no asesoría financiera. El cliente final,
> el volumen real de datos, y qué tan urgente sea el proyecto también deberían influir en
> el precio final que definas.

---

*Ver también: [`REQUIREMENTS.md`](./REQUIREMENTS.md) y el `README.md` en la raíz del
proyecto para la guía de arranque técnico.*
