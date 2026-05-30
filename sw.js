const CACHE = 'gomi-v1';
const BASE = '/niigata-gomi-calendar';
const ASSETS = [BASE + '/', BASE + '/index.html', BASE + '/gomi-data.js', BASE + '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // gomi-data.js はキャッシュ優先（大きいファイルのため）
  if (url.pathname.endsWith('gomi-data.js')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    })));
    return;
  }
  // それ以外はネットワーク優先
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

const ICONS = {
  '燃やすごみ':'🔥','プラマーク容器包装':'♻️','飲食用缶':'🥫',
  'ペットボトル':'🧴','飲食用・化粧品びん':'🍶','古紙類':'📰',
  '枝・葉・草':'🌿','特定5品目':'🪣','燃やさないごみ':'🗑️',
};

// アプリからのメッセージを受け取って通知表示
self.addEventListener('message', async e => {
  if (e.data?.type === 'NOTIFY_TODAY') {
    const { types, areaName } = e.data;
    if (!types?.length) return;
    const body = types.map(t => (ICONS[t] || '') + ' ' + t).join('　');
    await self.registration.showNotification('今日のごみ収集', {
      body: areaName + '\n' + body,
      icon: BASE + '/icon-192.png',
      badge: BASE + '/icon-192.png',
      tag: 'gomi-today',
      renotify: true,
      vibrate: [100],
    });
  } else if (e.data?.type === 'NOTIFY_REMINDER') {
    const { title, body, gtype } = e.data;
    await self.registration.showNotification(title, {
      body,
      icon: BASE + '/icon-192.png',
      badge: BASE + '/icon-192.png',
      tag: 'gomi-remind-' + (gtype || 'misc'),
      renotify: true,
      vibrate: [100, 50, 100],
    });
  }
});

// 通知タップでアプリを開く
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(BASE + '/'));
});

// サーバーからのプッシュ（将来対応）
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(self.registration.showNotification(data.title || 'ごみの日', {
    body: data.body || '',
    icon: BASE + '/icon-192.png',
    tag: 'gomi-push',
  }));
});
