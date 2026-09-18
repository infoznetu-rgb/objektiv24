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
      '<div class="analytics-head"><div><p class="analytics-kicker">ČITATEĽSKÁ ANALYTIKA</p><h2>Čo ľudia naozaj čítajú</h2><p>Len návštevy so súhlasom s analytikou. Vyhľadávané slová sa neukladajú.</p></div><button id="analytics-refresh" type="button">Obnoviť</button></div>'+
      '<div class="analytics-stats">'+
        '<article><span>Dnes</span><strong id="a-today">—</strong><small>zobrazení stránok</small></article>'+
        '<article><span>7 dní</span><strong id="a-week">—</strong><small>zobrazení stránok</small></article>'+
        '<article><span>Návštevníci</span><strong id="a-visitors">—</strong><small>za 30 dní</small></article>'+
        '<article><span>Články</span><strong id="a-opens">—</strong><small>otvorení · 30 dní</small></article>'+
        '<article><span>Dočítanie 75 %</span><strong id="a-read75">—</strong><small>z otvorených článkov</small></article>'+
        '<article><span>Do konca</span><strong id="a-read100">—</strong><small>z otvorených článkov</small></article>'+
        '<article><span>Zdieľanie</span><strong id="a-shares">—</strong><small>zdieľať + kopírovať</small></article>'+
        '<article><span>Vyhľadávanie</span><strong id="a-search">—</strong><small>použití · 30 dní</small></article>'+
      '</div>'+
      '<div class="analytics-grid">'+
        '<article class="analytics-panel"><h3>Vývoj · posledných 7 dní</h3><div id="a-chart" class="analytics-chart"></div></article>'+
        '<article class="analytics-panel"><h3>Najčítanejšie články · 30 dní</h3><div id="a-articles" class="analytics-list">Načítavam…</div></article>'+
        '<article class="analytics-panel"><h3>Záujem o rubriky · 30 dní</h3><div id="a-topics" class="analytics-list">Načítavam…</div></article>'+
        '<article class="analytics-panel"><h3>Dočítanie článkov · 30 dní</h3><div id="a-reading" class="analytics-list">Načítavam…</div></article>'+
        '<article class="analytics-panel"><h3>Čo privádza kliknutie · 30 dní</h3><div id="a-clicks" class="analytics-list">Načítavam…</div></article>'+
        '<article class="analytics-panel"><h3>Odkiaľ prišli · 30 dní</h3><div id="a-referrers" class="analytics-list">Načítavam…</div></article>'+
      '</div>'+
      '<p id="a-note" class="analytics-note"></p>';
    main.prepend(section);
    $('#analytics-refresh').addEventListener('click',load);
    await load();
  }

  function pct(n,d){
    if(!d)return'—';
    return Math.min(100,Math.round(n/d*100))+' %';
  }

  function humanSlug(slug){
    if(!slug)return'Neznámy článok';
    return decodeURIComponent(slug).replace(/-/g,' ').replace(/\b\w/g,m=>m.toLocaleUpperCase('sk'));
  }

  async function load(){
    const note=$('#a-note');
    note.textContent='Načítavam dáta…';
    const since=new Date(Date.now()-30*864e5).toISOString();

    const [eventsResult,draftsResult]=await Promise.all([
      client.from('site_events')
        .select('created_at,path,article_slug,referrer,visitor_id,event_type,event_label')
        .gte('created_at',since)
        .order('created_at',{ascending:false})
        .limit(20000),
      client.from('drafts')
        .select('slug,title')
        .eq('state','published')
        .not('slug','is',null)
        .limit(1000)
    ]);

    if(eventsResult.error){
      note.textContent='Štatistiky sa nepodarilo načítať: '+eventsResult.error.message;
      return;
    }

    const all=eventsResult.data||[];
    const titleMap=new Map((draftsResult.data||[]).map(x=>[x.slug,x.title]));
    const pages=all.filter(x=>x.event_type==='page_view');
    const opens=all.filter(x=>x.event_type==='article_open');
    const read25=all.filter(x=>x.event_type==='read_25');
    const read50=all.filter(x=>x.event_type==='read_50');
    const read75=all.filter(x=>x.event_type==='read_75');
    const read100=all.filter(x=>x.event_type==='read_100');
    const shares=all.filter(x=>x.event_type==='share_click'||x.event_type==='copy_link');
    const searches=all.filter(x=>x.event_type==='search_used');
    const topics=all.filter(x=>x.event_type==='topic_click'&&x.event_label);
    const now=new Date();
    const startToday=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    const week=Date.now()-7*864e5;

    $('#a-today').textContent=pages.filter(x=>new Date(x.created_at).getTime()>=startToday).length.toLocaleString('sk-SK');
    $('#a-week').textContent=pages.filter(x=>new Date(x.created_at).getTime()>=week).length.toLocaleString('sk-SK');
    $('#a-visitors').textContent=new Set(pages.map(x=>x.visitor_id).filter(Boolean)).size.toLocaleString('sk-SK');
    $('#a-opens').textContent=opens.length.toLocaleString('sk-SK');
    $('#a-read75').textContent=pct(read75.length,opens.length);
    $('#a-read100').textContent=pct(read100.length,opens.length);
    $('#a-shares').textContent=shares.length.toLocaleString('sk-SK');
    $('#a-search').textContent=searches.length.toLocaleString('sk-SK');

    renderChart(pages);
    renderTop(
      opens.filter(x=>x.article_slug),
      'article_slug',
      '#a-articles',
      slug=>titleMap.get(slug)||humanSlug(slug)
    );
    renderTop(topics,'event_label','#a-topics',x=>x);

    const reading=[
      ['Otvorenie článku',opens.length],
      ['25 %',read25.length],
      ['50 %',read50.length],
      ['75 %',read75.length],
      ['100 %',read100.length]
    ];
    renderPairs(reading,'#a-reading',opens.length);

    const clickPairs=[
      ['Karta článku',all.filter(x=>x.event_type==='article_click').length],
      ['Hlavný článok',all.filter(x=>x.event_type==='hero_click').length],
      ['Najnovšie',all.filter(x=>x.event_type==='latest_click').length],
      ['Súvisiaci článok',all.filter(x=>x.event_type==='related_click').length],
      ['Ďalší článok',all.filter(x=>x.event_type==='next_article_click').length],
      ['Zdieľanie / odkaz',shares.length]
    ].filter(x=>x[1]>0);
    renderPairs(clickPairs,'#a-clicks');

    renderTop(
      pages.filter(x=>x.referrer),
      'referrer',
      '#a-referrers',
      x=>x||'Priamy vstup'
    );

    const newEvents=all.some(x=>['read_25','article_open','topic_click','share_click'].includes(x.event_type));
    note.textContent=
      'Posledná aktualizácia '+new Date().toLocaleTimeString('sk-SK',{hour:'2-digit',minute:'2-digit'})+
      ' · Dáta sa merajú iba po súhlase návštevníka.'+
      (newEvents?'':' Nové metriky sa začnú napĺňať od dnešného nasadenia.');
  }

  function renderTop(rows,key,sel,label){
    const m=new Map();
    rows.forEach(x=>{
      const k=x[key]||'';
      if(!k)return;
      m.set(k,(m.get(k)||0)+1);
    });
    const a=[...m].sort((x,y)=>y[1]-x[1]).slice(0,7);
    const max=a[0]?.[1]||1;
    $(sel).innerHTML=a.length
      ?a.map(([k,n],i)=>'<div class="analytics-row"><span class="rank">'+(i+1)+'</span><div><b>'+esc(label(k))+'</b><i style="--w:'+Math.max(5,n/max*100)+'%"></i></div><strong>'+n+'</strong></div>').join('')
      :'<p>Zatiaľ bez dát.</p>';
  }

  function renderPairs(items,sel,base){
    const rows=items.filter(([,n])=>n>=0);
    const max=Math.max(1,...rows.map(x=>x[1]));
    $(sel).innerHTML=rows.length
      ?rows.map(([label,n],i)=>{
        const right=base&&i>0?pct(n,base):n.toLocaleString('sk-SK');
        return '<div class="analytics-row"><span class="rank">'+(i+1)+'</span><div><b>'+esc(label)+'</b><i style="--w:'+Math.max(5,n/max*100)+'%"></i></div><strong>'+right+'</strong></div>';
      }).join('')
      :'<p>Zatiaľ bez dát.</p>';
  }

  function renderChart(rows){
    const days=[];
    for(let i=6;i>=0;i--){
      const d=new Date();
      d.setHours(0,0,0,0);
      d.setDate(d.getDate()-i);
      days.push({d,key:d.toISOString().slice(0,10),n:0});
    }
    rows.forEach(x=>{
      const d=new Date(x.created_at);
      const local=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
      const o=days.find(y=>y.key===local);
      if(o)o.n++;
    });
    const max=Math.max(1,...days.map(x=>x.n));
    $('#a-chart').innerHTML=days.map(x=>
      '<div class="bar-col"><strong>'+x.n+'</strong><i style="height:'+Math.max(4,x.n/max*100)+'%"></i><span>'+x.d.toLocaleDateString('sk-SK',{weekday:'short'})+'</span></div>'
    ).join('');
  }

  document.readyState==='loading'
    ?document.addEventListener('DOMContentLoaded',start)
    :start();
})();