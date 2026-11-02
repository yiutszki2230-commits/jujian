const PREFIX = 'jujian-static-';
const CACHE = PREFIX + 'v1.1.0';
const FILES = ['./','./index.html','./styles.css','./app.js','./core.js','./view-state.js','./seeds.js','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin) return;
  // Only serve this app's static files; never cache login pages or exports.
  const allowed=new Set(FILES.map(path=>new URL(path,self.registration.scope).href));
  if(!allowed.has(url.href)) return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&!response.redirected) { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); }
    return response;
  }).catch(()=>caches.match(event.request)));
});
