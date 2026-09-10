const CACHE_NAME = 'sentence-fragment-lab-v13-read-only-review';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=20260910-3',
  './app.js?v=20260910-4',
  './question-bank.js?v=20260910-2',
  './evaluation-rules.js?v=20260908-6',
  './open-text-evaluator.js?v=20260908-6',
  './tests/evaluator-tests.html',
  './tests/evaluator-tests.js?v=20260908-6',
  './manifest.webmanifest',
  './assets/app-icon.svg',
  './assets/BYUI_logo_white.png',
  './assets/BYUI_logo_blue.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)
        .then((cached) => cached || caches.match('./index.html')))
  );
});
