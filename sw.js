const CACHE='dirtyfingaz-zp-shell-v13';
const CORE=['./','./index.html','./creator.html','./creator-engine.html','./zp-core.js','./zp-storage.js','./zp-ui-system.css','./zp-agent.css','./zp-agent.js','./zp-agent-registry.json','./zp-layout.js','./zp-layout.css','./manifest.webmanifest','./zp-icon.svg','./vendor/lame.min.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 const navigation=event.request.mode==='navigate'||event.request.destination==='document';
 if(navigation){
  event.respondWith(fetch(event.request).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
   return response;
  }).catch(async()=>{
   const cached=await caches.match(event.request);
   if(cached)return cached;
   const path=new URL(event.request.url).pathname;
   if(path.endsWith('/')||path.endsWith('/index.html'))return caches.match('./index.html');
   return new Response('Documento no disponible sin conexión',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }));
  return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
  return response;
 })));
});
