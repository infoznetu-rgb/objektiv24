const CACHE='objektiv24-pwa-v11';
const CORE=['/','/index.html','/styles.css','/app.js','/clanok.html','/clanok.js','/pwa.js','/analytics.js','/image-meta-public.js','/ako-pracujeme.html','/kontakt.html','/kontakt-odoslane.html','/manifest.webmanifest','/assets/app-icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('/index.html'))));
});
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch(e){
    try{data={body:event.data?event.data.text():''}}catch{data={}}
  }
  const title=String(data.title||'Objektív24');
  const options={
    body:String(data.body||'Máme pre vás novú správu.'),
    data:{url:String(data.url||'/')},
    tag:String(data.tag||('objektiv24-'+Date.now())),
    renotify:true
  };
  event.waitUntil(
    self.registration.showNotification(title,options)
      .catch(()=>self.registration.showNotification('Objektív24',{body:'Máme pre vás novú správu.',data:{url:'/'}}))
  );
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/',self.location.origin).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){
      if('focus' in client&&new URL(client.url).origin===self.location.origin){
        if('navigate' in client)client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
