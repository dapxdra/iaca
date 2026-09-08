# IACA — guía para trabajar en este repo

Plataforma Next.js (App Router) + Supabase para una empresa de topografía en Costa Rica.
Ver [README.md](./README.md) para el stack y [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md)
para el alcance funcional.

## Diseño visual

Antes de tocar cualquier UI, leer [design-system/MASTER.md](./design-system/MASTER.md):
paleta de marca (con contraste WCAG ya verificado), tipografía (Libre Bodoni + Public
Sans), escala de tamaños (H1 64px / H2 40px / H3 28px / Body 18px / Small 14px) y qué
patrón de layout usa cada tipo de página. Generado con la skill `ui-ux-pro-max`
(`.claude/skills/ui-ux-pro-max/`) — consultar sus datasets CSV directamente para dudas de
estilo/tipografía/UX que no cubra el Master (no requieren Python).

## Arquitectura (SOA por capas)

```
Componentes (Server/Client) y Server Actions   ← UI, sin lógica de negocio
        ↓
src/services/*.service.ts                      ← lógica de negocio, un archivo por entidad
        ↓
src/lib/supabase/{client,server}.ts            ← acceso a datos (Supabase)
        ↓
Postgres + RLS (supabase/migrations/)          ← autorización real, no confiar solo en la app
```

Regla dura: **ningún componente ni Server Action llama `supabase.from(...)` directamente.**
Toda consulta pasa por una función en `src/services/`. Así la lógica de negocio es
reutilizable, testeable y no depende de dónde se renderiza (server o cliente).
Ejemplo de referencia: [src/services/clientes.service.ts](./src/services/clientes.service.ts).

Al agregar una entidad nueva (proyectos, bitácora, trámites, kpi): crear
`src/services/<entidad>.service.ts` con funciones tipadas (`listX`, `getX`, `createX`, ...)
siguiendo el mismo patrón.

## Parametrización

Todo texto visible al usuario (nombre de la app, títulos de página, textos de navegación,
copys de landing/login) vive en [src/config/site.ts](./src/config/site.ts). Los componentes
importan de ahí — nunca hardcodean strings de UI. Para renombrar la app, cambiar textos de
menú o agregar una sección al dashboard, se edita ese archivo únicamente; no hace falta tocar
componentes. Las rutas protegidas del middleware se derivan de `dashboardNav` en ese mismo
archivo, así que agregar una entrada ahí protege la ruta automáticamente.

## Reglas de código (aplican a todo el repo)

1. **SOA**: ver arquitectura arriba. UI → `services/` → `lib/supabase/` → Postgres/RLS.
2. **Simplicidad**: preferir la solución directa. No crear abstracciones para casos
   hipotéticos ni generalizar antes de tener un segundo caso de uso real.
3. **`data-cy` en todo el HTML**: cualquier elemento interactivo o relevante para pruebas
   (botones, links, inputs, forms, contenedores clave de una página) lleva un atributo
   `data-cy` en kebab-case, prefijado por feature (`login-submit`, `nav-proyectos`,
   `clientes-table`). Es el selector estable para tests end-to-end (Cypress); no depende de
   clases de estilo que puedan cambiar.
4. **Comentarios solo donde algo no es obvio**: explicar el *por qué* (una restricción de
   negocio, un workaround, una decisión de seguridad), nunca el *qué* — el código ya lo dice.
5. **Código eficiente**: seleccionar solo las columnas necesarias en las queries (`select(...)`
   explícito, nunca `select("*")` salvo que de verdad se usen todas), evitar renders o
   consultas redundantes.
6. **Seguridad primero**:
   - Validar toda entrada externa (formularios, params) con `zod` en el límite del sistema
     (Server Action / route handler), nunca confiar solo en validación del lado del cliente.
   - La `SUPABASE_SERVICE_ROLE_KEY` nunca se importa en código que pueda llegar al bundle del
     cliente — solo en Server Actions/route handlers marcados `"use server"`.
   - Mensajes de error genéricos hacia el usuario en flujos de auth (nunca revelar si un
     correo existe o no); el detalle real solo se registra en el servidor.
   - La autorización real vive en las políticas RLS de Postgres
     (`supabase/migrations/0001_init.sql`); el middleware y las validaciones de la app son una
     segunda capa de defensa, no la única.

## Proxy de sesión (antes "middleware")

`proxy.ts` (raíz) + [src/lib/supabase/proxy.ts](./src/lib/supabase/proxy.ts) refrescan la
sesión de Supabase en cada request y redirigen: sin sesión → `/login` si la ruta está en
`dashboardNav`; con sesión → la primera ruta del dashboard si se visita `/login`. Si las
variables de entorno de Supabase no están configuradas todavía (ver README paso 3), no se
bloquea la app — se deja pasar sin verificar sesión.

Nota: Next.js 16 deprecó el archivo `middleware.ts` y lo renombró a `proxy.ts` (misma
funcionalidad, cambia el nombre del archivo raíz y de la función exportada, que ahora se llama
`proxy` en vez de `middleware`). No recrear `middleware.ts` — no se ejecuta en esta versión.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
