(() => {
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function start(){
    const shell=$('#editor-shell'); if(!shell)return;
    const obs=new MutationObserver(()=>{if(!shell.hidden){obs.disconnect();mount()}});
    obs.observe(shell,{attributes:true,attributeFilter:['hidden']});
    if(!shell.hidden)mount();
  }
  async function mount(){
    if($('#growth-plan'))return;
    const main=$('.editor-main');
    const section=document.createElement('section');
    section.id='growth-plan';
    section.className='growth-dashboard';
    section.innerHTML='<div class="growth-head"><div><p class="analytics-kicker">RASTOVÝ PLÁN</p><h2>Čo má redakcia pokrývať</h2><p>Pokrytie za posledných 7 dní oproti cieľu + najbližšie termíny a evergreen príležitosti.</p></div><a href="/terminy/" target="_blank" rel="noopener">Verejné termíny ↗</a></div><div id="growth-coverage" class="growth-grid">Načítavam…</div><div class="growth-columns"><article class="growth-panel"><h3>Najbližšie termíny</h3><div id="growth-deadlines"></div></article><article class="growth-panel"><h3>Evergreen zásobník</h3><div id="growth-evergreen"></div></article></div><p id="growth-note" class="analytics-note"></p>';
    const analytics=$('#analytics-dashboard');
    if(analytics)analytics.insertAdjacentElement('afterend',section);else main.prepend(section);
    await load();
  }
  function daysLeft(iso){
    const d=new Date(iso+'T00:00:00');
    const t=new Date(); t.setHours(0,0,0,0);
    return Math.round((d-t)/864e5);
  }
  function formatDate(iso){
    const d=new Date(iso+'T12:00:00');
    return Number.isNaN(d.getTime())?iso:new Intl.DateTimeFormat('sk-SK',{day:'numeric',month:'long'}).format(d);
  }
  async function load(){
    const note=$('#growth-note');
    try{
      const since=new Date(Date.now()-7*864e5).toISOString();
      const [strategyRes,draftsRes]=await Promise.all([
        fetch('/data/editorial-strategy.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Stratégia HTTP '+r.status);return r.json()}),
        client.from('drafts').select('category,published_at,slug,title').eq('state','published').gte('published_at',since).limit(1000)
      ]);
      if(draftsRes.error)throw draftsRes.error;
      const strategy=strategyRes;
      const rows=draftsRes.data||[];
      $('#growth-coverage').innerHTML=(strategy.pillars||[]).map(p=>{
        const n=rows.filter(x=>x.category===p.topic).length;
        const pct=Math.min(100,Math.round(n/Math.max(1,p.targetPerWeek)*100));
        const status=n>=p.targetPerWeek?'cieľ splnený':(p.targetPerWeek-n)+' chýba';
        return '<article><span>'+esc(p.name)+'</span><strong>'+n+' / '+p.targetPerWeek+'</strong><i><b style="width:'+pct+'%"></b></i><small>'+esc(status)+'</small></article>';
      }).join('');
      const upcoming=(strategy.upcoming||[]).map(x=>({...x,days:daysLeft(x.date)})).filter(x=>x.days>=0&&x.days<=60).sort((a,b)=>a.days-b.days);
      $('#growth-deadlines').innerHTML=upcoming.length?upcoming.map(x=>'<a class="growth-row" href="/clanky/'+encodeURIComponent(x.slug)+'/" target="_blank" rel="noopener"><b>'+esc(x.label)+'</b><span>'+esc(formatDate(x.date))+(x.days===0?' · dnes':x.days===1?' · zajtra':' · '+x.days+' dní')+'</span></a>').join(''):'<p>Bez blízkych termínov.</p>';
      $('#growth-evergreen').innerHTML=(strategy.evergreen||[]).slice(0,6).map(x=>'<div class="growth-row"><b>'+esc(x.title)+'</b><span>'+esc(x.topic)+' · '+esc(x.reason)+'</span></div>').join('');
      note.textContent='Plán aktualizovaný '+(strategy.updated||'—')+' · Pokrytie sa počíta z publikovaných článkov za posledných 7 dní.';
    }catch(e){
      note.textContent='Rastový plán sa nepodarilo načítať: '+(e?.message||e);
    }
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();