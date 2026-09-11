# IACA — Design System (Master)

Generado con la skill `ui-ux-pro-max` (`.claude/skills/ui-ux-pro-max/`) a partir de la
paleta de marca y la escala tipográfica que dio el cliente. Fuente de verdad para
cualquier página nueva — si una página necesita desviarse de esto, documentarlo en
`design-system/pages/<pagina>.md` en vez de romper la consistencia aquí.

## Por qué esto y no un look "SaaS genérico"

El pedido explícito fue evitar la estética "vibe code" (glassmorphism, gradientes,
esquinas muy redondeadas, azul-morado genérico). Con una paleta papel + tinta
(navy/ink/slate sobre marfil, no blanco puro) el mejor patrón de la librería es
**Editorial Grid / Magazine** combinado con **Trust & Authority** para el sitio público, y
**Minimalism & Swiss Style** para el panel interno — no **Glassmorphism** ni
**Neumorphism**, que piden fondos vibrantes y transparencias que no encajan con esta
paleta ni con el público objetivo (clientes de trámites topográficos/gubernamentales, que
premian seriedad sobre "modernidad" superficial).

Firma visual: base **editorial "papel + tinta"** (marfil, no blanco puro; Libre Bodoni en
titulares) con una capa de **profundidad sobria** — no es un panel plano.

> **Actualización (iteración de UI):** el sistema pasó de "0px + sin sombras" a **radios
> pequeños (4–6px, tokens `--radius-sm/md/lg/xl`)** y **sombras suaves en capas**
> (`--shadow-xs/sm/md/lg`, tinta a alfa muy baja — nunca gris plano). Se agregó un acento
> **índigo `#4338ca`** (misma familia que el navy) para estados activos, hover de enlaces y
> el anillo de foco, y superficies elevadas (`--surface-raised`, marfil más claro que el
> fondo) para que las tarjetas se despeguen. La personalidad editorial se mantiene: la
> tipografía Bodoni en headings y la paleta marfil son las que llevan la identidad, no las
> esquinas rectas. Micro-animaciones 150–300ms (`--ease-emphatic`), todo bajo
> `prefers-reduced-motion`. Fuente de verdad de los tokens: `src/app/globals.css`.

## Paleta

| Token | Hex | Uso |
|---|---|---|
| `--color-paper` | `#fefeda` | Fondo principal (claro). Papel/marfil, nunca blanco puro. |
| `--color-ink` | `#1a1825` | Texto principal en modo claro; fondo en modo oscuro y en la sidebar del dashboard. |
| `--color-navy` | `#262f66` | Marca primaria: CTAs, links, acentos, headline de marca. |
| `--color-slate` | `#575d83` | Texto secundario, bordes, UI silenciada. |

Contraste verificado (WCAG) sobre `#fefeda`:
- `#1a1825` → 16.98:1 (AAA)
- `#262f66` → 12.13:1 (AAA)
- `#575d83` → 6.18:1 (AA para texto normal; usar solo en texto secundario/muted, no en
  cuerpo principal si se necesita AAA)

Modo oscuro (`prefers-color-scheme: dark`): fondo `#1a1825` + texto `#fefeda` (16.98:1).
El navy y el slate de marca **no** alcanzan contraste suficiente sobre `#1a1825`, así que
se usan tintes más claros solo para ese contexto: `--primary: #818cf8` (~5.9:1) y
`--muted-foreground: #9da1be` (~6.9:1). Ver `src/app/globals.css`.

No usar los cuatro colores de marca como si fueran intercambiables entre sí: `paper` es
siempre fondo, `ink` es siempre el texto/contraste más fuerte, `navy` es siempre la acción
primaria, `slate` es siempre secundario/silenciado.

## Tipografía

Par **Magazine Style**: `Libre Bodoni` (heading) + `Public Sans` (body/UI), cargadas
como fuentes propias vía `next/font/google` en `src/app/layout.tsx` (sin llamada externa a
Google Fonts en runtime).

- **Libre Bodoni** — serif editorial de alto contraste. Le da personalidad a los
  titulares (evoca un documento oficial/plano impreso, coherente con una empresa de
  topografía y catastro) sin caer en "elegante genérico" (Playfair Display, que aparece en
  el 80% de landings con IA).
- **Public Sans** — el sans-serif del design system del gobierno de EE. UU. (USWDS).
  Elegido a propósito: esta empresa tramita ante entidades públicas, y un sans-serif con
  origen institucional refuerza esa seriedad en vez de un sans genérico tipo Inter.

Aplicación: `h1/h2/h3/h4` usan `--font-heading` automáticamente (ver `globals.css`); todo
lo demás hereda `--font-sans` del `body`.

### Escala (de la imagen de referencia del cliente)

| Nivel | Tamaño | Uso | Utilidad Tailwind |
|---|---|---|---|
| H1 | 64px / line-height 1.05 | Titulares hero (solo landing pública) | `text-h1` |
| H2 | 40px / line-height 1.15 | Titulares de sección | `text-h2` |
| H3 | 28px / line-height 1.3 | Sub-titulares; también el título de cada página del dashboard | `text-h3` |
| Body | 18px / line-height 1.6 | Cuerpo de texto | `text-body` |
| Small | 14px / line-height 1.5 | Texto pequeño, captions, labels | `text-small` |

Nota deliberada: el dashboard usa `H3` como tamaño de título de página, no `H1`/`H2` — un
panel de trabajo denso no debe gritar tan fuerte como un hero de marketing (ver categoría
"Executive Dashboard" / "Data-Dense Dashboard" en la librería: piden layouts compactos,
no titulares grandes).

## Patrones de layout por tipo de página

| Página | Patrón | Por qué |
|---|---|---|
| Sitio público (`/`) | Editorial Grid + Trust & Authority (adaptado de "Enterprise Gateway") | Necesita transmitir credibilidad técnica/institucional; franja de datos de confianza usa **hechos reales del dominio** (CR-SIRGAS, Catastro Nacional), nunca testimonios o cifras inventadas — no hay esos datos todavía. |
| Login | Swiss minimalista, tarjeta única centrada | Una sola tarea, cero distracción. |
| Dashboard (`/proyectos`, `/clientes`, etc.) | Minimalism & Swiss Style, sidebar oscura (`ink`) + contenido en papel | Separa visualmente "herramienta" (sidebar) de "documento/dato" (contenido); patrón estándar de dashboards densos. |

## Reglas de implementación

- Esquinas: **radios pequeños** — `rounded-md` (6px) en controles, botones y filas;
  `rounded-lg` (10px) en tarjetas/tablas/secciones; `rounded-xl` (14px) en modales.
  `rounded-full` solo en píldoras (badges), avatares y el botón de WhatsApp. No usar radios
  grandes (> 14px) ni `rounded-2xl/3xl` — ahí empieza el look "SaaS genérico".
  - **Excepción documentada**: el botón flotante de WhatsApp
    (`src/components/whatsapp-float.tsx`) usa el verde de marca oficial `#25D366` en vez de
    la paleta navy/ink/slate, porque el reconocimiento del widget depende de ese color.
- Bordes: hairline (`border border-border`, 1px). **Profundidad** con las sombras del
  sistema (`shadow-xs` en controles/botones, `shadow-sm` en tarjetas y tablas, `shadow-md`
  en hover de tarjetas interactivas y stat-cards, `shadow-lg` en modales, toasts y la
  tarjeta de login). Nunca sombras duras ni de gris plano: los tokens son tinta a alfa muy
  baja, en capas. El fondo de tarjeta es `bg-surface-raised` (marfil más claro que el
  fondo) para que la sombra tenga de dónde despegarse.
- Movimiento: micro-interacciones de 150–300ms. Botones primarios/secundarios suben 1px en
  hover (`-translate-y-px` + sombra), se hunden en `:active`. Filas de tabla resaltan con
  `bg-surface`. Modales entran con `pop`, toasts con `slide-in`, secciones con `rise`, y el
  contenido below-the-fold del sitio público con `<Reveal>`. Todo respeta
  `prefers-reduced-motion` (globals.css lo neutraliza).
- Botones/enlaces interactivos: siempre `cursor-pointer`, estado `hover` con transición de
  150-300ms, y `focus-visible:outline` visible (accesibilidad, no solo estética).
- No usar emojis como iconos. Si se necesitan iconos, usar SVG (Heroicons/Lucide) — el
  proyecto ya trae `lucide-react` como dependencia.
- Cada elemento interactivo o de prueba lleva `data-cy` (ver `CLAUDE.md`, regla 3).

## Cómo extender esto

Antes de diseñar una página nueva, releer esta tabla y las reglas de implementación. Si la
página necesita desviarse (por ejemplo, un patrón de datos denso para "Reportes KPI" con
gráficas), documentar la desviación en `design-system/pages/kpi.md` en vez de reinterpretar
la marca desde cero. La skill `ui-ux-pro-max` tiene datasets adicionales
(`.claude/skills/ui-ux-pro-max/data/*.csv`) para gráficas, UX de formularios, etc. —
consultarlos directamente (no requieren Python, son CSV planos) si no hay Python
instalado en la máquina.
