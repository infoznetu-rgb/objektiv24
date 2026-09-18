(() => {
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function start(){
    const shell=$('#editor-shell');
    if(!shell)return;
    const obs=new MutationObserver(()=>{if(!shell.hidden){obs.disconnect();mount()}});
    obs.observe(shell,{attributes:true,attributeFilter:['hidden']});
    if(!shell.hidden)mount();
  }

  async function mount(){
    if($('#evergreen-watch'))return;
    const main=$('.editor-main');
    const section=document.createElement('section');
    section.id='evergreen-watch';
    section.className='evergreen-watch';
    section.innerHTML=
      '<div class="evergreen-watch-head"><div><p class="analytics-kicker">EVERGREEN KONTROLA</p><h2>Čo treba znovu overiť</h2><p>Stav oficiálnych zdrojov pre návody v Poradni. Systém nič automaticky neprepisuje.</p></div><button id="evergreen-refresh" type="button">Obnoviť</button></div>'+
      '<div class="evergreen-watch-stats">'+
        '<article><span>V poriadku</span><strong id="ew-ok">—</strong></article>'+
        '<article><span>Treba aktualizovať</span><strong id="ew-update">—</strong></article>'+
        '<article><span>Kontroluje sa</span><strong id="ew-checking">—</strong></article>'+
        '<article><span>Chyba zdroja</span><strong id="ew-error">—</strong></article>'+
      '</div>'+
      '<div id="evergreen-list" class="evergreen-list">Načítavam…</div>'+
      '<p id="evergreen-note" class="analytics-note"></p>';
    const growth=$('#growth-plan');
    if(growth)growth.insertAdjacentElement('afterend',section);else main.prepend(section);
    $('#evergreen-refresh').addEventListener('click',load);
    await load();
  }

  function formatDate(v){
    if(!v)return'—';
    const d=new Date(v);
    return Number.isNaN(d.getTime())?'—':d.toLocaleString('sk-SK',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }

  function badge(status){
    const map={
      ok:['OK','ok'],
      needs_update:['TREBA AKTUALIZOVAŤ','update'],
      checking:['KONTROLA','checking'],
      error:['CHYBA ZDROJA','error']
    };
    const x=map[status]||[status||'NEZNÁMY','checking'];
    return '<span class="ew-badge ew-'+x[1]+'">'+esc(x[0])+'</span>';
  }

  async function markResolved(id){
    const {error}=await client.from('evergreen_reviews').update({
      status:'ok',
      change_summary:'',
      recommended_action:'',
      resolved_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    }).eq('id',id);
    if(error){alert('Nepodarilo sa označiť kontrolu ako vyriešenú: '+error.message);return;}
    await load();
  }

  async function load(){
    const note=$('#evergreen-note');
    note.textContent='Načítavam stav…';
    const {data,error}=await client.from('evergreen_reviews')
      .select('id,guide_slug,guide_title,status,last_checked_at,detected_at,change_summary,recommended_action,source_urls,checked_sources,baseline_verified_date,updated_at')
      .order('status',{ascending:false})
      .order('updated_at',{ascending:false});
    if(error){
      note.textContent='Kontrolu evergreenov sa nepodarilo načítať: '+error.message;
      return;
    }
    const rows=data||[];
    const count=s=>rows.filter(x=>x.status===s).length;
    $('#ew-ok').textContent=count('ok');
    $('#ew-update').textContent=count('needs_update');
    $('#ew-checking').textContent=count('checking');
    $('#ew-error').textContent=count('error');
    const list=$('#evergreen-list');
    if(!rows.length){
      list.innerHTML='<p>Zatiaľ bez evergreen kontrol.</p>';
      note.textContent='Fronta je prázdna.';
      return;
    }
    list.innerHTML=rows.map(r=>{
      const sourceCount=Array.isArray(r.source_urls)?r.source_urls.length:0;
      const checkedCount=Array.isArray(r.checked_sources)?r.checked_sources.length:0;
      const action=r.recommended_action?'<div class="ew-action"><strong>Odporúčaný zásah</strong><p>'+esc(r.recommended_action)+'</p></div>':'';
      const summary=r.change_summary?'<div class="ew-change"><strong>Zistená zmena</strong><p>'+esc(r.change_summary)+'</p></div>':'';
      const resolve=r.status==='needs_update'||r.status==='error'
        ?'<button class="ew-resolve" type="button" data-id="'+esc(r.id)+'">Označiť ako vyriešené</button>'
        :'';
      return '<article class="ew-row">'+
        '<div class="ew-row-main"><div>'+badge(r.status)+'<h3>'+esc(r.guide_title)+'</h3><p><a href="/poradna/'+encodeURIComponent(r.guide_slug)+'/" target="_blank" rel="noopener">Otvoriť návod ↗</a></p></div>'+
        '<div class="ew-meta"><span>Posledná kontrola <b>'+esc(formatDate(r.last_checked_at))+'</b></span><span>Zdroje <b>'+checkedCount+' / '+sourceCount+'</b></span><span>Baseline <b>'+esc(r.baseline_verified_date||'—')+'</b></span></div></div>'+
        summary+action+
        '<div class="ew-footer">'+resolve+'</div>'+
      '</article>';
    }).join('');
    list.querySelectorAll('.ew-resolve').forEach(btn=>btn.addEventListener('click',()=>markResolved(btn.dataset.id)));
    const latest=rows.map(x=>x.last_checked_at).filter(Boolean).sort().pop();
    note.textContent='Posledná evidovaná kontrola: '+(latest?formatDate(latest):'zatiaľ neprebehla')+'. Zmeny sa potvrdzujú iba proti oficiálnym zdrojom.';
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();