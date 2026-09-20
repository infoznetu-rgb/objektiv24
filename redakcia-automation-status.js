(() => {
  const main=document.querySelector('.editor-main');
  const health=document.querySelector('#system-health');
  if(!main||document.querySelector('#auto-articles-status'))return;

  const INGEST_URL='https://bkyappgttwjxakkwycub.supabase.co/functions/v1/github-article-ingest';
  const EDITOR_PUSH_URL='https://bkyappgttwjxakkwycub.supabase.co/functions/v1/editor-push-subscribe';
  const VAPID_PUBLIC_KEY='BMYq9N7rzvM-2Jh9IHfE3-F8St1l5KJeVjljyfXXSOX5RcMIrfsQ7TjHqhK6na4RjogySL4nCIlPhD3FIEqAkGY';
  const SCHEDULE_INTERVAL_MINUTES=15;
  const NORMAL_DELAY_MINUTES=10;
  const RUN_STALE_MINUTES=50;

  const style=document.createElement('style');
  style.textContent=`
    .auto-articles-status{display:grid;grid-template-columns:minmax(250px,1.35fr) repeat(6,minmax(125px,.7fr));gap:10px;align-items:stretch;margin:0 0 22px}
    .auto-articles-status article{border:1px solid #dde1e5;background:#fff;border-radius:12px;padding:14px 15px;min-width:0}
    .auto-articles-status .auto-main{background:#f8faea;border-color:#dbe5a1}
    .auto-articles-status .auto-warning{background:#fff7ed;border-color:#efc48c}
    .auto-articles-status .auto-danger{background:#fff0f0;border-color:#e2aaaa}
    .auto-articles-kicker{display:block;font-size:.59rem;font-weight:950;letter-spacing:.12em;color:#7b812f;margin-bottom:5px}
    .auto-articles-status strong{display:block;font-size:.9rem;color:#30333a;line-height:1.35}
    .auto-articles-status small{display:block;margin-top:5px;font-size:.66rem;color:#747982;line-height:1.45}
    .auto-run-state{display:inline-flex;align-items:center;gap:6px}.auto-run-state.ok{color:#506315}.auto-run-state.warn{color:#9a5a20}.auto-run-state.running{color:#365675}.auto-run-state.bad{color:#9a2f2f}
    .auto-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px}
    .auto-articles-refresh{border:0;background:none;padding:0;color:#50545b;text-decoration:underline;font-size:.66rem;font-weight:800;cursor:pointer}
    .editor-alert-toggle{border:1px solid #cfd7a0;border-radius:999px;padding:7px 10px;background:#fff;color:#4d5d16;font-size:.66rem;font-weight:900;cursor:pointer}
    .editor-alert-toggle.is-on{background:#d9ff28;border-color:#bfdc20;color:#243000}
    .editor-alert-toggle:disabled{opacity:.6;cursor:wait}
    .auto-meter{height:5px;margin-top:8px;border-radius:999px;background:#edf0f2;overflow:hidden}.auto-meter>i{display:block;height:100%;width:var(--w,0%);background:#a8c612;border-radius:inherit}
    .auto-meter.warn>i{background:#d28b35}.auto-meter.bad>i{background:#b84949}
    .auto-last-title{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .auto-countdown{font-variant-numeric:tabular-nums;font-size:1.05rem!important}
    .auto-problem{color:#945126!important}
    @media(max-width:1450px){.auto-articles-status{grid-template-columns:repeat(4,minmax(150px,1fr))}.auto-articles-status .auto-main{grid-column:span 2}}
    @media(max-width:900px){.auto-articles-status{grid-template-columns:1fr 1fr}.auto-articles-status .auto-main{grid-column:1/-1}}
    @media(max-width:480px){.auto-articles-status{grid-template-columns:1fr}.auto-articles-status .auto-main{grid-column:auto}}
  `;
  document.head.appendChild(style);

  const root=document.createElement('section');
  root.id='auto-articles-status';
  root.className='auto-articles-status';
  root.innerHTML=`
    <article class="auto-main" id="auto-health-card">
      <span class="auto-articles-kicker">AUTOMATICKÁ FRONTA</span>
      <strong id="auto-run-summary">Kontrolujem automatiku…</strong>
      <small id="auto-run-note">Načítavam stav priamo zo servera Objektív24.</small>
      <div class="auto-actions">
        <button id="auto-run-refresh" class="auto-articles-refresh" type="button">Obnoviť stav</button>
        <button id="editor-alert-toggle" class="editor-alert-toggle" type="button">🔔 Moje upozornenia</button>
      </div>
    </article>

    <article>
      <span class="auto-articles-kicker">FRONTA</span>
      <strong id="auto-queue">—</strong>
      <div id="auto-queue-meter" class="auto-meter"><i></i></div>
      <small id="auto-queue-note">Nevydané návrhy.</small>
    </article>

    <article>
      <span class="auto-articles-kicker">VYROBENÉ 24 H</span>
      <strong id="auto-produced">—</strong>
      <div id="auto-produced-meter" class="auto-meter"><i></i></div>
      <small id="auto-produced-note">Denná kapacita automatiky.</small>
    </article>

    <article>
      <span class="auto-articles-kicker">POSLEDNÝ NÁVRH</span>
      <strong id="auto-last-article">—</strong>
      <small id="auto-last-article-title" class="auto-last-title">Načítavam…</small>
    </article>

    <article>
      <span class="auto-articles-kicker">FILTER 24 H</span>
      <strong id="auto-filter">—</strong>
      <small id="auto-filter-note">Odmietnuté a chybné kandidáty.</small>
    </article>

    <article>
      <span class="auto-articles-kicker">POSLEDNÝ BEH</span>
      <strong id="auto-last-run">—</strong>
      <small id="auto-last-result">Načítavam…</small>
    </article>

    <article>
      <span class="auto-articles-kicker">ĎALŠIA KONTROLA</span>
      <strong id="auto-countdown" class="auto-countdown">—</strong>
      <small id="auto-next-run">Plán približne každých 15 minút.</small>
    </article>
  `;
  if(health)health.before(root);else main.prepend(root);

  const dateTimeFmt=new Intl.DateTimeFormat('sk-SK',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const timeFmt=new Intl.DateTimeFormat('sk-SK',{hour:'2-digit',minute:'2-digit'});
  let latestStatus=null;

  function nextScheduledDate(now=new Date()){
    const next=new Date(now);
    next.setSeconds(0,0);
    const minute=now.getMinutes();
    const nextMinute=(Math.floor(minute/SCHEDULE_INTERVAL_MINUTES)+1)*SCHEDULE_INTERVAL_MINUTES;
    if(nextMinute>=60){next.setHours(next.getHours()+1);next.setMinutes(0)}
    else next.setMinutes(nextMinute);
    return next;
  }

  function formatDuration(ms){
    const total=Math.max(0,Math.floor(ms/1000));
    const m=Math.floor(total/60),s=total%60;
    return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }

  function updateCountdown(){
    const now=new Date(),next=nextScheduledDate(now);
    const countdown=document.querySelector('#auto-countdown');
    const label=document.querySelector('#auto-next-run');
    if(countdown)countdown.textContent=formatDuration(next-now);
    if(label){
      const late=new Date(next.getTime()+NORMAL_DELAY_MINUTES*60000);
      label.textContent='Plán '+timeFmt.format(next)+' · bežne '+timeFmt.format(next)+'–'+timeFmt.format(late);
    }
  }

  function meter(id,value,max){
    const el=document.querySelector(id);
    if(!el)return;
    const ratio=max>0?Math.min(1,Math.max(0,value/max)):0;
    el.style.setProperty('--w',Math.round(ratio*100)+'%');
    el.classList.toggle('warn',ratio>=.75&&ratio<1);
    el.classList.toggle('bad',ratio>=1);
  }

  async function fetchServerStatus(){
    const client=window.objektiv24SupabaseClient;
    if(!client)throw new Error('Redakčný klient ešte nie je pripravený');
    const {data:{session},error}=await client.auth.getSession();
    if(error)throw error;
    if(!session?.access_token)throw new Error('Čakám na prihlásenie do Redakcie');
    const response=await fetch(INGEST_URL,{
      method:'POST',
      headers:{
        Authorization:'Bearer '+session.access_token,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({action:'status'}),
      cache:'no-store'
    });
    const text=await response.text();
    let data={};try{data=JSON.parse(text)}catch{}
    if(!response.ok)throw new Error(data.error||('Server HTTP '+response.status));
    return data;
  }

  const b64ToBytes=value=>{
    const pad='='.repeat((4-value.length%4)%4);
    const base=(value+pad).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base);
    return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
  };

  async function editorSession(){
    const client=window.objektiv24SupabaseClient;
    if(!client)throw new Error('Redakčný klient ešte nie je pripravený');
    const {data:{session},error}=await client.auth.getSession();
    if(error)throw error;
    if(!session?.access_token)throw new Error('Nie ste prihlásený v Redakcii');
    return session;
  }

  async function editorPushSubscription(create=false){
    if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){
      throw new Error('Tento prehliadač nepodporuje push upozornenia');
    }
    let permission=Notification.permission;
    if(create&&permission!=='granted')permission=await Notification.requestPermission();
    if(permission!=='granted')return null;
    await navigator.serviceWorker.register('/sw.js?v=24',{updateViaCache:'none'});
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub&&create){
      sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:b64ToBytes(VAPID_PUBLIC_KEY)
      });
    }
    return sub;
  }

  async function editorAlertRequest(action,sub){
    const session=await editorSession();
    const json=sub?.toJSON?.()||{};
    const response=await fetch(EDITOR_PUSH_URL,{
      method:'POST',
      headers:{
        Authorization:'Bearer '+session.access_token,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        action,
        endpoint:sub?.endpoint||'',
        p256dh:json.keys?.p256dh||'',
        auth:json.keys?.auth||'',
        user_agent:navigator.userAgent
      }),
      cache:'no-store'
    });
    const text=await response.text();
    let data={};try{data=JSON.parse(text)}catch{}
    if(!response.ok)throw new Error(data.error||('Server HTTP '+response.status));
    return data;
  }

  async function refreshEditorAlerts(){
    const button=document.querySelector('#editor-alert-toggle');
    if(!button)return;
    try{
      if(Notification.permission==='denied'){
        button.textContent='🔕 Upozornenia blokované';
        button.classList.remove('is-on');
        return;
      }
      const sub=await editorPushSubscription(false);
      if(!sub){
        button.textContent='🔔 Zapnúť moje upozornenia';
        button.classList.remove('is-on');
        return;
      }
      const data=await editorAlertRequest('status',sub);
      button.textContent=data.enabled?'🔔 Moje upozornenia zapnuté':'🔔 Zapnúť moje upozornenia';
      button.classList.toggle('is-on',Boolean(data.enabled));
    }catch(error){
      console.warn('Editor alert status failed',error);
      button.textContent='🔔 Moje upozornenia';
      button.classList.remove('is-on');
    }
  }

  async function toggleEditorAlerts(){
    const button=document.querySelector('#editor-alert-toggle');
    if(!button)return;
    button.disabled=true;
    try{
      const currentOn=button.classList.contains('is-on');
      if(currentOn){
        const sub=await editorPushSubscription(false);
        if(sub)await editorAlertRequest('unsubscribe',sub);
        button.classList.remove('is-on');
        button.textContent='🔔 Zapnúť moje upozornenia';
      }else{
        const sub=await editorPushSubscription(true);
        if(!sub)throw new Error('Upozornenia neboli povolené');
        await editorAlertRequest('subscribe',sub);
        button.classList.add('is-on');
        button.textContent='🔔 Moje upozornenia zapnuté';
      }
    }catch(error){
      alert('Upozornenia sa nepodarilo zmeniť: '+(error?.message||error));
      await refreshEditorAlerts();
    }finally{
      button.disabled=false;
    }
  }

  function runState(status){
    const run=status?.last_run;
    const latest=status?.latest_item;
    if(run?.created_at){
      const when=new Date(run.created_at);
      const age=Date.now()-when.getTime();
      const runStatus=String(run?.metadata?.status||'');
      if(run.event==='run_superseded'||run.level==='warning'||runStatus==='cancelled'||runStatus==='canceled'){
        return {cls:'warn',text:'● Predošlý beh nahradil novší',detail:'Novší beh prevzal spracovanie po '+dateTimeFmt.format(when)};
      }
      if(run.level==='error'||run.event==='run_failed'||(runStatus&&runStatus!=='success')){
        return {cls:'bad',text:'● Posledný beh zlyhal',detail:dateTimeFmt.format(when)};
      }
      if(age<=RUN_STALE_MINUTES*60000){
        return {cls:'ok',text:'● Automatika funguje',detail:'Potvrdené serverom '+dateTimeFmt.format(when)};
      }
      if(latest?.updated_at && Date.now()-new Date(latest.updated_at).getTime()<=RUN_STALE_MINUTES*60000){
        return {cls:'ok',text:'● Automatika pracuje',detail:'Nová aktivita '+dateTimeFmt.format(new Date(latest.updated_at))};
      }
      return {cls:'warn',text:'● Posledný beh je starší',detail:'Posledné serverové potvrdenie '+dateTimeFmt.format(when)};
    }
    if(latest?.updated_at){
      const when=new Date(latest.updated_at);
      const age=Date.now()-when.getTime();
      return age<=RUN_STALE_MINUTES*60000
        ? {cls:'ok',text:'● Automatika pracuje',detail:'Aktivita v databáze '+dateTimeFmt.format(when)}
        : {cls:'warn',text:'● Čakám na nový serverový heartbeat',detail:'Posledná aktivita '+dateTimeFmt.format(when)};
    }
    return {cls:'warn',text:'● Zatiaľ bez údajov o behu',detail:'Server je dostupný, ale nemá ešte uložený heartbeat.'};
  }

  function render(status){
    latestStatus=status;
    const pending=Number(status.pending_drafts||0);
    const queueCap=Number(status.queue_cap||15);
    const prepared=Number(status.prepared_last_24h||0);
    const dailyCap=Number(status.daily_cap||36);
    const rejected=Number(status.rejected_last_24h||0);
    const failed=Number(status.failed_last_24h||0);
    const processing=Number(status.processing_now||0);

    document.querySelector('#auto-queue').textContent=pending+' / '+queueCap;
    document.querySelector('#auto-queue-note').textContent=pending===0
      ? 'Fronta je prázdna — automatika môže dopĺňať ďalšie témy.'
      : pending+' návrhov čaká na ručnú kontrolu.';
    meter('#auto-queue-meter',pending,queueCap);

    document.querySelector('#auto-produced').textContent=prepared+' / '+dailyCap;
    document.querySelector('#auto-produced-note').textContent='Zostáva '+Math.max(0,dailyCap-prepared)+' miest · publikované za 24 h: '+Number(status.published_last_24h||0)+'.';
    meter('#auto-produced-meter',prepared,dailyCap);

    const latest=status.latest_drafted;
    const lastTime=document.querySelector('#auto-last-article');
    const lastTitle=document.querySelector('#auto-last-article-title');
    if(latest?.updated_at){
      lastTime.textContent=dateTimeFmt.format(new Date(latest.updated_at));
      lastTitle.textContent=latest.source_title||'Automaticky pripravený návrh';
    }else{
      lastTime.textContent='Žiadny záznam';
      lastTitle.textContent='Automatika zatiaľ neeviduje pripravený návrh.';
    }

    document.querySelector('#auto-filter').textContent=rejected+(failed?' + '+failed+' chýb':' odmietnutých');
    const problem=status.problem_sources?.[0];
    const filterNote=document.querySelector('#auto-filter-note');
    if(problem){
      filterNote.textContent='Najviac odpadáva: '+problem.source_name+' ('+problem.count+').'+(processing?' Spracúva sa: '+processing+'.':'');
      filterNote.classList.add('auto-problem');
    }else{
      filterNote.textContent='QA filter nemá výrazný problémový zdroj.'+(processing?' Spracúva sa: '+processing+'.':'');
      filterNote.classList.remove('auto-problem');
    }

    const run=runState(status);
    const summary=document.querySelector('#auto-run-summary');
    const note=document.querySelector('#auto-run-note');
    const card=document.querySelector('#auto-health-card');
    summary.className='auto-run-state '+run.cls;
    summary.textContent=run.text;
    card.classList.remove('auto-warning','auto-danger');
    if(run.cls==='warn')card.classList.add('auto-warning');
    if(run.cls==='bad')card.classList.add('auto-danger');

    const capacity='Fronta '+pending+'/'+queueCap+' · výroba '+prepared+'/'+dailyCap+' za 24 h.';
    note.textContent=run.detail+'. '+capacity+' Automatika iba pripravuje návrhy; publikovanie zostáva ručné.';

    const lastRun=document.querySelector('#auto-last-run');
    const lastResult=document.querySelector('#auto-last-result');
    if(status.last_run?.created_at){
      lastRun.textContent=dateTimeFmt.format(new Date(status.last_run.created_at));
      const mode=String(status.last_run?.metadata?.run_mode||'');
      lastResult.textContent=(status.last_run.event==='run_failed'?'Beh skončil chybou.':status.last_run.event==='run_superseded'?'Beh bol nahradený novším spustením.':'Serverový heartbeat prijatý.')+(mode==='false'?' Fronta/limit nevyžadovali AI.':'');
    }else if(status.latest_item?.updated_at){
      lastRun.textContent=dateTimeFmt.format(new Date(status.latest_item.updated_at));
      lastResult.textContent='Do prvého heartbeat-u zobrazujem poslednú aktivitu databázy.';
    }else{
      lastRun.textContent='—';
      lastResult.textContent='Čakám na prvý zaznamenaný beh.';
    }
  }

  async function refresh(){
    updateCountdown();
    const summary=document.querySelector('#auto-run-summary');
    if(summary)summary.textContent='Kontrolujem automatiku…';
    try{
      const status=await fetchServerStatus();
      render(status);
    }catch(error){
      const card=document.querySelector('#auto-health-card');
      card.classList.remove('auto-danger');
      card.classList.add('auto-warning');
      summary.className='auto-run-state warn';
      summary.textContent='● Panel sa nepodarilo načítať';
      document.querySelector('#auto-run-note').textContent=(error?.message||String(error))+'. Toto samo osebe neznamená, že automatika zlyhala.';
    }
  }

  document.querySelector('#auto-run-refresh')?.addEventListener('click',refresh);
  document.querySelector('#editor-alert-toggle')?.addEventListener('click',toggleEditorAlerts);
  updateCountdown();
  refresh();
  setTimeout(refreshEditorAlerts,1200);
  setInterval(updateCountdown,1000);
  setInterval(refresh,5*60*1000);
  window.addEventListener('objektiv24-editor-ready',()=>{refresh();refreshEditorAlerts()});
  window.addEventListener('objektiv24-workspace-saved',()=>{ if(!latestStatus) refresh(); },{once:true});
})();