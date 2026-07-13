// Service worker mínimo: solo habilita que el navegador pueda
// "instalar" la app en el celular. No cachea datos, así que la app
// siempre pedirá información fresca a Google Sheets.
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  // Deja pasar todas las peticiones normalmente (sin caché).
  return;
});
