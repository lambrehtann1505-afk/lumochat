/* LumoChat service worker: офлайн-оболочка приложения */
var V = 'lumochat-v7-7';
var SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url);
  // Firestore / Auth / любые API-запросы не трогаем
  if (u.hostname.indexOf('googleapis.com') > -1 || u.hostname.indexOf('firebaseio.com') > -1) return;

  // Страница: сначала сеть (чтобы приходили обновления), без сети — кэш
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(function (res) {
      var cp = res.clone(); caches.open(V).then(function (c) { c.put('./index.html', cp); }); return res;
    }).catch(function () { return caches.match('./index.html').then(function (m) { return m || caches.match('./'); }); }));
    return;
  }

  // Статика своего сайта и Firebase SDK с gstatic: из кэша, фоном обновляем
  if (u.origin === location.origin || u.hostname === 'www.gstatic.com') {
    e.respondWith(caches.match(r).then(function (m) {
      var net = fetch(r).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); }
        return res;
      }).catch(function () { return m; });
      return m || net;
    }));
  }
});
