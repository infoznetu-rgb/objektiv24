(() => {
  if(document.querySelector('link[rel="manifest"]')===null){const m=document.createElement('link');m.rel='manifest';m.href='/manifest.webmanifest';document.head.appendChild(m)}
  if(document.querySelector('link[rel="apple-touch-icon"]')===null){const i=document.createElement('link');i.rel='apple-touch-icon';i.href='/assets/app-icon.svg';document.head.appendChild(i)}
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});

  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const dismissKey='objektiv24_install_dismissed_until';
  const visitKey='objektiv24_visit_count';
  let deferredPrompt=null,shown=false;
  const track=type=>{if(typeof window.objektiv24Track==='function')window.objektiv24Track(type)};
  const style=document.createElement('style');style.textContent=`
    .pwa-install-link{cursor:pointer}.pwa-card{position:fixed;z-index:120;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(560px,calc(100% - 28px));padding:18px 18px 16px;border:1px solid rgba(217,255,40,.28);border-radius:20px;background:rgba(6,16,24,.96);box-shadow:0 24px 70px rgba(0,0,0,.45);backdrop-filter:blur(20px);color:#f7fafb;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.pwa-card strong{display:block;font-size:1.05rem;margin-bottom:5px}.pwa-card p{margin:0;color:#aebac1;font-size:.86rem;line-height:1.45}.pwa-actions{display:flex;gap:10px;margin-top:14px;align-items:center}.pwa-actions button{border:0;border-radius:12px;padding:10px 14px;font-weight:850;cursor:pointer}.pwa-install{background:#d9ff28;color:#061018}.pwa-later{background:transparent;color:#b8c4cb;border:1px solid rgba(255,255,255,.13)!important}.pwa-card .pwa-ios{margin-top:10px;color:#d8e1e5}.pwa-card[hidden]{display:none!important}@media(max-width:520px){.pwa-card{padding:16px}.pwa-actions{align-items:stretch}.pwa-actions button{flex:1}}
  `;document.head.appendChild(style);

  function addMenuLink(){document.querySelectorAll('.nav-inner').forEach(nav=>{if(nav.querySelector('.pwa-install-link'))return;const a=document.createElement('a');a.href='#';a.className='pwa-install-link';a.textContent=standalone?'Objektív24 v mobile ✓':'Objektív24 v mobile';a.addEventListener('click',e=>{e.preventDefault();openCard(true)});const motto=nav.querySelector('.nav-motto');motto?nav.insertBefore(a,motto):nav.appendChild(a)})}
  function card(){let el=document.querySelector('#pwa-install-card');if(el)return el;el=document.createElement('aside');el.id='pwa-install-card';el.className='pwa-card';el.hidden=true;el.setAttribute('aria-live','polite');document.body.appendChild(el);return el}
  function dismiss(el){el.hidden=true;localStorage.setItem(dismissKey,String(Date.now()+30*864e5));track('install_dismissed')}
  function openCard(manual=false){
    if(standalone){if(manual){const el=card();el.innerHTML='<strong>Objektív24 už máte v mobile</strong><p>Otvárať ho môžete priamo z plochy zariadenia.</p><div class="pwa-actions"><button class="pwa-later">Zavrieť</button></div>';el.hidden=false;el.querySelector('button').onclick=()=>el.hidden=true}return}
    const el=card();
    const iosHelp=isIOS&&!deferredPrompt?'<p class="pwa-ios">Na iPhone/iPade: v Safari klepnite na Zdieľať a potom na „Pridať na plochu“.</p>':'';
    const canInstall=!!deferredPrompt;
    el.innerHTML='<strong>Objektív24 poruke</strong><p>Ak chcete, môžete si Objektív24 pridať do mobilu a otvárať ho priamo z plochy.</p>'+iosHelp+'<div class="pwa-actions">'+(canInstall?'<button class="pwa-install">Pridať do mobilu</button>':'')+'<button class="pwa-later">'+(manual&&!canInstall?'Zavrieť':'Teraz nie')+'</button></div>';
    el.hidden=false;if(!shown){track('install_offer_shown');shown=true}
    el.querySelector('.pwa-later').onclick=()=>dismiss(el);
    const install=el.querySelector('.pwa-install');if(install)install.onclick=async()=>{track('install_clicked');deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;el.hidden=true};
  }

  addMenuLink();
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;addMenuLink();const count=Math.min(99,(Number(localStorage.getItem(visitKey))||0)+1);localStorage.setItem(visitKey,String(count));const dismissed=Number(localStorage.getItem(dismissKey))||0;if(!standalone&&Date.now()>dismissed&&(count>=2)){setTimeout(()=>openCard(false),45000)}});
  window.addEventListener('appinstalled',()=>{track('app_installed');deferredPrompt=null;const el=document.querySelector('#pwa-install-card');if(el)el.hidden=true;localStorage.setItem('objektiv24_installed','1')});
})();
