// JOAJU R20 cache revision
// Auditor compatibility baseline: 2026-08-12-pwa-6-sparse-index-visualfix
const JOAJU_PWA_VERSION='2026-08-21-pwa-20-r20-mobile-map-toolbar';
const CORE_CACHE=`joaju-core-${JOAJU_PWA_VERSION}`;
const RUNTIME_CACHE=`joaju-runtime-${JOAJU_PWA_VERSION}`;
const DATA_CACHE=`joaju-data-${JOAJU_PWA_VERSION}`;

const CORE_ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './metodologia.html',
  './assets/icons/joaju-192.png',
  './assets/icons/joaju-512.png',
  './assets/icons/joaju-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './dados/precalculados/snapshot_metadata.json'
];

const OFFLINE_TERRITORIAL_ASSETS=[
  './dados/precalculados/malha_territorial_250km2.geojson',
  './dados/precalculados/ficha_territorial_250km2.geojson',
  './dados/precalculados/ipg_250km2.geojson',
  './dados/precalculados/peic_250km2.geojson',
  './dados/precalculados/iati_250km2.geojson',
  './dados/precalculados/iat_250km2.geojson',
  './dados/precalculados/isa_250km2.geojson',
  './dados/precalculados/ict_250km2.geojson',
  './dados/precalculados/ipae_250km2.geojson',
  './dados/precalculados/icd_250km2.geojson',
  './dados/precalculados/acessibilidade_rodoviaria_estimada_rotas_base_externa.geojson',
  './dados/precalculados/interacoes_rotas_unidades_conservacao.geojson',
  './dados/precalculados/cavidades_proximas_rotas_estudo.geojson',
  './dados/precalculados/cavidades_em_unidades_conservacao.geojson'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CORE_CACHE);
    await cache.addAll(CORE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keep=new Set([CORE_CACHE,RUNTIME_CACHE,DATA_CACHE]);
    for(const key of await caches.keys()){
      if(key.startsWith('joaju-')&&!keep.has(key))await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

async function networkFirst(request){
  const cache=await caches.open(RUNTIME_CACHE);
  try{
    const response=await fetch(request);
    if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(error){
    return (await cache.match(request)) || (await caches.match('./index.html')) || Response.error();
  }
}

async function cacheFirst(request, cacheName=RUNTIME_CACHE){
  const cache=await caches.open(cacheName);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response&&(response.ok||response.type==='opaque'))cache.put(request,response.clone()).catch(()=>{});
  return response;
}

async function networkFirstCached(request,cacheName=DATA_CACHE){
  const cache=await caches.open(cacheName);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});
    return response;
  }catch(error){
    return (await cache.match(request)) || Response.error();
  }
}

async function staleWhileRevalidate(request){
  const cache=await caches.open(RUNTIME_CACHE);
  const cached=await cache.match(request);
  const update=fetch(request).then(response=>{
    if(response&&(response.ok||response.type==='opaque'))cache.put(request,response.clone()).catch(()=>{});
    return response;
  }).catch(()=>null);
  return cached || await update || Response.error();
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);

  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request));
    return;
  }

  if(url.origin===self.location.origin){
    if(url.pathname.includes('/dados/precalculados/')){
      event.respondWith(networkFirstCached(request,DATA_CACHE));
      return;
    }
    if(url.pathname.includes('/dados/materializados/')||url.pathname.includes('/dados/')){
      event.respondWith(cacheFirst(request,DATA_CACHE));
      return;
    }
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  const host=url.hostname;
  if((host==='unpkg.com'||host==='cdnjs.cloudflare.com')&&/leaflet|jszip/i.test(url.pathname)){
    event.respondWith(cacheFirst(request,RUNTIME_CACHE));
  }
});

async function notifyClient(clientId,payload){
  const client=clientId?await self.clients.get(clientId):null;
  if(client)client.postMessage(payload);
}

self.addEventListener('message',event=>{
  const data=event.data||{};
  if(data.type==='SKIP_WAITING'){
    self.skipWaiting();
    return;
  }
  if(data.type==='CACHE_OFFLINE_TERRITORIAL'){
    event.waitUntil((async()=>{
      const cache=await caches.open(DATA_CACHE);
      let done=0;
      const total=OFFLINE_TERRITORIAL_ASSETS.length;
      try{
        for(const asset of OFFLINE_TERRITORIAL_ASSETS){
          const absolute=new URL(asset,self.registration.scope).toString();
          const request=new Request(absolute,{cache:'reload'});
          const response=await fetch(request);
          if(!response.ok)throw new Error(`${asset} · HTTP ${response.status}`);
          await cache.put(request,response.clone());
          done++;
          await notifyClient(event.source?.id,{type:'OFFLINE_PROGRESS',done,total,asset});
        }
        await notifyClient(event.source?.id,{type:'OFFLINE_DONE',done,total});
      }catch(error){
        await notifyClient(event.source?.id,{type:'OFFLINE_ERROR',done,total,message:String(error?.message||error)});
      }
    })());
    return;
  }
  if(data.type==='CLEAR_PWA_CACHES'){
    event.waitUntil((async()=>{
      await caches.delete(DATA_CACHE);
      await caches.delete(RUNTIME_CACHE);
      await notifyClient(event.source?.id,{type:'OFFLINE_CLEARED'});
    })());
  }
});
