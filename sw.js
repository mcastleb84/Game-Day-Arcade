// Game Day Arcade offline cache.
// Bump VERSION whenever you upload changed files. Add each new game's page to FILES.
const VERSION='arcade-v8';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./menu.js',
  './games/long-bomb/index.html','./games/ping-pong/index.html','./games/beer-pong/index.html','./games/word-search/index.html','./games/crossword/index.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  // Our own files: always ask the server for the newest copy (skip the browser's short-term cache), fall back to the saved copy offline.
  const own=new URL(e.request.url).origin===location.origin;
  const net=own?fetch(e.request.url,{cache:'no-cache'}):fetch(e.request);
  e.respondWith(net.then(r=>{const copy=r.clone();caches.open(VERSION).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
