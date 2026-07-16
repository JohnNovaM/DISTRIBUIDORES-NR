/***********************************************************************
 * SERVICE WORKER - Natural Resvex (App Distribuidores)
 * ---------------------------------------------------------------------
 * Este archivo va en la MISMA carpeta que index.html y manifest.json.
 *
 * IMPORTANTE - CADA VEZ QUE ACTUALICES index.html:
 * 1. Sube el nuevo index.html.
 * 2. Sube también este sw.js, pero primero CAMBIA el número de
 *    CACHE_VERSION de abajo (ej: 'v1' -> 'v2'). Así el navegador se
 *    da cuenta de que hay una versión nueva y refresca el caché.
 * 3. Si no cambias CACHE_VERSION, los usuarios pueden seguir viendo
 *    la versión vieja de la app aunque tú ya hayas subido cambios.
 ***********************************************************************/

var CACHE_VERSION = 'v4';
var CACHE_NAME = 'natural-resvex-' + CACHE_VERSION;

// Archivos del "cascarón" de la app (shell): lo mínimo para que la
// app cargue y se vea, aunque no haya internet.
var ARCHIVOS_ESTATICOS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './icon-192.png',
  './icon-512.png'
];

// ============ INSTALACIÓN ============
// Descarga y guarda en caché los archivos estáticos apenas se
// registra el service worker.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ARCHIVOS_ESTATICOS);
    }).then(function () {
      // Activa esta versión nueva sin esperar a que se cierren las
      // pestañas viejas.
      return self.skipWaiting();
    })
  );
});

// ============ ACTIVACIÓN ============
// Borra cachés de versiones anteriores para no acumular basura ni
// servir archivos viejos.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(
        nombres
          .filter(function (nombre) { return nombre.indexOf('natural-resvex-') === 0 && nombre !== CACHE_NAME; })
          .map(function (nombre) { return caches.delete(nombre); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ============ MANEJO DE PETICIONES (fetch) ============
self.addEventListener('fetch', function (event) {
  var url = event.request.url;

  // Solo interceptamos peticiones GET. Los POST (login, guardar datos,
  // fotos, etc.) siempre van directo a la red, nunca al caché.
  if (event.request.method !== 'GET') {
    return;
  }

  // 1) Peticiones a la API de Apps Script (Google Sheet en vivo):
  //    SIEMPRE red, nunca caché. Los datos deben ser frescos.
  if (url.indexOf('script.google.com') !== -1) {
    event.respondWith(
      fetch(event.request).catch(function () {
        return new Response(
          JSON.stringify({ ok: false, error: 'Sin conexión a internet. Revisa tu señal e intenta de nuevo.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 2) Librerías externas (ej: xlsx desde cdnjs): red primero, y si
  //    falla, se usa la copia en caché (si ya se guardó antes).
  if (url.indexOf(self.location.origin) === -1) {
    event.respondWith(
      fetch(event.request).then(function (respuesta) {
        var copia = respuesta.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copia); });
        return respuesta;
      }).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  // 3) Archivos propios de la app (HTML, manifest, íconos, logo):
  //    caché primero (carga instantánea), y en segundo plano se
  //    actualiza el caché con la versión más reciente de la red.
  event.respondWith(
    caches.match(event.request).then(function (enCache) {
      var fetchPromise = fetch(event.request).then(function (respuesta) {
        if (respuesta && respuesta.ok) {
          var copia = respuesta.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copia); });
        }
        return respuesta;
      }).catch(function () {
        // Sin internet y sin copia en caché: no hay nada que devolver.
        return enCache;
      });

      return enCache || fetchPromise;
    })
  );
});
