(() => {
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

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
    if($('#analytics-dashboard'))return;
    const main=$('.editor-main');
    const section=document.createElement('section');
    section.id='analytics-dashboard';
    section.className='analytics-dashboard';
    section.innerHTML=
      '<div class="analytics-head"><div><p class="analytics-kicker">ČITATEĽSKÁ ANALYTIKA</p><h2>Čo ľudia naozaj čítajú</h2><p>Len návštevy so súhlasom s analytikou. Surové identifikátory návštevníkov sa v Redakcii nezobrazujú.</p></div><button id="analytics-refresh" type="button">Obnoviť</button></div>'+
      '<div class="analytics-stats">'+
        '<article><span>Dnes</span><strong id="a-today">—</strong><small>zobrazení stránok</small></article>'+
        '<article><span>7 dní</span><strong id="a-week">—</strong><small>zobrazení stránok</small></article>'+
        '<article><span>Návštevníci</span><strong id="a-visitors">—</strong><small>unikátni · 30 dní</small></article>'+
        '<article><span>Návraty</span><strong id="a-returning">—</strong><small>návratoví · 7 dní</small></article>'+
        '<article><span>Články</span><strong id="a-opens">—</strong><small>zobrazenia · 30 dní</small></article>'+
        '<article><span>Aktívne 30 s</span><strong id="a-engaged">—</strong><small>z článkov od nového merania</small></article>'+
        '<article><span>Dočítanie 75 %</span><strong id="a-read75">—</strong><small>z článkov od nového merania</small></article>'+
        '<article><span>Push odbery</span><strong id="a-push">—</strong><small>aktívne zariadenia</small></article>'+
      '</div>'+
      '<div class="analytics-grid">'+
        '<article class="analytics-panel"><h3>Vývoj · posledných 7 dní</h3><div id="a-chart" class="analytics-chart"></div></article>'+
        '<article class="analytics-panel"><h3>Najčítanejšie články · 30 dní</h3><div id="a-articles" class="analytics-list">Načítavam…</div></article>'+
        '<article class="analytics-panel"><h3>Záujem o rubriky · 30 dní</h3><div id="a-topics" class="analytics-list">Načítavam…</div></article>'+
        '<article class="analytics-panel"><h3>Dočítanie článkov</h3><div id="a-reading" class="analytics-list">Načítavam…</div></article>'+
        '<article class="analytics-panel"><h3>Interakcie · 30 dní</h3><div id="a-clicks" class="analytics-list">Načítavam…</div></article>'+
        '<article class="analytics-panel"><h3>Odkiaľ prišli · 30 dní</h3><div id="a-referrers" class="analytics-list">Načítavam…</div></article>'+
        '<article class="analytics-panel"><h3>Odberový funnel · 30 dní</h3><div id="a-audience" class="analytics-list">Načítavam…</div></article>'+
        '<article class="analytics-panel"><h3>Core Web Vitals · p75</h3><div id="a-vitals" class="analytics-list">Načítavam prvé reálne merania…</div></article>'+
      '</div>'+
      '<p id="a-note" class="analytics-note"></p>';
    main.prepend(section);
    $('#analytics-refresh').addEventListener('click',load);
    await load();
  }

  function pctRate(value){
    if(value===null||value===undefined||!Number.isFinite(Number(value)))return'—';
    return Math.min(100,Math.round(Number(value)*100))+' %';
  }

  function humanSlug(slug){
    if(!slug)return'Neznámy článok';
    try{return decodeURIComponent(slug).replace(/-/g,' ').replace(/\b\w/g,m=>m.toLocaleUpperCase('sk'))}
    catch{return String(slug).replace(/-/g,' ')}
  }

  async function secureAnalytics(){
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    const token=data?.session?.access_token;
    if(!token)throw new Error('Editor session is not available.');

    const response=await fetch(SUPABASE_URL+'/functions/v1/editor-analytics',{
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

  async function load(){
    const note=$('#a-note');
    const button=$('#analytics-refresh');
    note.textContent='Načítavam bezpečný súhrn…';
    if(button)button.disabled=true;

    try{
      const data=await secureAnalytics();

      $('#a-today').textContent=Number(data.page_views_today||0).toLocaleString('sk-SK');
      $('#a-week').textContent=Number(data.page_views_7d||0).toLocaleString('sk-SK');
      $('#a-visitors').textContent=Number(data.visitors_30d||0).toLocaleString('sk-SK');
      $('#a-returning').textContent=Number(data.returning_visitors_7d||0).toLocaleString('sk-SK');
      $('#a-opens').textContent=Number(data.article_views_30d||0).toLocaleString('sk-SK');
      $('#a-engaged').textContent=pctRate(data.engaged_30s_rate);
      $('#a-read75').textContent=pctRate(data.read_75_rate);
      $('#a-push').textContent=Number(data.push_subscribers||0).toLocaleString('sk-SK');

      renderChart(data.daily_page_views_7d||[]);
      renderRows(
        (data.top_articles_30d||[]).map(x=>({
          label:x.title||humanSlug(x.slug),
          value:Number(x.views||0)
        })),
        '#a-articles'
      );
      renderRows(
        (data.top_topics_30d||[]).map(x=>({
          label:x.topic,
          value:Number(x.clicks||0)
        })),
        '#a-topics'
      );

      const base=Number(data.quality_article_views||0);
      renderFunnel([
        ['Zobrazenie článku',base],
        ['25 %',Number(data.read_25||0)],
        ['50 %',Number(data.read_50||0)],
        ['75 %',Number(data.read_75||0)],
        ['100 %',Number(data.read_100||0)]
      ],'#a-reading',base);

      const interactions=(data.click_sources_30d||[]).map(x=>({
        label:x.label,
        value:Number(x.count||0)
      }));
      if(Number(data.search_uses_30d||0)>0)interactions.push({label:'Vyhľadávanie',value:Number(data.search_uses_30d)});
      renderRows(interactions,'#a-clicks');

      renderRows(
        (data.referrers_30d||[]).map(x=>({
          label:x.referrer,
          value:Number(x.views||0)
        })),
        '#a-referrers'
      );

      renderRows(
        (data.audience_funnel_30d||[]).map(x=>({
          label:x.label,
          value:Number(x.count||0)
        })),
        '#a-audience'
      );

      renderVitals(data.web_vitals||{});

      const qualitySince=data.quality_tracking_since
        ?new Intl.DateTimeFormat('sk-SK',{day:'numeric',month:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(data.quality_tracking_since))
        :'dnešného nasadenia';

      note.textContent=
        'Aktualizované '+new Date().toLocaleTimeString('sk-SK',{hour:'2-digit',minute:'2-digit'})+
        ' · Dáta sa merajú iba po súhlase návštevníka. Engagement a dočítanie sa počítajú od '+qualitySince+'.';
    }catch(error){
      console.error('Secure analytics failed',error);
      note.textContent='Štatistiky sa nepodarilo načítať: '+(error?.message||String(error));
      ['#a-articles','#a-topics','#a-reading','#a-clicks','#a-referrers','#a-audience','#a-vitals'].forEach(sel=>{
        if($(sel))$(sel).innerHTML='<p>Zatiaľ bez dát.</p>';
      });
    }finally{
      if(button)button.disabled=false;
    }
  }

  function vitalRating(metric,value){
    if(value===null||value===undefined||!Number.isFinite(Number(value)))return{label:'čakám na dáta',mark:'—'};
    const n=Number(value);
    if(metric==='LCP')return n<=2500?{label:'dobré',mark:'✓'}:n<=4000?{label:'treba zlepšiť',mark:'!'}:{label:'slabé',mark:'×'};
    if(metric==='INP')return n<=200?{label:'dobré',mark:'✓'}:n<=500?{label:'treba zlepšiť',mark:'!'}:{label:'slabé',mark:'×'};
    return n<=0.1?{label:'dobré',mark:'✓'}:n<=0.25?{label:'treba zlepšiť',mark:'!'}:{label:'slabé',mark:'×'};
  }

  function renderVitals(vitals){
    const rows=[];
    for(const [device,label] of [['mobile','Mobil'],['desktop','Desktop']]){
      const d=vitals?.[device]||{};
      const defs=[
        ['LCP',d.lcp_p75_ms,d.lcp_samples,'ms'],
        ['INP',d.inp_p75_ms,d.inp_samples,'ms'],
        ['CLS',d.cls_p75,d.cls_samples,'']
      ];
      for(const [metric,value,samples,unit] of defs){
        const rating=vitalRating(metric,value);
        const display=value===null||value===undefined||!Number.isFinite(Number(value))
          ?'—'
          :(metric==='CLS'?Number(value).toFixed(3):Math.round(Number(value))+' '+unit);
        rows.push(
          '<div class="analytics-row"><span class="rank">'+rating.mark+'</span><div><b>'+
          esc(label+' · '+metric)+'</b><small>'+esc(rating.label)+' · '+Number(samples||0)+' meraní</small></div><strong>'+display+'</strong></div>'
        );
      }
    }
    $('#a-vitals').innerHTML=rows.join('');
  }

  function renderRows(items,sel){
    const rows=(items||[]).filter(x=>x.label&&Number(x.value)>=0).sort((a,b)=>b.value-a.value).slice(0,7);
    const max=rows[0]?.value||1;
    $(sel).innerHTML=rows.length
      ?rows.map((x,i)=>'<div class="analytics-row"><span class="rank">'+(i+1)+'</span><div><b>'+esc(x.label)+'</b><i style="--w:'+Math.max(5,x.value/max*100)+'%"></i></div><strong>'+x.value.toLocaleString('sk-SK')+'</strong></div>').join('')
      :'<p>Zatiaľ bez dát.</p>';
  }

  function renderFunnel(items,sel,base){
    const rows=(items||[]).filter(([,n])=>Number(n)>=0);
    const max=Math.max(1,...rows.map(x=>Number(x[1])||0));
    $(sel).innerHTML=rows.length
      ?rows.map(([label,n],i)=>{
        const value=Number(n)||0;
        const right=i===0?value.toLocaleString('sk-SK'):(base?Math.min(100,Math.round(value/base*100))+' %':'—');
        return '<div class="analytics-row"><span class="rank">'+(i+1)+'</span><div><b>'+esc(label)+'</b><i style="--w:'+Math.max(5,value/max*100)+'%"></i></div><strong>'+right+'</strong></div>';
      }).join('')
      :'<p>Zatiaľ bez dát.</p>';
  }

  function renderChart(rows){
    const items=(rows||[]).slice(-7);
    const max=Math.max(1,...items.map(x=>Number(x.views)||0));
    $('#a-chart').innerHTML=items.length
      ?items.map(x=>{
        const d=new Date(String(x.date)+'T12:00:00');
        const n=Number(x.views)||0;
        return '<div class="bar-col"><strong>'+n+'</strong><i style="height:'+Math.max(4,n/max*100)+'%"></i><span>'+d.toLocaleDateString('sk-SK',{weekday:'short'})+'</span></div>';
      }).join('')
      :'<p>Zatiaľ bez dát.</p>';
  }

  document.readyState==='loading'
    ?document.addEventListener('DOMContentLoaded',start)
    :start();
})();
