const CACHE='cecilia-v12';
const CORE=['./','./index.html','./styles.css','./app.js','./validationfix.js','./manifest.webmanifest'];

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

async function navigationResponse(request){
  const raw=await networkFirst(request,'./index.html');
  if(!raw)return raw;
  try{
    const type=raw.headers.get('content-type')||'';
    if(!type.includes('text/html'))return raw;
    let html=await raw.text();
    if(!html.includes('validationfix.js'))html=html.replace('</body>','  <script src="validationfix.js"></script>\n</body>');
    return new Response(html,{status:raw.status,statusText:raw.statusText,headers:{'content-type':'text/html; charset=utf-8'}});
  }catch{return raw}
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);

  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(navigationResponse(request));
    return;
  }
  if(['script','style','worker'].includes(request.destination) || /\.(?:js|css|html|webmanifest)$/i.test(url.pathname)){
    event.respondWith(networkFirst(request));
    return;
  }

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
