const CACHE='cecilia-v11';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request,fallback){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok)await cache.put(fallback||request,response.clone());
    return response;
  }catch(err){
    return (await cache.match(fallback||request)) || (await caches.match(request));
  }
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);

  // Recursos externos (Supabase, CDN de XLSX, etc.) no pasan por el cache de Cecilia.
  if(url.origin!==self.location.origin)return;

  // HTML y archivos de código SIEMPRE intentan red primero.
  // Esto evita mezclar index.html nuevo con app.js viejo, que causaba la pantalla en blanco.
  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request,'./index.html'));
    return;
  }
  if(['script','style','worker'].includes(request.destination) || /\.(?:js|css|html|webmanifest)$/i.test(url.pathname)){
    event.respondWith(networkFirst(request));
    return;
  }

  // Imágenes y otros recursos estáticos: cache primero para mantener soporte offline.
  event.respondWith((async()=>{
    const cached=await caches.match(request);
    if(cached)return cached;
    try{
      const response=await fetch(request);
      if(response&&response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}
      return response;
    }catch(err){return cached}
  })());
});
