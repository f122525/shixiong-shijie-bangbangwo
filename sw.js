const CACHE='labcalc-v1.5.1';
const ASSETS=['./','./index.html','./legacy-v1.3.html','./patch-v1.5.js','./force-update.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(ASSETS);await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('labcalc-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(e.request.mode==='navigate'){
    e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});const c=await caches.open(CACHE);c.put(e.request,r.clone());return r}catch(err){return (await caches.match(e.request))||(await caches.match('./index.html'))}})());
    return;
  }
  const url=new URL(e.request.url);
  if(url.origin===self.location.origin&&(url.pathname.endsWith('/patch-v1.5.js')||url.pathname.endsWith('/legacy-v1.3.html')||url.pathname.endsWith('/index.html'))){
    e.respondWith((async()=>{try{const r=await fetch(e.request,{cache:'no-store'});if(r&&r.ok){const c=await caches.open(CACHE);c.put(e.request,r.clone())}return r}catch(err){return (await caches.match(e.request))||Response.error()}})());
    return;
  }
  e.respondWith((async()=>{const cached=await caches.match(e.request);if(cached)return cached;try{const r=await fetch(e.request);if(r&&r.ok){const c=await caches.open(CACHE);c.put(e.request,r.clone())}return r}catch(err){return Response.error()}})());
});
