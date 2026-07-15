/* ============================================================
   service-worker.js — AsHoras
   Cacheia o "esqueleto" do site (HTML/CSS/JS estáticos) para
   deixar o carregamento mais rápido e funcionar offline.
   Estratégia: network-first com fallback pro cache — sempre
   tenta buscar a versão mais nova primeiro; se não conseguir
   (sem internet), usa o que já está salvo.

   Ao mudar CACHE_NAME (ex: v1 -> v2), o navegador descarta o
   cache antigo e recarrega tudo — use isso sempre que fizer
   uma atualização grande no site.
   ============================================================ */

const CACHE_NAME = 'ashoras-cache-v1';

const APP_SHELL = [
    '/',
    '/index.html',
    '/vocesabia.html',
    '/style.css',
    '/vocesabia.css',
    '/script.js',
    '/agenda.js',
    '/seu-tempo.js',
    '/semana-do-ano.js',
    '/semana-do-ano.css',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .catch((err) => console.warn('Falha ao pré-cachear o app shell:', err))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Só cacheia requisições GET do próprio site (não mexe em APIs externas, ads, fontes, etc.)
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
