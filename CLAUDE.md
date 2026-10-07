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

**Logo**: [src/components/brand-logo.tsx](./src/components/brand-logo.tsx) — SVG en línea con
`currentColor`, así toma el color del texto (navy sobre papel, papel sobre tinta y en modo
oscuro). Siempre junto al nombre en texto; no usar un `<img>` del logo. Los iconos
(`favicon.ico`, `apple-icon.png`, `public/icon*.png`) se generaron desde `LOGO_PATH`.

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
componentes. Las rutas protegidas del proxy se derivan de `dashboardNav` en ese mismo
archivo, así que agregar una entrada ahí protege la ruta automáticamente.

**Roles**: qué `key` de `dashboardNav` ve cada rol (`admin`/`oficina`/`campo`/`cliente`) se
define en `navKeysByRole`, también en `site.ts` — es la única fuente de verdad. El proxy la
usa para redirigir si un rol pide una ruta ajena, la sidebar para renderizar solo lo suyo, y
`requireRole()` (`src/lib/auth.ts`) para la misma validación dentro de cada página. Agregar
una pantalla nueva a un rol es una línea en `navKeysByRole`; la autorización real de los
datos sigue viviendo en RLS (`supabase/migrations/0005_...`), esto es solo de qué se entera
la UI.

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
     (`supabase/migrations/0005_roles_access_and_storage.sql`); el proxy y las validaciones
     de la app son una segunda capa de defensa, no la única — cada rol tiene su propia
     política de lectura/escritura por tabla (ver esa migración para el detalle completo).
   - Los buckets de Storage (`bitacora-fotos`, `archivos-proyecto`) son privados; nunca se
     expone una URL pública — toda lectura pasa por `getSignedUrls()`
     (`src/services/storage.service.ts`), que expiran en 1 hora.

## Bitácora: sincronización idempotente (base del modo offline)

Crear una entrada de bitácora **no** es una Server Action: va por el Route Handler
`/api/sync/bitacora` ([route.ts](./src/app/api/sync/bitacora/route.ts) →
[bitacora-sync.service.ts](./src/services/bitacora-sync.service.ts); lado navegador en
[src/lib/bitacora-sync.ts](./src/lib/bitacora-sync.ts)). El id de una Server Action cambia en
cada deploy y un envío encolado en un celular sin señal fallaría.

- Los ids (entrada, fotos, CSV) los genera el cliente; reenviar el mismo manifiesto nunca
  duplica. No introducir ids ni rutas de Storage aleatorias del lado del servidor.
- Los archivos van del navegador directo a Storage con URL firmada de subida; el servidor
  verifica tamaño/tipo de lo que llegó antes de registrarlo.
- Códigos de estado: 401 = pedir login y reintentar (nunca descartar), 403/422 = no
  reintentar, 5xx/red = reintentar.

**Cola offline** ([src/lib/bitacora-outbox.ts](./src/lib/bitacora-outbox.ts), IndexedDB):
toda entrada se guarda primero en el dispositivo y se borra de ahí solo cuando el servidor
confirma. `OutboxProvider` (layout del panel, solo roles con bitácora) la procesa al abrir,
al volver la señal, al volver a la pestaña y cada 30 s, con espera creciente entre
reintentos. Una sola pestaña sincroniza a la vez (Web Locks).

- Cada entrada lleva `ownerId`: nunca enviar la cola de un usuario con la sesión de otro.
- El schema de la entrada vive en [src/lib/bitacora-schema.ts](./src/lib/bitacora-schema.ts)
  (sin acceso a datos) porque el navegador valida antes de encolar: una entrada inválida
  quedaría trabada en la cola sin nadie que avise.
- No llamar `router.refresh()` sin confirmar que hubo red: si el refresco falla, Next cae a
  una navegación completa y muestra la página de error del navegador.

**Abrir sin señal** — `/campo` ([src/app/campo/](./src/app/campo/)) es una captura de
bitácora **estática** que el service worker ([public/sw.js](./public/sw.js), escrito a mano)
guarda en caché. Cualquier navegación que falle o tarde más de 10 s redirige ahí.

- `/campo` no puede depender de la sesión ni del servidor: usuario y proyectos los deja en
  IndexedDB `OfflineSetup` (layout del panel y `/bitacora`) cada vez que se abre con señal.
  Cerrar sesión los borra (la cola no).
- El service worker no guarda en caché páginas del panel ni datos: solo `/campo` y sus
  `/_next/static`. No ampliarlo a páginas con datos privados.
- Componentes compartidos entre el panel y `/campo`: [src/components/offline/](./src/components/offline/).
- Solo se registra en producción. Para probar: `next build && next start`, abrir `/bitacora`
  con sesión, apagar la red y recargar.

**Fotos** — se comprimen en el dispositivo antes de encolarlas
([src/lib/image-compression.ts](./src/lib/image-compression.ts): 1920 px, JPEG 0.8). El
límite de 5 MB se valida **después** de comprimir. Se conserva el EXIF del original (fecha,
GPS: respaldo de dónde y cuándo se tomó) con la orientación en 1, porque la rotación ya va en
los píxeles. Si el navegador no puede decodificarla (HEIC fuera de Safari) se sube el original.

**Instalación** — `InstallPrompt` invita a instalar la app en pantallas táctiles. Importa más
que lo estético: iOS borra IndexedDB (la cola) de un sitio sin uso en 7 días, pero no de una
app instalada. El manifest arranca en `/bitacora` con `id: "/"` (no cambiar el `id`: una
instalación existente pasaría a verse como otra app).

## SEO del sitio público

Todo lo que leen los buscadores se genera desde `src/config/site.ts`; no hay metadata
escrita a mano en los componentes.

| Qué | Dónde |
|---|---|
| Metadata base (title/description/OG/robots), `viewport`, `themeColor` | [src/app/layout.tsx](./src/app/layout.tsx) |
| `robots.txt` (deriva las rutas privadas de `dashboardNav`) | [src/app/robots.ts](./src/app/robots.ts) |
| `sitemap.xml` (home + páginas de `legalNav`) | [src/app/sitemap.ts](./src/app/sitemap.ts) |
| Manifest e iconos | [src/app/manifest.ts](./src/app/manifest.ts), `public/icon*.png`, `src/app/favicon.ico` |
| Imagen de vista previa, generada en build | [src/app/opengraph-image.tsx](./src/app/opengraph-image.tsx) |
| Structured data JSON-LD | [src/components/structured-data.tsx](./src/components/structured-data.tsx) |
| Palabras clave objetivo y FAQ | `seoKeywords` y `faqContent` en `config/site.ts` |

Reglas:

1. **Una página pública nueva** debe declarar su `metadata` con `title`, `description` y
   `alternates.canonical`, y agregarse a `legalNav` o al `sitemap.ts` si debe indexarse.
2. **Una pantalla privada nueva** no necesita nada: hereda `robots: noindex` del layout del
   dashboard, y `robots.txt` la excluye sola al agregarla a `dashboardNav`.
3. **`seoKeywords` es una guía editorial, no un mecanismo.** Google ignora la meta
   `keywords` desde 2009: posiciona por el texto visible. Los términos tienen que aparecer
   de forma natural en títulos, servicios y FAQ. Nunca agregar palabras clave de servicios
   que la empresa no presta — el keyword stuffing irrelevante hunde el ranking de los
   términos que sí importan.
4. **El structured data no puede afirmar nada que no esté en el HTML visible**, ni datos sin
   confirmar (dirección, horario, calificaciones). Google lo sanciona como spam de datos
   estructurados. Lo que no esté confirmado se omite: ver `businessInfo.address`, que es
   `null` a propósito.
5. **Imágenes**: hoy el sitio no tiene ninguna de mapa de bits (todo es SVG en línea y un
   `<canvas>`). Al agregar fotos de trabajos, usar `next/image` y nunca `<img>`, para que
   pasen por el optimizador (AVIF/WebP, configurado en `next.config.ts`). Todo elemento
   gráfico decorativo lleva `aria-hidden="true"`; el que aporte información lleva `alt` real.

## Formulario público de contacto

`src/components/contact-form.tsx` → `src/app/actions.ts` → `src/services/contacto.service.ts`.

Es una de las **tres excepciones** (las otras: notificaciones y acceso de clientes al portal,
abajo) a la regla de usar siempre el cliente de sesión de Supabase: la escritura usa `createAdminClient()` (service role) porque `contacto_mensajes` no tiene
política de insert en RLS **para nadie**. Eso es deliberado — si `anon` pudiera insertar, un
bot llamaría la API REST de Supabase directamente y se saltaría la validación, el honeypot y
el límite por IP. Sin política, la única puerta es la Server Action, que sí valida.

`src/lib/supabase/admin.ts` lleva `import "server-only"`: si alguien lo importa desde un
componente cliente, el build falla en vez de filtrar la service role key al navegador.

Capas anti-spam (ninguna es un control de seguridad por sí sola, y así está documentado en
el código): honeypot → trampa de tiempo → heurística de enlaces → límite de 5 envíos por
hora y por IP. La IP se guarda solo como SHA-256 con sal (`CONTACT_IP_SALT`), nunca en
claro, y así está declarado en la política de privacidad.

Los envíos sospechosos se guardan marcados como `spam` en vez de descartarse: si el filtro
se equivoca, la solicitud legítima sigue recuperable en la bandeja.

## Notificaciones de proyectos y trámites sin movimiento

Vercel Cron ([vercel.json](./vercel.json), 13:00 UTC = 7:00 en Costa Rica) →
[/api/cron/alertas](./src/app/api/cron/alertas/route.ts) →
[alertas.service.ts](./src/services/alertas.service.ts). Un admin puede correr lo mismo con
"Revisar ahora" en `/notificaciones`.

- **Qué es "sin movimiento"** se calcula en vistas, no se almacena
  (`supabase/migrations/0007_notificaciones.sql`): un proyecto, desde lo último entre su
  cambio de estado (`estado_cambiado_at`, lo sella un trigger) y su última bitácora; un
  trámite, desde lo último entre envío, revisión y cambio de estado. No usar `updated_at`:
  cambia con cualquier edición.
- **Umbrales** en `alertas_config` (fila única, la edita solo admin). El panel de
  `/tramites` usa el mismo umbral por defecto, para que muestre lo mismo que se avisa.
- **Service role**: `notificaciones` no tiene política de insert; solo el job escribe. El
  usuario lee las suyas y solo puede actualizar `leida_at` (grant por columna).
- **Destinatarios**: todos los admin + el responsable si es admin/oficina. No se repite el
  aviso de lo mismo a la misma persona antes de `recordatorio_dias`.
- **Correo**: un resumen por persona vía Resend ([src/lib/email.ts](./src/lib/email.ts)).
  Sin `RESEND_API_KEY` la bandeja interna sigue funcionando. Todo texto del usuario va con
  `escapeHtml` en el HTML del correo.

## Acceso de clientes al portal

Casilla "Dar acceso al portal" en el diálogo de cliente →
[clientes/actions.ts](./src/app/(dashboard)/clientes/actions.ts) →
[portal-clientes.service.ts](./src/services/portal-clientes.service.ts) (service role).

- Un cliente con acceso = perfil `role = cliente` con `cliente_id` = su ficha. Quitar el
  acceso desactiva el perfil; no se borra el usuario.
- El enlace del correo lleva a `/definir-contrasena`; el token se canjea al **enviar** el
  formulario, no al abrir el link (los escáneres de correo lo consumirían).
- `handle_new_user()` toma el rol de `raw_app_meta_data` (0009_...), nunca de
  `raw_user_meta_data`, que lo escribe quien se registra. Sin rol ahí, el perfil nace inactivo.
- Nunca cambiar el rol de un usuario interno desde este flujo: si el correo ya es de un
  usuario no-cliente, se rechaza.

## Colores de estado: usar los tokens, no los de Tailwind

`text-red-700`, `text-green-700`, `text-amber-600` y compañía **no cambian con el esquema de
color**: sobre el fondo tinta del modo oscuro, `red-700` daba 2.7:1 y todos los mensajes de
error del panel eran ilegibles.

Usar `text-danger`, `text-success` y `text-warning` (definidos en
[src/app/globals.css](./src/app/globals.css) con un valor por esquema, medido contra los
cuatro fondos del sistema y cumpliendo AA ≥4.5:1 en el peor caso). Aplica igual a
`border-*` y `bg-*`.

Excepción documentada: los puntos y rellenos tenues de `ui/badge.tsx` sí usan tonos fijos,
porque ahí el texto siempre va en `text-foreground` y el color es decorativo.

## Seguridad de la capa HTTP

[next.config.ts](./next.config.ts) envía HSTS, CSP, `X-Content-Type-Options`,
`Referrer-Policy`, `X-Frame-Options` y `Permissions-Policy` **solo en producción** (en
desarrollo estorban al recargado en caliente y HSTS ensucia el navegador para localhost).
`src/proxy.ts` redirige http → https con 308, salvo en localhost.

La CSP no usa nonce a propósito: exigiría renderizado dinámico en todas las páginas y el
sitio público dejaría de servirse estático. El razonamiento completo y cuándo habría que
revisarlo están comentados en `next.config.ts` — leerlo antes de integrar cualquier script
de terceros.

## Proxy de sesión (antes "middleware")

`proxy.ts` (raíz) + [src/lib/supabase/proxy.ts](./src/lib/supabase/proxy.ts) refrescan la
sesión de Supabase en cada request y redirigen por rol: sin sesión → `/login` si la ruta
está en `dashboardNav`; con sesión → la home de SU rol si visita `/login` o pide una ruta que
no le corresponde (`navKeysByRole`, ver arriba). Si las variables de entorno de Supabase no
están configuradas todavía (ver README paso 3), no se bloquea la app — se deja pasar sin
verificar sesión.

Nota: Next.js 16 deprecó el archivo `middleware.ts` y lo renombró a `proxy.ts` (misma
funcionalidad, cambia el nombre del archivo raíz y de la función exportada, que ahora se llama
`proxy` en vez de `middleware`). No recrear `middleware.ts` — no se ejecuta en esta versión.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
