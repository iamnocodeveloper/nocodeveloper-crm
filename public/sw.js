/*
 * Service worker mínimo del CRM.
 *
 * - Navegaciones: red primero; si no hay red, la pantalla /offline cacheada.
 * - Estáticos de Next (chunks con hash), iconos y fuentes: cache primero.
 * - API y datos: nunca se cachean; el CRM no debe mostrar datos viejos.
 *
 * Subir CACHE al cambiar la estrategia para que los clientes suelten la copia
 * anterior en `activate`.
 */
const CACHE = "kooni-shell-v2";
const OFFLINE = "/offline";
const PRECACHE = [
  OFFLINE,
  "/pwa-192.png",
  "/pwa-512.png",
  "/pwa-512-maskable.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  // La precarga es best-effort: si una descarga se cuelga (red móvil, HTTP/3
  // inestable), el worker debe activarse igual. Sin este tope, la instalación
  // se quedaba en `installing` para siempre y el navegador descartaba el
  // registro; la app perdía el modo offline sin decir nada.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.race([
        Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))),
        new Promise((resolve) => setTimeout(resolve, 5_000)),
      ]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE).then(
          (cached) =>
            cached ||
            new Response("Sin conexión", {
              status: 503,
              headers: { "content-type": "text/plain; charset=utf-8" },
            })
        )
      )
    );
    return;
  }

  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|svg|ico|woff2?|css)$/.test(url.pathname);
  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
