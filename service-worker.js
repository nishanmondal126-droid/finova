'use strict';

const CACHE_PREFIX = 'finova-app-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const BASE_URL = new URL('./', self.registration.scope);
const INDEX_URL = new URL('index.html', BASE_URL).href;
const SHELL_URLS = [
  INDEX_URL,
  new URL('manifest.webmanifest', BASE_URL).href,
  new URL('icons/finova.svg', BASE_URL).href,
  new URL('icons/finova-192.png', BASE_URL).href,
  new URL('icons/finova-512.png', BASE_URL).href,
  new URL('icons/apple-touch-icon.png', BASE_URL).href
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(new Request(request, { cache: 'no-cache' }));
        if (response.ok) await cache.put(INDEX_URL, response.clone());
        return response;
      } catch {
        return (await cache.match(INDEX_URL)) || Response.error();
      }
    })());
    return;
  }

  const cachedUrl = SHELL_URLS.find(asset => new URL(asset).href === url.href);
  if (!cachedUrl) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(new Request(request, { cache: 'no-cache' }));
      if (response.ok) await cache.put(cachedUrl, response.clone());
      return response;
    } catch {
      return await cache.match(cachedUrl) || Response.error();
    }
  })());
});
