// Service worker: rende l'app disponibile anche senza internet.
// A ogni nuova versione cambia VERSIONE: il browser scarica i file nuovi e l'app si ricarica da sola.
const VERSIONE = 'portafoglio-web-1.0.1';
const FILE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/stile.css',
  './js/app.js',
  './js/model.js',
  './js/ui.js',
  './js/info.js',
  './js/grafici.js',
  './js/xlsx.js',
  './js/esporta.js',
  './icone/icona-192.png',
  './icone/icona-512.png',
  './icone/icona-maskable-512.png',
  './icone/apple-touch-icon.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n !== VERSIONE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // prima la copia salvata (funziona offline), poi la rete
  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then((salvata) => salvata || fetch(req).then((risposta) => {
      if (risposta.ok) {
        const copia = risposta.clone();
        caches.open(VERSIONE).then((c) => c.put(req, copia));
      }
      return risposta;
    }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))),
  );
});
