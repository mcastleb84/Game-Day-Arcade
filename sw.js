// Game Day Arcade offline cache.
// Bump VERSION whenever you upload changed files. Add each new game's page to FILES.
const VERSION='arcade-v5';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png',
  './games/long-bomb/index.html','./games/ping-pong/index.html','./games/beer-pong/index.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(VERSION).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
