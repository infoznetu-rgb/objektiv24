(() => {
  const URL='https://bkyappgttwjxakkwycub.supabase.co';
  const KEY='sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4';
  const VISITOR_KEY='objektiv24_visitor_id';
  const CONSENT_KEY='objektiv24_analytics_consent';
  let started=false,id='',engagedSent=false,engagedSeconds=0,engagementTimer=null,vitalsStarted=false;
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
    startWebVitals();

    engagementTimer=setInterval(()=>{
      if(document.visibilityState!=='visible'||engagedSent)return;
      engagedSeconds++;
      if(engagedSeconds>=30){
        engagedSent=true;
        send('engaged_30s',slug||location.pathname);
        clearInterval(engagementTimer);
        engagementTimer=null;
      }
    },1000);
  }

  function removeBanner(){document.querySelector('#analytics-consent')?.remove();document.body?.classList.remove('analytics-consent-open')}
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
    document.body?.classList.add('analytics-consent-open');
    document.body.appendChild(box);
  }


  function startWebVitals(){
    if(vitalsStarted||!('PerformanceObserver' in window))return;
    vitalsStarted=true;

    const device=matchMedia('(max-width: 680px)').matches?'mobile':'desktop';
    let lcp=0,cls=0,inp=0;
    let lcpSent=false,clsSent=false,inpSent=false;

    const label=(value)=>String(value)+'|'+device;
    const once=(type,value,flag)=>{
      if(!Number.isFinite(value)||value<0)return flag;
      send(type,label(value));
      return true;
    };

    try{
      const po=new PerformanceObserver(list=>{
        const entries=list.getEntries();
        const last=entries[entries.length-1];
        if(last)lcp=Math.max(lcp,Math.round(last.startTime||0));
      });
      po.observe({type:'largest-contentful-paint',buffered:true});
    }catch{}

    try{
      const po=new PerformanceObserver(list=>{
        for(const entry of list.getEntries()){
          if(!entry.hadRecentInput)cls+=Number(entry.value||0);
        }
      });
      po.observe({type:'layout-shift',buffered:true});
    }catch{}

    try{
      const po=new PerformanceObserver(list=>{
        for(const entry of list.getEntries()){
          inp=Math.max(inp,Math.round(Number(entry.duration||0)));
        }
      });
      po.observe({type:'event',buffered:true,durationThreshold:40});
    }catch{}

    const sendLcp=()=>{if(!lcpSent&&lcp>0)lcpSent=once('web_vital_lcp',lcp,lcpSent)};
    const sendFinal=()=>{
      sendLcp();
      if(!clsSent)clsSent=once('web_vital_cls',Math.round(cls*1000),clsSent);
      if(!inpSent&&inp>0)inpSent=once('web_vital_inp',inp,inpSent);
    };

    addEventListener('pointerdown',sendLcp,{once:true,passive:true});
    addEventListener('keydown',sendLcp,{once:true,passive:true});
    addEventListener('pagehide',sendFinal,{once:true});
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='hidden')sendFinal();
    });
  }

  document.addEventListener('click',event=>{
    const tracked=event.target.closest?.('[data-track-event]');
    if(tracked){
      send(tracked.dataset.trackEvent,tracked.dataset.trackLabel||null);
    }

    const link=event.target.closest?.('.article-sources a[href]');
    if(!link)return;
    try{
      const u=new URL(link.href,location.href);
      if(/^https?:$/.test(u.protocol)&&u.hostname&&u.hostname!==location.hostname){
        send('official_source_click',u.hostname.replace(/^www\./,''));
      }
    }catch{}
  },{capture:true});

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