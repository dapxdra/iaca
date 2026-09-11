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

## Estado actual (MVP)

Implementado y probado contra la base de datos real:

| Módulo | Estado |
|---|---|
| Login + sesión (Supabase Auth, proxy de rutas) | ✅ |
| Perfil automático al registrarse + 4 roles con pantallas propias | ✅ |
| **Clientes** — CRUD + búsqueda (admin/oficina) | ✅ |
| **Proyectos** — CRUD, filtros, código autogenerado, ficha de detalle (admin/oficina) | ✅ |
| Flujo de estados Contacto→Campo→Cálculo→Dibujo→Entrega (+ transiciones válidas) | ✅ |
| **Subproyectos** — alta/baja desde la ficha del proyecto | ✅ |
| **Bitácora de campo** — alta/listado + adjuntar **fotos y CSV** (rol `campo`, ve todo, edita lo suyo) | ✅ |
| **Trámites** — CRUD + panel de alertas "sin revisión hace N días" (admin/oficina) | ✅ |
| **Cobros** — definir monto, registrar/eliminar pagos, saldo automático (admin/oficina) | ✅ |
| **Reportes KPI** — tarjetas, gráficos por zona, tablas (admin/oficina) | ✅ |
| **Mis proyectos** — portal de solo lectura para el rol `cliente` | ✅ |
| Sitio informativo público | ✅ (del scaffold) |

### Roles y qué ve cada uno

Se define una sola vez en [`src/config/site.ts`](./src/config/site.ts) (`navKeysByRole`) y se
aplica en 3 capas — el proxy redirige por rol, cada página vuelve a exigirlo
(`requireRole` en `src/lib/auth.ts`), y por último RLS en Postgres es la autorización real
(`supabase/migrations/0005_roles_access_and_storage.sql`):

| Rol | Pantallas | Puede escribir |
|---|---|---|
| `admin` / `oficina` | Proyectos, Cobros, Clientes, Bitácora, Trámites, KPI | Todo |
| `campo` | Solo Bitácora de campo (ve todos los proyectos para elegir en cuál registra) | Sus propias entradas de bitácora (+ adjuntar fotos/CSV) |
| `cliente` | Solo "Mis proyectos" (sus propios proyectos, vía `profiles.cliente_id`) | Nada — de solo lectura |

Escribir la URL de una pantalla ajena a mano no sirve: el proxy redirige, y aunque no
redirigiera, RLS no devuelve las filas de otro rol.

Pendiente (siguiente fase — ver `docs/REQUIREMENTS.md` §11):

- Importación de **CSV de MapIt** → parseo real a `puntos_topograficos` (hoy el CSV se sube
  y se guarda tal cual en Storage, sin parsear — el formato de columnas está sin confirmar
  con el cliente, ver REQUIREMENTS §12).
- **Google Maps** en la ficha de proyecto (`ubicacion geography` ya está en el esquema).
- Subida/descarga de **DWG/PDF** (mismo mecanismo que el CSV, falta la UI).
- Pantalla de **gestión de usuarios** (hoy se administran desde el panel de Supabase Auth).
- Notificaciones por correo.

### Usuarios de prueba

Uno por rol, para probar de inmediato (borralos desde Supabase → Authentication → Users
cuando ya no los necesites, o cambiales la contraseña):

```
admin@iaca.test    /  IacaAdmin!2026      (admin)
oficina@iaca.test  /  IacaOficina!2026    (oficina)
campo@iaca.test    /  IacaCampo!2026      (campo)
cliente@iaca.test  /  IacaCliente!2026    (cliente — vinculado a "Constructora Demo S.A.")
```

## Estructura del proyecto

```
proxy.ts                         → refresca sesión + control de acceso por rol en el dashboard
src/
  config/site.ts                 → config parametrizable + `navKeysByRole` (qué ve cada rol,
                                   única fuente de verdad — proxy, sidebar y páginas lo leen)
  lib/
    auth.ts                      → getSessionProfile / requireProfile / requireRole / requireStaff
    action.ts                    → makeFormAction: fábrica de Server Actions (guard staff/field/auth)
    form.ts                      → FormState + parseForm (validación zod → errores por campo)
    format.ts                    → formato de colones y fechas (es-CR)
    proyecto-flujo.ts            → flujo de estados (puro, compartible con el cliente)
    uploads.ts                   → límites de adjuntos (puro, compartible con el cliente)
    supabase/{client,server,proxy}.ts
  services/                      → capa de negocio (SOA): un archivo por entidad
    auth · clientes · proyectos · bitacora · tramites · cobros · kpi · profiles · archivos
    storage.service.ts           → subida a Storage (fotos/CSV) + URLs firmadas en lote
  components/ui/                 → primitivas del design system (button, field, file-input,
                                   table, dialog, badge, section, action-form, delete-form,
                                   toast, stat-card, empty-state, skeleton)
  app/
    page.tsx                     → sitio público
    (auth)/login/                → redirige a la home de CADA rol, no a una fija
    (dashboard)/
      layout.tsx + _components/sidebar.tsx → nav filtrado por rol (`dashboardNavForRole`)
      clientes/ · proyectos/[id]/ · tramites/ · cobros/[id]/ · kpi/  (solo admin/oficina)
      bitacora/                  → admin/oficina/campo; sube fotos y CSV a Storage
      mis-proyectos/[id]/        → solo `cliente`, de solo lectura
        page.tsx + actions.ts ("use server") + *-dialog.tsx ("use client")
  types/database.ts              → tipos generados desde Supabase (reales)
supabase/migrations/
  0001_init.sql                  → esquema base + vistas KPI + RLS placeholder
  0002_cobros.sql                → monto a cobrar, pagos, vw_cobros_proyecto
  0003_security_hardening.sql    → hallazgos de Supabase Advisors
  0004_rls_and_profile_bootstrap.sql → trigger de perfil, helpers de rol, RLS definitiva,
                                       triggers de sellado de autoría (created_by, etc.)
  0005_roles_access_and_storage.sql → profiles.cliente_id, RLS por los 4 roles (cliente ve
                                       solo lo suyo; campo sin clientes/trámites/pagos),
                                       buckets privados `bitacora-fotos`/`archivos-proyecto`
```

Convenciones (arquitectura SOA, parametrización, `data-cy`, seguridad): ver [`CLAUDE.md`](./CLAUDE.md).

> Nota: las migraciones `0001`–`0003` se aplicaron en su momento por el SQL Editor, así que
> `supabase migration list` solo muestra `0004` en adelante. Si adoptás la CLI de Supabase,
> marcá las anteriores como aplicadas con `supabase migration repair`.

## Scripts disponibles

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run start    # servir el build de producción
npm run lint     # ESLint
```
