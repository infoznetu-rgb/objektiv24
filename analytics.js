(() => {
  const URL='https://bkyappgttwjxakkwycub.supabase.co';
  const KEY='sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4';
  const VISITOR_KEY='objektiv24_visitor_id';
  const CONSENT_KEY='objektiv24_analytics_consent';
  let started=false,id='';
  const noop=()=>Promise.resolve();
  window.objektiv24Track=noop;

  function visitorId(){
    let value=localStorage.getItem(VISITOR_KEY);
    if(!value){
      value=crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
      localStorage.setItem(VISITOR_KEY,value);
    }
    return value;
  }

  function articleSlug(){
    const q=new URLSearchParams(location.search);
    if(q.get('slug'))return q.get('slug');
    const match=location.pathname.match(/^\/clanky\/([^/]+)\/?$/i);
    if(match){
      try{return decodeURIComponent(match[1])}catch{return match[1]}
    }
    return null;
  }

  let ref='';
  try{ref=document.referrer?new URL(document.referrer).hostname:''}catch{}
  const slug=articleSlug();

  function cleanLabel(value){
    const text=String(value??'').trim();
    return text?text.slice(0,200):null;
  }

  function send(eventType,eventLabel){
    if(localStorage.getItem(CONSENT_KEY)!=='yes')return noop();
    return fetch(URL+'/rest/v1/site_events',{
      method:'POST',
      keepalive:true,
      headers:{
        apikey:KEY,
        Authorization:'Bearer '+KEY,
        'Content-Type':'application/json',
        Prefer:'return=minimal'
      },
      body:JSON.stringify({
        path:(location.pathname+location.search).slice(0,500),
        article_slug:slug,
        referrer:ref||null,
        visitor_id:id||visitorId(),
        event_type:String(eventType||'page_view').slice(0,80),
        event_label:cleanLabel(eventLabel)
      })
    }).catch(()=>{});
  }

  function start(){
    if(started)return;
    started=true;
    id=visitorId();
    window.objektiv24Track=send;
    send('page_view');
    if(slug)send('article_open',slug);
  }

  function removeBanner(){document.querySelector('#analytics-consent')?.remove()}
  function choose(value){
    localStorage.setItem(CONSENT_KEY,value);
    removeBanner();
    if(value==='yes')start();
    else{
      localStorage.removeItem(VISITOR_KEY);
      window.objektiv24Track=noop;
    }
  }

  function showBanner(force=false){
    if(document.querySelector('#analytics-consent'))return;
    if(!force&&localStorage.getItem(CONSENT_KEY))return;

    if(!document.querySelector('#analytics-consent-style')){
      const style=document.createElement('style');
      style.id='analytics-consent-style';
      style.textContent='.analytics-consent{position:fixed;z-index:200;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(720px,calc(100% - 28px));padding:16px 18px;border:1px solid rgba(217,255,40,.3);border-radius:18px;background:rgba(6,16,24,.97);color:#f7fafb;box-shadow:0 20px 60px rgba(0,0,0,.48);backdrop-filter:blur(18px);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.analytics-consent p{margin:0;color:#b7c2c8;font-size:.82rem;line-height:1.5}.analytics-consent a{color:#d9ff28}.analytics-consent-actions{display:flex;gap:9px;margin-top:12px;flex-wrap:wrap}.analytics-consent button{border-radius:11px;padding:9px 13px;font-weight:850;cursor:pointer}.analytics-consent .allow{border:0;background:#d9ff28;color:#061018}.analytics-consent .deny{border:1px solid rgba(255,255,255,.18);background:transparent;color:#e8eef1}@media(max-width:520px){.analytics-consent{padding:14px}.analytics-consent-actions button{flex:1}}';
      document.head.appendChild(style);
    }

    const box=document.createElement('aside');
    box.id='analytics-consent';
    box.className='analytics-consent';
    box.setAttribute('aria-label','Nastavenie analytiky');
    box.innerHTML='<p><strong>Meranie návštevnosti</strong><br>Po vašom súhlase meriame základnú návštevnosť a anonymné interakcie, napríklad dočítanie článku, kliknutie na rubriku alebo zdieľanie. Text zadaný do vyhľadávania neukladáme. <a href="/ako-pracujeme.html#sukromie">Viac o súkromí</a>.</p><div class="analytics-consent-actions"><button class="allow" type="button">Povoliť</button><button class="deny" type="button">Odmietnuť</button></div>';
    box.querySelector('.allow').onclick=()=>choose('yes');
    box.querySelector('.deny').onclick=()=>choose('no');
    document.body.appendChild(box);
  }

  window.objektiv24PrivacySettings=()=>showBanner(true);
  const consent=localStorage.getItem(CONSENT_KEY);
  if(consent==='yes')start();
  else{
    localStorage.removeItem(VISITOR_KEY);
    if(consent!=='no')showBanner();
  }
})();

(() => {
  if(document.querySelector('script[data-image-meta-public]'))return;
  const s=document.createElement('script');
  s.src='/image-meta-public.js?v=20260917-1';
  s.defer=true;
  s.dataset.imageMetaPublic='1';
  document.head.appendChild(s);
})();