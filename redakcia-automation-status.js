(() => {
  const main=document.querySelector('.editor-main');
  const health=document.querySelector('#system-health');
  if(!main||document.querySelector('#auto-articles-status'))return;

  const PUBLIC_SUPABASE_URL='https://bkyappgttwjxakkwycub.supabase.co';
  const PUBLIC_SUPABASE_KEY='sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4';
  const AUTO_WORKFLOW='.github/workflows/auto-articles.yml';
  const EXPECTED_START_MINUTE=5;
  const NORMAL_DELAY_MINUTES=20;

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
      <span class="auto-articles-kicker">AUTOMATICKÉ ČLÁNKY</span>
      <strong id="auto-run-summary">Kontrolujem automatiku…</strong>
      <small id="auto-run-note">Každú hodinu sa kontrolujú zdroje. Nový článok vznikne iba vtedy, keď vhodná téma prejde filtrami a QA.</small>
      <button id="auto-run-refresh" class="auto-articles-refresh" type="button">Obnoviť stav</button>
    </article>

    <article>
      <span class="auto-articles-kicker">DNES PUBLIKOVANÉ</span>
      <strong id="auto-today-count">—</strong>
      <div id="auto-today-times" class="auto-times"></div>
      <small id="auto-today-note">Načítavam dnešné články…</small>
    </article>

    <article>
      <span class="auto-articles-kicker">POSLEDNÝ ČLÁNOK</span>
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
      <small id="auto-next-run">Plán približne každú hodinu o :05.</small>
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
    if(now.getMinutes()<EXPECTED_START_MINUTE){
      next.setMinutes(EXPECTED_START_MINUTE);
    }else{
      next.setHours(next.getHours()+1);
      next.setMinutes(EXPECTED_START_MINUTE);
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
    if(age>95*60000)return {cls:'bad',text:'● Automatika pravdepodobne mešká',detail:'Posledný beh bol '+dateTimeFmt.format(new Date(run.updated_at||run.created_at))};
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
    query.set('state','eq.published');
    query.set('published_at','gte.'+localMidnightIso());
    query.set('select','id,title,published_at,updated_at');
    query.set('order','published_at.desc');
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
      rows.slice().reverse().forEach(row=>{
        if(!row.published_at)return;
        const chip=document.createElement('span');
        chip.className='auto-time-chip';
        chip.textContent=timeFmt.format(new Date(row.published_at));
        chip.title=row.title||'Publikovaný článok';
        times.appendChild(chip);
      });
    }

    if(!rows.length){
      if(note)note.textContent='Dnes zatiaľ nevyšiel žiadny automatický článok.';
      if(lastTime)lastTime.textContent='Dnes zatiaľ nič';
      if(lastTitle)lastTitle.textContent='Automatika môže bežať správne aj bez publikovania, ak nič neprejde QA.';
      return;
    }

    const latest=rows[0];
    const publishedAt=new Date(latest.published_at||latest.updated_at);
    if(note)note.textContent=rows.length===1?'1 článok dnes':'Časy dnešných publikovaní';
    if(lastTime)lastTime.textContent=timeFmt.format(publishedAt);
    if(lastTitle)lastTitle.textContent=latest.title||'Posledný publikovaný článok';
  }

  function articleSilenceHours(){
    if(todayArticles.length){
      const d=new Date(todayArticles[0].published_at||todayArticles[0].updated_at);
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
      summary.textContent='● Automatika beží, ale dlhšie nič nevydala';
      note.textContent=(todayArticles.length?'Od posledného článku uplynulo približne '+Math.floor(silentHours)+' h.':'Dnes zatiaľ nevyšiel článok.')+' Nemusí ísť o chybu — nové témy mohli byť slabé alebo neprešli QA.';
      card.classList.add('auto-warning');
      return;
    }

    summary.className='auto-run-state '+workflow.cls;
    summary.textContent=workflow.text;
    note.textContent='Dnešné publikovania: '+todayArticles.length+'. '+workflow.detail+'.';
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