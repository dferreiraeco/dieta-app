const CACHE_NAME = 'dieta-v2.1.92';

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
  const url = new URL(e.request.url);

  // v2.1.72: .md files (docs legais PRIVACY/TERMS) — deixa o browser
  // lidar direto, sem interceptar. Evita que o SW engula erros e cause
  // "Failed to fetch" quando o cache tá frio.
  if (url.pathname.endsWith('.md')) return;

  // v2.1.68: CSS também entra na política no-store (era network-first com
  // cache fallback, mas PWA standalone em iOS honrava HTTP cache do navegador
  // e nunca refetchava o stylesheet com query string estática).
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
  // v2.1.72: se ambos falharem, devolve Response 404 explícita em vez de
  // undefined (que quebra fetch() com "Failed to fetch" no cliente)
  e.respondWith(
    fetch(e.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(e.request);
      return cached || new Response('Not found', { status: 404, statusText: 'Not Found' });
    })
  );
});
