/**
 * Registra `public/sw.js` (ver ahí qué hace) y le pide que actualice la copia
 * de `/campo` con el deploy vigente.
 *
 * Solo en producción: en desarrollo el service worker se queda con versiones
 * viejas de los archivos y pelea con el recargado en caliente. Para probar el
 * modo sin conexión, usar `next build && next start`.
 *
 * Solo lo registran las pantallas de roles con bitácora, no el sitio público:
 * un visitante cualquiera no tiene por qué descargar la pantalla de captura.
 */
export function registerServiceWorker(): void {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then(() => navigator.serviceWorker.ready)
    .then((registration) => registration.active?.postMessage("warm"))
    .catch(() => {
      // Sin service worker la app funciona igual; solo no abre sin señal.
    });
}
