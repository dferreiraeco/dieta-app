const CACHE_NAME = 'dieta-v2.1.70';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // v2.1.68: CSS também entra na política no-store (era network-first com
  // cache fallback, mas PWA standalone em iOS honrava HTTP cache do navegador
  // e nunca refetchava o stylesheet com query string estática).
  const url = new URL(e.request.url);
  const isNoStore = url.pathname.endsWith('.html')
                 || url.pathname.endsWith('/')
                 || url.pathname.endsWith('.js')
                 || url.pathname.endsWith('.css');
  if (isNoStore) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() =>
        caches.match(e.request)
      )
    );
    return;
  }
  // Outros assets (imagens, fontes, manifest): network first, cache fallback
  e.respondWith(
    fetch(e.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return response;
    }).catch(() => caches.match(e.request))
  );
});
