self.addEventListener("install",()=>self.skipWaiting());

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(key=>caches.delete(key)));
    await self.registration.unregister();
    const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of clients){
      try{await client.navigate("/");}catch{}
    }
  })());
});

self.addEventListener("fetch",event=>{
  event.respondWith(fetch(event.request,{cache:"no-store"}));
});
