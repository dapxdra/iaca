/**
 * Service worker de IACA — modo sin conexión para la bitácora de campo.
 *
 * Hace una sola cosa: que `/campo` (captura de bitácora, ver
 * src/app/campo/page.tsx) abra sin señal. No guarda datos del panel en
 * caché: la información privada nunca queda en el caché HTTP del
 * dispositivo. Las entradas capturadas viven en IndexedDB
 * (src/lib/bitacora-outbox.ts), no acá.
 *
 *   - Guarda `/campo` y los archivos que esa página carga (JS, CSS, fuentes).
 *   - Navegaciones: primero la red. Si falla o tarda demasiado, redirige a
 *     `/campo` desde el caché. Así, abrir la app instalada sin señal (arranca
 *     en `/`) o tocar un enlace del panel deja al trabajador en la captura,
 *     y no en la página de error del navegador.
 *   - `/_next/static/*`: del caché si está (tienen hash en el nombre: nunca
 *     cambian), si no, de la red.
 *
 * Escrito a mano y no con Serwist: Next 16 compila con Turbopack y lo que se
 * necesita es poco. Se actualiza solo: la página manda "warm" cada vez que se
 * abre el panel con señal, y eso vuelve a descargar `/campo` con los archivos
 * del deploy vigente.
 */

const CACHE_PREFIX = "iaca-campo-";
const CAMPO_URL = "/campo";

/**
 * Con señal débil ("lie-fi") el request ni falla ni responde. Pasado este
 * tiempo se lleva al usuario a la captura; una página del panel que de verdad
 * tarde más que esto queda cortada, y es un intercambio aceptable en campo.
 */
const NAVIGATION_TIMEOUT_MS = 10_000;

/** No volver a descargar todo si el panel se abre varias veces seguidas. */
const WARM_INTERVAL_MS = 10 * 60_000;
let lastWarm = 0;

/** Rutas de `/_next/static` referenciadas por atributos src/href del HTML. */
function staticAssetsOf(html) {
  const urls = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
    urls.add(match[1].replace(/&amp;/g, "&"));
  }
  return [...urls];
}

/**
 * Descarga `/campo` y sus archivos a un caché nuevo y, solo si todo llegó,
 * borra los anteriores: un fallo a mitad de camino nunca deja una versión a
 * medias (HTML nuevo apuntando a archivos que no están).
 */
async function cacheCampo() {
  lastWarm = Date.now();
  const response = await fetch(CAMPO_URL, { cache: "no-store" });
  if (!response.ok) return;
  const html = await response.clone().text();

  const name = CACHE_PREFIX + Date.now();
  const cache = await caches.open(name);
  try {
    await cache.addAll(staticAssetsOf(html));
    await cache.put(CAMPO_URL, response);
  } catch (error) {
    await caches.delete(name);
    throw error;
  }

  const names = await caches.keys();
  await Promise.all(
    names.filter((n) => n.startsWith(CACHE_PREFIX) && n !== name).map((n) => caches.delete(n))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheCampo().catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data === "warm" && Date.now() - lastWarm > WARM_INTERVAL_MS) {
    event.waitUntil(cacheCampo().catch(() => {}));
  }
});

async function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function handleNavigation(request, url) {
  try {
    return await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS);
  } catch {
    const cached = await caches.match(CAMPO_URL);
    if (!cached) return Response.error();
    // Redirigir (y no servir el HTML de /campo en otra URL): el router de
    // Next hidrata según la URL, y con una distinta se desincroniza.
    return url.pathname === CAMPO_URL ? cached : Response.redirect(CAMPO_URL, 302);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
  }
});
