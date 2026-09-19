(() => {
  const main=document.querySelector('.editor-main');
  const health=document.querySelector('#system-health');
  if(!main||document.querySelector('#auto-articles-status'))return;

  const style=document.createElement('style');
  style.textContent=`
    .auto-articles-status{display:grid;grid-template-columns:minmax(0,1.2fr) repeat(2,minmax(150px,.7fr));gap:12px;align-items:stretch;margin:0 0 22px}
    .auto-articles-status article{border:1px solid #dde1e5;background:#fff;border-radius:12px;padding:14px 16px;min-width:0}
    .auto-articles-status .auto-main{background:#f8faea;border-color:#dbe5a1}
    .auto-articles-kicker{display:block;font-size:.62rem;font-weight:950;letter-spacing:.12em;color:#7b812f;margin-bottom:5px}
    .auto-articles-status strong{display:block;font-size:.92rem;color:#30333a;line-height:1.35}
    .auto-articles-status small{display:block;margin-top:5px;font-size:.69rem;color:#747982;line-height:1.45}
    .auto-run-state{display:inline-flex;align-items:center;gap:6px}.auto-run-dot{font-size:.8rem}
    .auto-run-state.ok{color:#506315}.auto-run-state.warn{color:#9a5a20}.auto-run-state.running{color:#365675}
    .auto-articles-refresh{margin-top:8px;border:0;background:none;padding:0;color:#50545b;text-decoration:underline;font-size:.66rem;font-weight:800;cursor:pointer}
    @media(max-width:850px){.auto-articles-status{grid-template-columns:1fr 1fr}.auto-articles-status .auto-main{grid-column:1/-1}}
    @media(max-width:520px){.auto-articles-status{grid-template-columns:1fr}.auto-articles-status .auto-main{grid-column:auto}}
  `;
  document.head.appendChild(style);

  const root=document.createElement('section');
  root.id='auto-articles-status';
  root.className='auto-articles-status';
  root.innerHTML=`
    <article class="auto-main">
      <span class="auto-articles-kicker">AUTOMATICKÉ ČLÁNKY</span>
      <strong id="auto-run-summary">Kontrolujem posledný beh…</strong>
      <small id="auto-run-note">Automatika kontroluje zdroje každú hodinu. Článok vyjde iba vtedy, keď nový podklad prejde filtrami a QA.</small>
      <button id="auto-run-refresh" class="auto-articles-refresh" type="button">Obnoviť stav</button>
    </article>
    <article>
      <span class="auto-articles-kicker">POSLEDNÝ BEH</span>
      <strong id="auto-last-run">—</strong>
      <small id="auto-last-result">Načítavam…</small>
    </article>
    <article>
      <span class="auto-articles-kicker">ĎALŠIA KONTROLA</span>
      <strong id="auto-next-run">—</strong>
      <small>Plán je každú hodinu o :05. GitHub Actions môže začať o niekoľko minút neskôr.</small>
    </article>
  `;
  if(health)health.before(root);else main.prepend(root);

  const fmt=new Intl.DateTimeFormat('sk-SK',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const timeFmt=new Intl.DateTimeFormat('sk-SK',{hour:'2-digit',minute:'2-digit'});

  function nextRunWindow(){
    const now=new Date();
    const start=new Date(now);
    start.setSeconds(0,0);
    if(now.getMinutes()<5)start.setMinutes(5);
    else{start.setHours(start.getHours()+1);start.setMinutes(5)}
    const late=new Date(start.getTime()+20*60*1000);
    return timeFmt.format(start)+' – '+timeFmt.format(late);
  }

  function updateNext(){
    const el=document.querySelector('#auto-next-run');
    if(el)el.textContent=nextRunWindow();
  }

  function runLabel(run){
    if(!run)return {cls:'warn',text:'Beh sa nenašiel',detail:'Skúste stav obnoviť.'};
    if(run.status!=='completed')return {cls:'running',text:'● Automatika práve beží',detail:'Spustené '+fmt.format(new Date(run.created_at))};
    if(run.conclusion==='success')return {cls:'ok',text:'● Posledný beh bol úspešný',detail:'Dokončené '+fmt.format(new Date(run.updated_at||run.created_at))};
    return {cls:'warn',text:'● Posledný beh skončil: '+String(run.conclusion||'neznámy stav'),detail:'Beh '+fmt.format(new Date(run.updated_at||run.created_at))};
  }

  async function refresh(){
    updateNext();
    const summary=document.querySelector('#auto-run-summary');
    const last=document.querySelector('#auto-last-run');
    const result=document.querySelector('#auto-last-result');
    if(summary)summary.textContent='Kontrolujem posledný beh…';
    try{
      const response=await fetch('https://api.github.com/repos/infoznetu-rgb/objektiv24/actions/runs?per_page=30',{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
      if(!response.ok)throw new Error('GitHub HTTP '+response.status);
      const data=await response.json();
      const run=(data.workflow_runs||[]).find(x=>x.path==='.github/workflows/auto-articles.yml');
      const state=runLabel(run);
      if(summary){
        summary.className='auto-run-state '+state.cls;
        summary.textContent=state.text;
      }
      if(last)last.textContent=run?fmt.format(new Date(run.created_at)):'—';
      if(result)result.textContent=state.detail;
    }catch(error){
      if(summary){
        summary.className='auto-run-state warn';
        summary.textContent='Stav workflowu sa nepodarilo načítať';
      }
      if(result)result.textContent=error?.message||String(error);
    }
  }

  document.querySelector('#auto-run-refresh')?.addEventListener('click',refresh);
  updateNext();
  refresh();
  setInterval(updateNext,60000);
  setInterval(refresh,5*60*1000);
})();