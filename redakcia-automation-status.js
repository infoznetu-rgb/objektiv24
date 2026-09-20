(() => {
  const main=document.querySelector('.editor-main');
  const health=document.querySelector('#system-health');
  if(!main||document.querySelector('#auto-articles-status'))return;

  const PUBLIC_SUPABASE_URL='https://bkyappgttwjxakkwycub.supabase.co';
  const PUBLIC_SUPABASE_KEY='sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4';
  const AUTO_WORKFLOW='.github/workflows/auto-articles.yml';
  const SCHEDULE_INTERVAL_MINUTES=15;
  const NORMAL_DELAY_MINUTES=10;
  const RUN_STALE_MINUTES=55;

  const style=document.createElement('style');
  style.textContent=`
    .auto-articles-status{display:grid;grid-template-columns:minmax(0,1.35fr) repeat(4,minmax(135px,.72fr));gap:10px;align-items:stretch;margin:0 0 22px}
    .auto-articles-status article{border:1px solid #dde1e5;background:#fff;border-radius:12px;padding:14px 15px;min-width:0}
    .auto-articles-status .auto-main{background:#f8faea;border-color:#dbe5a1}
    .auto-articles-status .auto-warning{background:#fff7ed;border-color:#efc48c}
    .auto-articles-status .auto-danger{background:#fff0f0;border-color:#e2aaaa}
    .auto-articles-kicker{display:block;font-size:.59rem;font-weight:950;letter-spacing:.12em;color:#7b812f;margin-bottom:5px}
    .auto-articles-status strong{display:block;font-size:.9rem;color:#30333a;line-height:1.35}
    .auto-articles-status small{display:block;margin-top:5px;font-size:.66rem;color:#747982;line-height:1.45}
    .auto-run-state{display:inline-flex;align-items:center;gap:6px}.auto-run-state.ok{color:#506315}.auto-run-state.warn{color:#9a5a20}.auto-run-state.running{color:#365675}.auto-run-state.bad{color:#9a2f2f}
    .auto-articles-refresh{margin-top:8px;border:0;background:none;padding:0;color:#50545b;text-decoration:underline;font-size:.66rem;font-weight:800;cursor:pointer}
    .auto-times{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.auto-time-chip{display:inline-flex;border-radius:999px;background:#eef0f2;padding:4px 7px;font-size:.62rem;font-weight:800;color:#555a63}
    .auto-last-title{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .auto-countdown{font-variant-numeric:tabular-nums;font-size:1.05rem!important}
    @media(max-width:1180px){.auto-articles-status{grid-template-columns:1fr 1fr 1fr}.auto-articles-status .auto-main{grid-column:1/-1}}
    @media(max-width:720px){.auto-articles-status{grid-template-columns:1fr 1fr}}
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
      <small id="auto-run-note">Každých 15 minút sa kontrolujú zdroje a bezpečné témy sa ukladajú ako návrhy do Redakcie. Nič sa už automaticky nepublikuje. Limit je 12 pripravených návrhov za 24 hodín.</small>
      <button id="auto-run-refresh" class="auto-articles-refresh" type="button">Obnoviť stav</button>
    </article>

    <article>
      <span class="auto-articles-kicker">DRAFTY NA ÚPRAVU</span>
      <strong id="auto-today-count">—</strong>
      <div id="auto-today-times" class="auto-times"></div>
      <small id="auto-today-note">Načítavam pripravené návrhy…</small>
    </article>

    <article>
      <span class="auto-articles-kicker">POSLEDNÝ DRAFT</span>
      <strong id="auto-last-article">—</strong>
      <small id="auto-last-article-title" class="auto-last-title">Načítavam…</small>
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

  let latestWorkflowRun=null;
  let todayArticles=[];
  let countdownTimer=null;

  function nextScheduledDate(now=new Date()){
    const next=new Date(now);
    next.setSeconds(0,0);
    const minute=now.getMinutes();
    const nextMinute=(Math.floor(minute/SCHEDULE_INTERVAL_MINUTES)+1)*SCHEDULE_INTERVAL_MINUTES;
    if(nextMinute>=60){
      next.setHours(next.getHours()+1);
      next.setMinutes(0);
    }else{
      next.setMinutes(nextMinute);
    }
    return next;
  }

  function formatDuration(ms){
    const total=Math.max(0,Math.floor(ms/1000));
    const h=Math.floor(total/3600);
    const m=Math.floor((total%3600)/60);
    const s=total%60;
    return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }

  function updateCountdown(){
    const now=new Date();
    const next=nextScheduledDate(now);
    const countdown=document.querySelector('#auto-countdown');
    const label=document.querySelector('#auto-next-run');
    if(countdown)countdown.textContent=formatDuration(next-now);
    if(label){
      const late=new Date(next.getTime()+NORMAL_DELAY_MINUTES*60000);
      label.textContent='Plán '+timeFmt.format(next)+' · reálne približne '+timeFmt.format(next)+'–'+timeFmt.format(late);
    }
  }

  function runLabel(run){
    if(!run)return {cls:'bad',text:'● Beh sa nenašiel',detail:'Skontrolujte GitHub Actions.'};
    const started=new Date(run.created_at);
    const age=Date.now()-started.getTime();
    if(run.status!=='completed')return {cls:'running',text:'● Automatika práve beží',detail:'Spustené '+dateTimeFmt.format(started)};
    if(age>RUN_STALE_MINUTES*60000)return {cls:'bad',text:'● Automatika pravdepodobne mešká',detail:'Posledný beh bol '+dateTimeFmt.format(new Date(run.updated_at||run.created_at))};
    if(run.conclusion==='success')return {cls:'ok',text:'● Automatika funguje',detail:'Posledný beh dokončený '+dateTimeFmt.format(new Date(run.updated_at||run.created_at))};
    return {cls:'bad',text:'● Posledný beh zlyhal',detail:String(run.conclusion||'neznámy stav')+' · '+dateTimeFmt.format(new Date(run.updated_at||run.created_at))};
  }

  function localMidnightIso(){
    const d=new Date();
    d.setHours(0,0,0,0);
    return d.toISOString();
  }

  async function fetchTodayArticles(){
    const query=new URLSearchParams();
    query.set('state','eq.draft');
    query.set('select','id,title,created_at,updated_at');
    query.set('order','updated_at.desc');
    query.set('limit','100');
    const response=await fetch(PUBLIC_SUPABASE_URL+'/rest/v1/drafts?'+query.toString(),{
      headers:{
        apikey:PUBLIC_SUPABASE_KEY,
        Authorization:'Bearer '+PUBLIC_SUPABASE_KEY,
        Accept:'application/json'
      },
      cache:'no-store'
    });
    if(!response.ok)throw new Error('Databáza HTTP '+response.status);
    const rows=await response.json();
    return Array.isArray(rows)?rows:[];
  }

  function renderTodayArticles(rows){
    todayArticles=rows;
    const count=document.querySelector('#auto-today-count');
    const times=document.querySelector('#auto-today-times');
    const note=document.querySelector('#auto-today-note');
    const lastTime=document.querySelector('#auto-last-article');
    const lastTitle=document.querySelector('#auto-last-article-title');

    if(count)count.textContent=String(rows.length);
    if(times){
      times.innerHTML='';
      rows.slice(0,8).reverse().forEach(row=>{
        const when=row.updated_at||row.created_at;
        if(!when)return;
        const chip=document.createElement('span');
        chip.className='auto-time-chip';
        chip.textContent=timeFmt.format(new Date(when));
        chip.title=row.title||'Pripravený draft';
        times.appendChild(chip);
      });
    }

    if(!rows.length){
      if(note)note.textContent='Fronta je prázdna — automatika hľadá ďalšiu použiteľnú tému.';
      if(lastTime)lastTime.textContent='Žiadny draft';
      if(lastTitle)lastTitle.textContent='Nové témy sa ukladajú sem na ručnú úpravu, nie priamo na web.';
      return;
    }

    const latest=rows[0];
    const preparedAt=new Date(latest.updated_at||latest.created_at);
    if(note)note.textContent=rows.length===1?'1 návrh čaká na úpravu':rows.length+' návrhov čaká na úpravu';
    if(lastTime)lastTime.textContent=timeFmt.format(preparedAt);
    if(lastTitle)lastTitle.textContent=latest.title||'Posledný pripravený draft';
  }

  function articleSilenceHours(){
    if(todayArticles.length){
      const d=new Date(todayArticles[0].updated_at||todayArticles[0].created_at);
      return Math.max(0,(Date.now()-d.getTime())/3600000);
    }
    const midnight=new Date();
    midnight.setHours(0,0,0,0);
    return Math.max(0,(Date.now()-midnight.getTime())/3600000);
  }

  function updateOverallHealth(){
    const summary=document.querySelector('#auto-run-summary');
    const note=document.querySelector('#auto-run-note');
    const card=document.querySelector('#auto-health-card');
    if(!summary||!card)return;

    const workflow=runLabel(latestWorkflowRun);
    const silentHours=articleSilenceHours();
    card.classList.remove('auto-warning','auto-danger');

    if(workflow.cls==='bad'){
      summary.className='auto-run-state bad';
      summary.textContent=workflow.text;
      note.textContent=workflow.detail+' Toto je vhodný moment na kontrolu automatiky.';
      card.classList.add('auto-danger');
      return;
    }

    if(silentHours>=4){
      summary.className='auto-run-state warn';
      summary.textContent='● Automatika beží, fronta sa dlhšie nedoplnila';
      note.textContent=(todayArticles.length?'Od posledného draftu uplynulo približne '+Math.floor(silentHours)+' h.':'Fronta je zatiaľ prázdna.')+' Systém ďalej kontroluje nové zdroje a nepublikuje bez ručnej kontroly.';
      card.classList.add('auto-warning');
      return;
    }

    summary.className='auto-run-state '+workflow.cls;
    summary.textContent=workflow.text;
    note.textContent='Drafty pripravené na úpravu: '+todayArticles.length+'. '+workflow.detail+'.';
  }

  async function refreshWorkflow(){
    const last=document.querySelector('#auto-last-run');
    const result=document.querySelector('#auto-last-result');
    const response=await fetch('https://api.github.com/repos/infoznetu-rgb/objektiv24/actions/runs?per_page=30',{
      headers:{Accept:'application/vnd.github+json'},
      cache:'no-store'
    });
    if(!response.ok)throw new Error('GitHub HTTP '+response.status);
    const data=await response.json();
    latestWorkflowRun=(data.workflow_runs||[]).find(x=>x.path===AUTO_WORKFLOW)||null;
    const state=runLabel(latestWorkflowRun);
    if(last)last.textContent=latestWorkflowRun?dateTimeFmt.format(new Date(latestWorkflowRun.created_at)):'—';
    if(result)result.textContent=state.detail;
  }

  async function refresh(){
    updateCountdown();

    const summary=document.querySelector('#auto-run-summary');
    if(summary)summary.textContent='Kontrolujem automatiku…';

    const results=await Promise.allSettled([
      refreshWorkflow(),
      fetchTodayArticles()
    ]);

    const workflowResult=results[0];
    const articleResult=results[1];

    if(articleResult.status==='fulfilled'){
      renderTodayArticles(articleResult.value);
    }else{
      const note=document.querySelector('#auto-today-note');
      if(note)note.textContent='Dnešné články sa nepodarilo načítať: '+(articleResult.reason?.message||articleResult.reason);
      todayArticles=[];
    }

    if(workflowResult.status==='rejected'){
      latestWorkflowRun=null;
      const lastResult=document.querySelector('#auto-last-result');
      if(lastResult)lastResult.textContent='Stav workflowu sa nepodarilo načítať: '+(workflowResult.reason?.message||workflowResult.reason);
    }

    updateOverallHealth();
  }

  document.querySelector('#auto-run-refresh')?.addEventListener('click',refresh);

  updateCountdown();
  refresh();

  countdownTimer=setInterval(updateCountdown,1000);
  setInterval(refresh,5*60*1000);
})();