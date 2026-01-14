const CACHE_NAME = 'homefin-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Add other assets like CSS, JS, and images here
  // The build process will likely auto-populate this list
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
