# IACA

Plataforma web informativa + aplicación de gestión para una empresa de topografía en
Costa Rica (clientes, proyectos/subproyectos, bitácora de campo, datos topográficos
CR-SIRGAS, trámites gubernamentales y reportes KPI).

- 📄 Requerimientos completos: [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md)
- 💰 Stack técnico y estimación de costos: [`docs/PROPUESTA-TECNICA-Y-COSTOS.md`](./docs/PROPUESTA-TECNICA-Y-COSTOS.md)
- 🗄️ Esquema de base de datos: [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql)

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage +
PostGIS) · Vercel

## Guía para arrancar de inmediato

### 0. Requisitos previos

- Node.js 20+ y npm
- Una cuenta de [Supabase](https://supabase.com) (plan gratuito alcanza para empezar)
- Una cuenta de [Vercel](https://vercel.com)
- Un repositorio vacío en GitHub (lo conectamos en el paso 5)
- Una API key de [Google Maps](https://console.cloud.google.com/google/maps-apis) (Maps
  JavaScript API) — necesaria para el mapa de ubicación de proyectos, pero **no** bloquea
  poder arrancar a programar hoy mismo; se puede agregar después.

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto de Supabase

1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Copia la **Project URL** y la **anon public key** (Project Settings → API).
3. Aplica el esquema inicial de base de datos. Con la [CLI de Supabase](https://supabase.com/docs/guides/cli):

   ```bash
   npx supabase login
   npx supabase link --project-ref <tu-project-ref>
   npx supabase db push
   ```

   (Alternativa sin CLI: pega el contenido de `supabase/migrations/0001_init.sql` en el
   **SQL Editor** del dashboard de Supabase y ejecútalo.)

4. En **Storage**, crea dos buckets privados: `bitacora-fotos` y `archivos-proyecto`
   (para las fotos de campo y los CSV/DWG respectivamente).
5. Genera los tipos de TypeScript reales a partir de tu esquema (reemplaza el placeholder
   en `src/types/database.ts`):

   ```bash
   npx supabase gen types typescript --project-id <tu-project-ref> > src/types/database.ts
   ```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Completa `.env.local` con la URL y anon key de Supabase (paso 2) y, cuando la tengas, la
API key de Google Maps.

### 4. Levantar el proyecto en local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — verás el sitio informativo. El área
interna (con Auth ya conectada a Supabase) vive bajo las rutas del grupo `(dashboard)`
(`/proyectos`, `/clientes`, `/bitacora`, `/tramites`, `/kpi`) y `/login`.

### 5. Conectar con tu repositorio de GitHub

Ya tienes un repositorio vacío en GitHub — conéctalo así (reemplaza la URL por la de tu
repo):

```bash
git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
git branch -M main
git add -A
git commit -m "Scaffold inicial de IACA: Next.js + TS + Tailwind + Supabase"
git push -u origin main
```

> El proyecto ya viene con `git init` hecho y el primer commit del scaffold generado por
> `create-next-app`; el commit de arriba agrega todo lo que se construyó encima (esquema
> de Supabase, estructura de carpetas, documentación).

### 6. Desplegar en Vercel

1. En [vercel.com/new](https://vercel.com/new), importa el repositorio recién subido.
2. Agrega las mismas variables de entorno de `.env.local` en **Project Settings →
   Environment Variables**.
3. Deploy. Cada push a `main` (y cada PR) generará su propio despliegue automáticamente.

## Estructura del proyecto

```
proxy.ts                        → refresca sesión de Supabase y protege rutas del dashboard
                                   (reemplaza a middleware.ts, deprecado en Next.js 16)
src/
  config/
    site.ts                      → toda la configuración parametrizable: nombre de la app,
                                    textos, navegación, títulos de cada página del dashboard
  app/
    page.tsx                     → sitio informativo (público)
    (auth)/login/                → login (Server Action + validación con zod)
    (dashboard)/                 → área interna (requiere sesión, protegida por middleware)
      proyectos/
      cobros/
      clientes/
      bitacora/
      tramites/
      kpi/
  services/                      → capa de lógica de negocio (patrón SOA, ver CLAUDE.md)
    auth.service.ts               → login/logout
    clientes.service.ts           → ejemplo de referencia para servicios por entidad
    cobros.service.ts             → monto a cobrar, pagos y saldo pendiente por proyecto
  lib/
    supabase/
      client.ts                  → cliente de Supabase para componentes de navegador
      server.ts                  → cliente de Supabase para Server Components/Actions
      proxy.ts                   → lógica de refresco/redirección usada por proxy.ts (raíz)
  types/
    database.ts                   → tipos generados desde el esquema de Supabase
supabase/
  migrations/
    0001_init.sql              → esquema base: clientes, proyectos, subproyectos,
                                  puntos topográficos, archivos, bitácora, trámites,
                                  vistas de KPI y políticas RLS base
    0002_cobros.sql            → monto a cobrar, tabla de pagos, vista de saldo pendiente
docs/
  REQUIREMENTS.md               → documento de requerimientos completo
  PROPUESTA-TECNICA-Y-COSTOS.md → stack técnico y estimación de costos
```

Convenciones del proyecto (arquitectura SOA, parametrización, `data-cy`, seguridad, etc.):
ver [`CLAUDE.md`](./CLAUDE.md).

## Próximos pasos recomendados (en orden)

1. Revisar `docs/REQUIREMENTS.md` junto con el cliente, en especial la sección 12
   ("Supuestos y preguntas abiertas") — las respuestas pueden ajustar el alcance.
2. Crear el proyecto de Supabase y aplicar la migración inicial (pasos 2–3 arriba).
3. Construir el formulario de login con Supabase Auth y el middleware de sesión (la
   página `/login` ya está creada como placeholder).
4. Implementar el CRUD de **Clientes** (el módulo más simple, buen punto de partida).
5. Implementar **Proyectos/Subproyectos** con el flujo de estados
   Contacto→Campo→Cálculo→Dibujo→Entrega.
6. Implementar **Bitácora de campo** + carga de fotos a Supabase Storage.
7. Implementar la importación de CSV de MapIt hacia `puntos_topograficos`.
8. Implementar **Trámites gubernamentales** + la alerta de días sin revisión
   (`vw_tramites_sin_revision` ya está creada en la base de datos).
9. Implementar **Control de cobro**: definir monto a cobrar por proyecto y registrar pagos
   (`vw_cobros_proyecto` ya está creada; ver `src/services/cobros.service.ts`).
10. Implementar **Reportes KPI** usando las vistas `vw_kpi_proyecto` y `vw_kpi_zona`.
11. Integrar el mapa de Google Maps en la ficha de proyecto.
12. Pulir el sitio informativo público y desplegar a producción.

## Scripts disponibles

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run start    # servir el build de producción
npm run lint     # ESLint
```
