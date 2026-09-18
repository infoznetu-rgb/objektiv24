(() => {
  if(window.__objektiv24PwaLoaded)return;
  window.__objektiv24PwaLoaded=true;
  if(document.querySelector('link[rel="manifest"]')===null){const m=document.createElement('link');m.rel='manifest';m.href='/manifest.webmanifest';document.head.appendChild(m)}
  if(document.querySelector('link[rel="apple-touch-icon"]')===null){const i=document.createElement('link');i.rel='apple-touch-icon';i.href='/assets/app-icon-192.svg?v=20260918-2';document.head.appendChild(i)}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js?v=20',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true,ua=navigator.userAgent||'',isIOS=/iphone|ipad|ipod/i.test(ua),isAndroid=/android/i.test(ua),isMobile=isIOS||isAndroid,isChrome=/chrome|crios/i.test(ua)&&!/edg|opr|opera/i.test(ua),isInApp=/wv|FBAN|FBAV|Instagram|WhatsApp|Messenger/i.test(ua);
  const dismissKey='objektiv24_mobile_panel_dismissed_until_v15';let deferredPrompt=null,shown=false,dockTimer=null;
  const track=type=>{if(typeof window.objektiv24Track==='function')window.objektiv24Track(type)};
  const style=document.createElement('style');style.textContent=`.pwa-install-link{cursor:pointer}.pwa-card{position:fixed;z-index:120;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(520px,calc(100% - 24px));padding:14px;border:1px solid rgba(217,255,40,.26);border-radius:24px;background:rgba(6,16,24,.98);box-shadow:0 24px 70px rgba(0,0,0,.5);backdrop-filter:blur(22px);color:#f7fafb;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.pwa-card.pwa-attention{animation:pwa-pop 1.5s ease 1}.pwa-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:3px 3px 12px}.pwa-card-head strong{display:block;font-size:1rem;line-height:1.2;margin:0}.pwa-card-head p{margin:4px 0 0;color:#94a5ae;font-size:.79rem;line-height:1.35}.pwa-card-close{flex:0 0 auto;width:34px;height:34px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(255,255,255,.04);color:#dce5e9;font:700 20px/1 system-ui;cursor:pointer}.pwa-setting-list{overflow:hidden;border:1px solid rgba(255,255,255,.09);border-radius:17px;background:rgba(255,255,255,.025)}.pwa-setting-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:11px;min-height:72px;padding:10px 11px}.pwa-setting-row+.pwa-setting-row{border-top:1px solid rgba(255,255,255,.08)}.pwa-setting-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:rgba(217,255,40,.09);font-size:1.25rem}.pwa-setting-copy{min-width:0}.pwa-setting-copy b{display:block;font-size:.9rem;line-height:1.2}.pwa-setting-copy small{display:block;margin-top:4px;color:#91a1aa;font-size:.72rem;line-height:1.3}.pwa-setting-action{min-width:82px;border:0;border-radius:11px;padding:9px 11px;background:#d9ff28;color:#061018;font:850 .76rem/1 Inter,ui-sans-serif,system-ui;cursor:pointer;white-space:nowrap}.pwa-setting-action.secondary{border:1px solid rgba(255,255,255,.13);background:transparent;color:#d3dde2}.pwa-setting-action:disabled{cursor:default;opacity:.72}.pwa-status-ok{color:#d9ff28}.pwa-card .pwa-help{margin:10px 3px 0;padding:10px 12px;border-radius:12px;background:rgba(217,255,40,.06);color:#cbd6db;font-size:.75rem;line-height:1.4}.pwa-card[hidden],.pwa-dock[hidden],.pwa-help[hidden]{display:none!important}.analytics-consent-open .pwa-card,.analytics-consent-open .pwa-dock{display:none!important}.pwa-dock{position:fixed;z-index:119;right:0;bottom:22%;border:1px solid rgba(217,255,40,.38);border-right:0;border-radius:18px 0 0 18px;background:#d9ff28;color:#061018;padding:12px 9px 12px 12px;font:850 13px/1.1 Inter,ui-sans-serif,system-ui;box-shadow:0 10px 32px rgba(0,0,0,.28);cursor:pointer;animation:pwa-dock-in .5s ease}.pwa-dock span{writing-mode:vertical-rl;transform:rotate(180deg)}.back-to-top{position:fixed;z-index:118;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid rgba(217,255,40,.38);border-radius:999px;background:rgba(6,16,24,.94);color:#f7fafb;padding:11px 15px;font:850 13px/1 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 12px 36px rgba(0,0,0,.34);backdrop-filter:blur(16px);cursor:pointer;opacity:0;visibility:hidden;transform:translateY(10px);pointer-events:none;transition:opacity .2s ease,transform .2s ease,visibility .2s ease,background .2s ease,color .2s ease}.back-to-top.is-visible{opacity:1;visibility:visible;transform:none;pointer-events:auto}.back-to-top:hover{background:#d9ff28;color:#061018}.back-to-top:focus-visible{outline:3px solid rgba(217,255,40,.5);outline-offset:3px}.back-to-top .back-to-top-arrow{font-size:1rem;line-height:1}@keyframes pwa-pop{0%,100%{transform:translateX(-50%) scale(1)}45%{transform:translateX(-50%) scale(1.018);box-shadow:0 24px 80px rgba(217,255,40,.14)}}@keyframes pwa-dock-in{from{transform:translateX(100%);opacity:0}to{transform:none;opacity:1}}@media(max-width:520px){.pwa-card{width:calc(100% - 18px);padding:10px;border-radius:20px}.pwa-card-head{padding:5px 5px 11px}.pwa-setting-row{grid-template-columns:40px minmax(0,1fr) auto;min-height:68px;padding:9px}.pwa-setting-icon{width:40px;height:40px}.pwa-setting-action{min-width:72px;padding:9px 10px}.back-to-top{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));padding:10px 13px;font-size:12px}}@media(prefers-reduced-motion:reduce){.pwa-card,.pwa-dock{animation:none!important}.back-to-top{transition:none!important}}`;document.head.appendChild(style);

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
    localStorage.removeItem('objektiv24_push_enabled');
    track('push_enabled');
    return true;
  }
  async function disablePush(){
    if(!('serviceWorker' in navigator)||!('PushManager' in window))return false;
    try{
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      if(sub){
        const endpoint=sub.endpoint;
        const response=await fetch(PUSH_API,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'unsubscribe',endpoint})
        });
        if(!response.ok)throw new Error('Subscription delete failed');
        await sub.unsubscribe();
      }
      localStorage.removeItem('objektiv24_push_enabled');
      track('push_disabled');
      return true;
    }catch(e){
      console.warn('Push disable failed',e);
      return false;
    }
  }

  async function getPushState(){
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return 'unsupported';
    if(Notification.permission==='denied')return 'blocked';
    try{
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      return sub?'enabled':'available';
    }catch(e){
      console.warn('Push state check failed',e);
      return Notification.permission==='granted'?'available':'available';
    }
  }

  function addBackToTop(){
    if(document.querySelector('[data-back-to-top],#back-to-top'))return;
    if(document.querySelector('script[src*="back-to-top.js"]'))return;
    const s=document.createElement('script');
    s.src='/back-to-top.js?v=2';
    s.defer=true;
    document.head.appendChild(s);
  }
  function bindMenuLinks(){document.querySelectorAll('.pwa-install-link').forEach(a=>{if(a.dataset.pwaBound==='1')return;a.dataset.pwaBound='1';a.addEventListener('click',e=>{e.preventDefault();openCard(true)})})}
  function card(){let el=document.querySelector('#pwa-install-card');if(el)return el;el=document.createElement('aside');el.id='pwa-install-card';el.className='pwa-card';el.hidden=true;document.body.appendChild(el);return el}
  function dock(){if(!isMobile)return null;let el=document.querySelector('#pwa-install-dock');if(el)return el;el=document.createElement('button');el.type='button';el.id='pwa-install-dock';el.className='pwa-dock';el.innerHTML='<span>'+(standalone?'🔔':'📱')+' Objektív24</span>';el.hidden=true;el.onclick=()=>openCard(true);document.body.appendChild(el);return el}
  function showDock(){const d=dock();if(isMobile&&d)d.hidden=false}
  function dismiss(el){el.hidden=true;localStorage.setItem(dismissKey,String(Date.now()+7*864e5));track('install_dismissed');showDock()}
  function fallbackHelp(){if(isIOS)return 'V Safari klepnite na Zdieľať a potom na „Pridať na plochu“.';if(isAndroid&&isInApp)return 'Otvorte stránku v Chrome a potom zvoľte „Pridať na plochu“ alebo „Nainštalovať aplikáciu“.';if(isAndroid&&isChrome)return 'V Chrome otvorte menu ⋮ a zvoľte „Pridať na plochu“ alebo „Nainštalovať aplikáciu“.';if(isAndroid)return 'Otvorte túto stránku v Chrome a v menu ⋮ zvoľte „Pridať na plochu“.';if(/edg/i.test(ua))return 'V Edge kliknite vpravo v adresnom riadku na ikonu aplikácie, prípadne otvorte menu … → Aplikácie → Nainštalovať Objektív24.';if(/chrome/i.test(ua))return 'V Chrome kliknite vpravo v adresnom riadku na ikonu inštalácie aplikácie. Ak ju nevidíte, otvorte menu ⋮ a vyhľadajte možnosť nainštalovať stránku ako aplikáciu.';return 'V menu prehliadača vyhľadajte možnosť „Nainštalovať aplikáciu“ alebo „Pridať na plochu“.'}
  async function openCard(manual=false){
    const d=dock();if(d)d.hidden=true;
    const el=card();
    const canInstall=!standalone&&!!deferredPrompt;
    const installDone=standalone;
    const help=installDone||canInstall?'':'<p class="pwa-help" hidden>'+fallbackHelp()+'</p>';
    const deviceTitle=isMobile?'Objektív24 v mobile':'Objektív24 v počítači';
    const deviceIcon=isMobile?'📱':'💻';
    const installText=installDone
      ?'Aplikácia je práve otvorená v nainštalovanom režime.'
      :(isMobile?'Rýchly prístup priamo z plochy telefónu.':'Nainštalujte Objektív24 ako samostatnú aplikáciu s ikonou na ploche alebo v ponuke Štart.');
    const installLabel=canInstall?(isMobile?'Pridať':'Nainštalovať'):'Postup';

    el.innerHTML='<div class="pwa-card-head"><div><strong>'+deviceTitle+'</strong><p>Aplikácia a upozornenia na jednom mieste. <span style="opacity:.55">v20</span></p></div><button class="pwa-card-close" type="button" aria-label="Zavrieť">×</button></div><div class="pwa-setting-list"><div class="pwa-setting-row"><span class="pwa-setting-icon" aria-hidden="true">'+deviceIcon+'</span><span class="pwa-setting-copy"><b>Aplikácia</b><small>'+installText+'</small></span>'+(installDone?'<button class="pwa-setting-action secondary" type="button" disabled>Otvorená ✓</button>':(canInstall?'<button class="pwa-setting-action pwa-install" type="button">'+installLabel+'</button>':'<button class="pwa-setting-action secondary pwa-install-help" type="button">'+installLabel+'</button>'))+'</div><div class="pwa-setting-row"><span class="pwa-setting-icon" aria-hidden="true">🔔</span><span class="pwa-setting-copy"><b>Upozornenia</b><small id="pwa-push-copy">Overujem skutočný stav odberu…</small></span><button id="pwa-push-action" class="pwa-setting-action secondary" type="button" disabled>Overujem…</button></div></div>'+help;

    el.hidden=false;
    el.classList.toggle('pwa-attention',isMobile&&!manual);
    if(!shown){track('install_offer_shown');shown=true}

    el.querySelector('.pwa-card-close').onclick=()=>dismiss(el);

    const install=el.querySelector('.pwa-install');
    if(install)install.onclick=async()=>{
      track('install_clicked');
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt=null;
      localStorage.removeItem('objektiv24_installed');
      openCard(true);
    };

    const installHelp=el.querySelector('.pwa-install-help');
    if(installHelp)installHelp.onclick=()=>{const h=el.querySelector('.pwa-help');if(h)h.hidden=!h.hidden};

    const pushAction=el.querySelector('#pwa-push-action');
    const pushCopy=el.querySelector('#pwa-push-copy');
    const pushState=await getPushState();

    if(pushState==='enabled'){
      pushCopy.textContent='Aktívny push odber je v tomto prehliadači skutočne zaregistrovaný.';
      pushAction.textContent='Vypnúť';
      pushAction.classList.remove('secondary');
      pushAction.disabled=false;
      pushAction.onclick=async()=>{
        pushAction.disabled=true;
        pushAction.textContent='Vypínam…';
        await disablePush();
        openCard(true);
      };
    }else if(pushState==='blocked'){
      pushCopy.textContent='Prehliadač má upozornenia pre Objektív24 zablokované.';
      pushAction.textContent='Blokované';
      pushAction.disabled=true;
    }else if(pushState==='unsupported'){
      pushCopy.textContent='Tento prehliadač alebo režim nepodporuje webové push upozornenia.';
      pushAction.textContent='Nepodporované';
      pushAction.disabled=true;
    }else{
      pushCopy.textContent=Notification.permission==='granted'
        ?'Povolenie existuje, ale aktívny push odber nie je zaregistrovaný.'
        :'Dostávajte upozornenia na nové dôležité články.';
      pushAction.textContent='Zapnúť';
      pushAction.classList.remove('secondary');
      pushAction.disabled=false;
      pushAction.onclick=async()=>{
        pushAction.disabled=true;
        pushAction.textContent='Zapínam…';
        try{await enablePush()}catch(e){console.warn(e)}
        openCard(true);
      };
    }

    clearTimeout(dockTimer);
    if(isMobile&&!manual)dockTimer=setTimeout(()=>{if(!el.hidden){el.hidden=true;showDock()}},12000);
  }
  localStorage.removeItem('objektiv24_installed');localStorage.removeItem('objektiv24_push_enabled');
  const visitKey='objektiv24_visit_count_v1';
  let visitCount=Math.max(0,Number(localStorage.getItem(visitKey))||0)+1;
  localStorage.setItem(visitKey,String(Math.min(99,visitCount)));
  function scheduleMobilePanel(){
    if(!isMobile)return;
    setTimeout(()=>{
      const dismissed=Number(localStorage.getItem(dismissKey))||0;
      if(document.body?.classList.contains('analytics-consent-open')){showDock();return}
      if(visitCount>=2&&Date.now()>dismissed)openCard(false);
      else showDock();
    },9000)
  }
  window.objektiv24OpenSubscriptionPanel=()=>openCard(true);
  bindMenuLinks();dock();addBackToTop();scheduleMobilePanel();
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;const existing=document.querySelector('#pwa-install-card');if(existing&&!existing.hidden)openCard(true)});
  window.addEventListener('appinstalled',()=>{track('app_installed');deferredPrompt=null;localStorage.removeItem('objektiv24_installed');const existing=document.querySelector('#pwa-install-card');if(existing&&!existing.hidden)openCard(true);showDock()});
})();