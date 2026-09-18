(() => {
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let refreshTimer=null;

  function start(){
    const shell=$('#editor-shell');
    if(!shell)return;
    const obs=new MutationObserver(()=>{
      if(!shell.hidden){obs.disconnect();mount()}
    });
    obs.observe(shell,{attributes:true,attributeFilter:['hidden']});
    if(!shell.hidden)mount();
  }

  async function mount(){
    if($('#editorial-qa'))return;
    const main=$('.editor-main');
    const section=document.createElement('section');
    section.id='editorial-qa';
    section.className='editorial-qa';
    section.innerHTML=
      '<div class="editorial-qa-head"><div><p class="analytics-kicker">REDAKČNÁ FRONTA</p><h2>Čo treba spraviť ďalej</h2><p>Automatická kontrola kvality, termínov, evergreenov a zdrojov. Nič sa neopravuje bez teba.</p></div><button id="editorial-qa-refresh" type="button">Obnoviť</button></div>'+
      '<div class="editorial-qa-stats">'+
        '<article data-priority="critical"><span>Kritické</span><strong id="eqa-critical">—</strong></article>'+
        '<article data-priority="high"><span>Vysoká priorita</span><strong id="eqa-high">—</strong></article>'+
        '<article data-priority="medium"><span>Stredná priorita</span><strong id="eqa-medium">—</strong></article>'+
        '<article data-priority="total"><span>Spolu úloh</span><strong id="eqa-total">—</strong></article>'+
      '</div>'+
      '<div class="editorial-qa-tools"><button type="button" class="is-active" data-filter="all">Všetko</button><button type="button" data-filter="critical">Kritické</button><button type="button" data-filter="high">Vysoké</button><button type="button" data-filter="medium">Stredné</button></div>'+
      '<div id="editorial-qa-list" class="editorial-qa-list">Načítavam…</div>'+
      '<p id="editorial-qa-note" class="analytics-note"></p>';

    const evergreen=$('#evergreen-watch');
    const growth=$('#growth-plan');
    if(evergreen)evergreen.insertAdjacentElement('beforebegin',section);
    else if(growth)growth.insertAdjacentElement('afterend',section);
    else main.prepend(section);

    $('#editorial-qa-refresh')?.addEventListener('click',load);
    section.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
      section.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderTasks(section._tasks||[],btn.dataset.filter||'all');
    }));

    await load();
    refreshTimer=setInterval(()=>{
      if(document.visibilityState==='visible')load();
    },10*60*1000);
  }

  async function fetchQueue(){
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    const token=data?.session?.access_token;
    if(!token)throw new Error('Editor session is not available.');
    const response=await fetch(SUPABASE_URL+'/functions/v1/editorial-qa',{
      method:'POST',
      headers:{
        apikey:SUPABASE_PUBLISHABLE_KEY,
        Authorization:'Bearer '+token,
        'Content-Type':'application/json'
      },
      body:'{}',
      cache:'no-store'
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload?.error||('HTTP '+response.status));
    return payload;
  }

  function priorityLabel(p){
    return p==='critical'?'KRITICKÉ':p==='high'?'VYSOKÁ':'STREDNÁ';
  }

  function typeLabel(t){
    const map={
      seo:'SEO',sources:'ZDROJE',freshness:'AKTUÁLNOSŤ',accessibility:'PRÍSTUPNOSŤ',
      image:'OBRÁZOK',distribution:'DISTRIBÚCIA',deadline:'TERMÍN',
      evergreen:'EVERGREEN',automation:'AUTOMATIZÁCIA'
    };
    return map[t]||String(t||'ÚLOHA').toUpperCase();
  }

  function renderTasks(tasks,filter='all'){
    const list=$('#editorial-qa-list');
    const rows=(tasks||[]).filter(t=>filter==='all'||t.priority===filter);
    if(!rows.length){
      list.innerHTML='<div class="editorial-qa-empty"><strong>Táto skupina je čistá.</strong><p>Momentálne tu nie je žiadna otvorená úloha.</p></div>';
      return;
    }
    list.innerHTML=rows.map(t=>{
      const href=t.url||'/redakcia.html';
      const external=href.startsWith('/redakcia')?'':' target="_blank" rel="noopener"';
      return '<article class="editorial-task" data-priority="'+esc(t.priority)+'">'+
        '<div class="editorial-task-top"><div><span class="editorial-priority">'+esc(priorityLabel(t.priority))+'</span><span class="editorial-type">'+esc(typeLabel(t.type))+'</span></div><a href="'+esc(href)+'"'+external+'>Otvoriť →</a></div>'+
        '<h3>'+esc(t.title)+'</h3>'+
        '<p>'+esc(t.detail||'')+'</p>'+
        '<div class="editorial-action"><strong>Odporúčaný krok</strong><span>'+esc(t.action||'Skontrolovať manuálne.')+'</span></div>'+
      '</article>';
    }).join('');
  }

  async function load(){
    const note=$('#editorial-qa-note');
    const button=$('#editorial-qa-refresh');
    if(button)button.disabled=true;
    note.textContent='Prepočítavam redakčnú frontu…';
    try{
      const data=await fetchQueue();
      const s=data.summary||{};
      $('#eqa-critical').textContent=Number(s.critical||0);
      $('#eqa-high').textContent=Number(s.high||0);
      $('#eqa-medium').textContent=Number(s.medium||0);
      $('#eqa-total').textContent=Number(s.total||0);
      const section=$('#editorial-qa');
      section._tasks=data.tasks||[];
      const active=section.querySelector('[data-filter].is-active')?.dataset.filter||'all';
      renderTasks(section._tasks,active);
      const dt=data.generated_at?new Date(data.generated_at):new Date();
      note.textContent='Prepočítané '+dt.toLocaleString('sk-SK',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'})+
        ' · '+Number(s.published_articles||0)+' publikovaných článkov · '+Number(s.evergreen_guides||0)+' evergreen návodov.';
    }catch(error){
      console.error('Editorial QA failed',error);
      $('#editorial-qa-list').innerHTML='<div class="editorial-qa-empty"><strong>Frontu sa nepodarilo načítať.</strong><p>'+esc(error?.message||String(error))+'</p></div>';
      note.textContent='Automatická kontrola je momentálne nedostupná.';
    }finally{
      if(button)button.disabled=false;
    }
  }

  addEventListener('pagehide',()=>{if(refreshTimer)clearInterval(refreshTimer)},{once:true});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();