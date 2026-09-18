(() => {
  if(document.querySelector('link[rel="manifest"]')===null){const m=document.createElement('link');m.rel='manifest';m.href='/manifest.webmanifest';document.head.appendChild(m)}
  if(document.querySelector('link[rel="apple-touch-icon"]')===null){const i=document.createElement('link');i.rel='apple-touch-icon';i.href='/assets/app-icon-192.svg?v=20260918-2';document.head.appendChild(i)}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js?v=12',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true,ua=navigator.userAgent||'',isIOS=/iphone|ipad|ipod/i.test(ua),isAndroid=/android/i.test(ua),isMobile=isIOS||isAndroid||matchMedia('(max-width: 760px)').matches,isChrome=/chrome|crios/i.test(ua)&&!/edg|opr|opera/i.test(ua),isInApp=/wv|FBAN|FBAV|Instagram|WhatsApp|Messenger/i.test(ua);
  const dismissKey='objektiv24_install_dismissed_until',visitKey='objektiv24_visit_count';let deferredPrompt=null,shown=false,dockTimer=null;
  const track=type=>{if(typeof window.objektiv24Track==='function')window.objektiv24Track(type)};
  const style=document.createElement('style');style.textContent=`.pwa-install-link{cursor:pointer}.pwa-card{position:fixed;z-index:120;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(560px,calc(100% - 28px));padding:18px;border:1px solid rgba(217,255,40,.32);border-radius:20px;background:rgba(6,16,24,.97);box-shadow:0 24px 70px rgba(0,0,0,.45);backdrop-filter:blur(20px);color:#f7fafb;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.pwa-card.pwa-attention{animation:pwa-pop 1.8s ease 2}.pwa-card strong{display:block;font-size:1.05rem;margin-bottom:5px}.pwa-card p{margin:0;color:#aebac1;font-size:.86rem;line-height:1.45}.pwa-card .pwa-help{margin-top:10px;color:#d8e1e5}.pwa-actions{display:flex;gap:10px;margin-top:14px}.pwa-actions button{border:0;border-radius:12px;padding:10px 14px;font-weight:850;cursor:pointer}.pwa-install{background:#d9ff28;color:#061018}.pwa-later{background:transparent;color:#b8c4cb;border:1px solid rgba(255,255,255,.13)!important}.pwa-card[hidden],.pwa-dock[hidden]{display:none!important}.pwa-dock{position:fixed;z-index:119;right:0;bottom:22%;border:1px solid rgba(217,255,40,.38);border-right:0;border-radius:18px 0 0 18px;background:#d9ff28;color:#061018;padding:12px 9px 12px 12px;font:850 13px/1.1 Inter,ui-sans-serif,system-ui;box-shadow:0 10px 32px rgba(0,0,0,.28);cursor:pointer;animation:pwa-dock-in .5s ease}.pwa-dock span{writing-mode:vertical-rl;transform:rotate(180deg)}.back-to-top{position:fixed;z-index:118;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid rgba(217,255,40,.38);border-radius:999px;background:rgba(6,16,24,.94);color:#f7fafb;padding:11px 15px;font:850 13px/1 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 12px 36px rgba(0,0,0,.34);backdrop-filter:blur(16px);cursor:pointer;opacity:0;visibility:hidden;transform:translateY(10px);pointer-events:none;transition:opacity .2s ease,transform .2s ease,visibility .2s ease,background .2s ease,color .2s ease}.back-to-top.is-visible{opacity:1;visibility:visible;transform:none;pointer-events:auto}.back-to-top:hover{background:#d9ff28;color:#061018}.back-to-top:focus-visible{outline:3px solid rgba(217,255,40,.5);outline-offset:3px}.back-to-top .back-to-top-arrow{font-size:1rem;line-height:1}@keyframes pwa-pop{0%,100%{transform:translateX(-50%) scale(1)}45%{transform:translateX(-50%) scale(1.025);box-shadow:0 24px 80px rgba(217,255,40,.16)}}@keyframes pwa-dock-in{from{transform:translateX(100%);opacity:0}to{transform:none;opacity:1}}@media(max-width:520px){.pwa-card{padding:16px}.pwa-actions button{flex:1}.back-to-top{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));padding:10px 13px;font-size:12px}}@media(prefers-reduced-motion:reduce){.pwa-card,.pwa-dock{animation:none!important}.back-to-top{transition:none!important}}`;document.head.appendChild(style);

  // Web Push support. The public VAPID key is intentionally public; the private key stays in Supabase secrets.
  const PUSH_API='https://bkyappgttwjxakkwycub.supabase.co/functions/v1/push-subscribe';
  const VAPID_PUBLIC_KEY='BMYq9N7rzvM-2Jh9IHfE3-F8St1l5KJeVjljyfXXSOX5RcMIrfsQ7TjHqhK6na4RjogySL4nCIlPhD3FIEqAkGY';
  const b64ToBytes=value=>{const pad='='.repeat((4-value.length%4)%4),base=(value+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base);return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)))};
  async function enablePush(){
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw new Error('Push not supported');
    if(VAPID_PUBLIC_KEY.startsWith('__'))throw new Error('Push is not configured yet');
    const permission=await Notification.requestPermission();
    if(permission!=='granted')return false;
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(VAPID_PUBLIC_KEY)});
    const json=sub.toJSON();
    const response=await fetch(PUSH_API,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({endpoint:sub.endpoint,p256dh:json.keys?.p256dh||'',auth:json.keys?.auth||'',user_agent:navigator.userAgent})
    });
    if(!response.ok)throw new Error('Subscription save failed');
    localStorage.setItem('objektiv24_push_enabled','1');
    track('push_enabled');
    return true;
  }
  function addPushButton(){
    if(!isMobile||!('PushManager' in window)||document.querySelector('#push-enable'))return;
    const button=document.createElement('button');button.type='button';button.id='push-enable';button.className='pwa-dock';button.style.bottom='34%';button.innerHTML='<span>🔔 Upozornenia</span>';
    button.addEventListener('click',async()=>{button.disabled=true;try{const ok=await enablePush();button.innerHTML='<span>'+(ok?'🔔 Zapnuté':'🔕 Nepovolené')+'</span>'}catch(e){console.warn(e);button.innerHTML='<span>🔔 Upozornenia</span>'}finally{button.disabled=false}});
    document.body.appendChild(button);
  }

  function addBackToTop(){
    if(document.querySelector('[data-back-to-top],#back-to-top'))return;
    if(document.querySelector('script[src*="back-to-top.js"]'))return;
    const s=document.createElement('script');
    s.src='/back-to-top.js?v=2';
    s.defer=true;
    document.head.appendChild(s);
  }
  function addEditorLink(){document.querySelectorAll('.nav-inner').forEach(nav=>{if(nav.querySelector('.editor-link'))return;const a=document.createElement('a');a.href='redakcia.html';a.className='editor-link';a.textContent='Redakcia';const motto=nav.querySelector('.nav-motto');motto?nav.insertBefore(a,motto):nav.appendChild(a)})}
  function addMenuLink(){document.querySelectorAll('.nav-inner').forEach(nav=>{if(nav.querySelector('.pwa-install-link'))return;const a=document.createElement('a');a.href='#';a.className='pwa-install-link';a.textContent=standalone?'Objektív24 '+(isMobile?'v mobile':'v počítači')+' ✓':'Objektív24 '+(isMobile?'v mobile':'v počítači');a.addEventListener('click',e=>{e.preventDefault();openCard(true)});const motto=nav.querySelector('.nav-motto');motto?nav.insertBefore(a,motto):nav.appendChild(a)})}
  function card(){let el=document.querySelector('#pwa-install-card');if(el)return el;el=document.createElement('aside');el.id='pwa-install-card';el.className='pwa-card';el.hidden=true;document.body.appendChild(el);return el}
  function dock(){if(!isMobile)return null;let el=document.querySelector('#pwa-install-dock');if(el)return el;el=document.createElement('button');el.type='button';el.id='pwa-install-dock';el.className='pwa-dock';el.innerHTML='<span>📱 Do mobilu</span>';el.hidden=true;el.onclick=()=>openCard(true);document.body.appendChild(el);return el}
  function showDock(){const d=dock();if(isMobile&&!standalone&&d)d.hidden=false}
  function dismiss(el){el.hidden=true;localStorage.setItem(dismissKey,String(Date.now()+30*864e5));track('install_dismissed');showDock()}
  function fallbackHelp(){if(isIOS)return 'V Safari klepnite na Zdieľať a potom na „Pridať na plochu“.';if(isAndroid&&isInApp)return 'Otvorte stránku v Chrome a potom zvoľte „Pridať na plochu“ alebo „Nainštalovať aplikáciu“.';if(isAndroid&&isChrome)return 'V Chrome otvorte menu ⋮ a zvoľte „Pridať na plochu“ alebo „Nainštalovať aplikáciu“.';if(isAndroid)return 'Otvorte túto stránku v Chrome a v menu ⋮ zvoľte „Pridať na plochu“.';return 'V menu prehliadača vyhľadajte „Nainštalovať aplikáciu“.'}
  function openCard(manual=false){const d=dock();if(d)d.hidden=true;if(standalone)return;const el=card(),canInstall=!!deferredPrompt,device=isMobile?'mobilu':'počítača',help=canInstall?'':'<p class="pwa-help">'+fallbackHelp()+'</p>';el.innerHTML='<strong>Objektív24 poruke</strong><p>Pridajte si Objektív24 do '+device+' a otvárajte ho jedným kliknutím.</p>'+help+'<div class="pwa-actions">'+(canInstall?'<button class="pwa-install">Pridať do '+device+'</button>':'')+'<button class="pwa-later">'+(manual&&!canInstall?'Rozumiem':'Teraz nie')+'</button></div>';el.hidden=false;el.classList.toggle('pwa-attention',isMobile&&!manual);if(!shown){track('install_offer_shown');shown=true}el.querySelector('.pwa-later').onclick=()=>dismiss(el);const install=el.querySelector('.pwa-install');if(install)install.onclick=async()=>{track('install_clicked');deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;el.hidden=true};clearTimeout(dockTimer);if(isMobile&&!manual)dockTimer=setTimeout(()=>{if(!el.hidden){el.hidden=true;showDock()}},9000)}
  addEditorLink();addMenuLink();dock();addBackToTop();addPushButton();
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(!isMobile)return;const count=Math.min(99,(Number(localStorage.getItem(visitKey))||0)+1);localStorage.setItem(visitKey,String(count));const dismissed=Number(localStorage.getItem(dismissKey))||0;if(!standalone&&Date.now()>dismissed&&count>=2)setTimeout(()=>openCard(false),12000)});
  window.addEventListener('appinstalled',()=>{track('app_installed');deferredPrompt=null;card().hidden=true;const d=dock();if(d)d.hidden=true;localStorage.setItem('objektiv24_installed','1')});
})();