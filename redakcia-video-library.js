(() => {
  const $=s=>document.querySelector(s);
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let timer=null,token=0,lastQuery='';

  function stripHtml(v=''){
    const d=document.createElement('div');d.innerHTML=String(v||'');return clean(d.textContent||'');
  }
  function topic(){
    return clean([$('#title')?.value,$('#category')?.value,$('#intro')?.value,$('#what-happened')?.value,$('#what-it-means')?.value,$('#next-step')?.value].join(' ')).toLocaleLowerCase('sk').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function suggestedQuery(){
    const t=topic();
    if(/tunel|cest|dopr|vodic|uzaver|dialnic|auto|kolon|premav/.test(t)) return 'road traffic cars tunnel';
    if(/urad|social|davk|prispev|dochod|formular/.test(t)) return 'office paperwork public administration';
    if(/skol|ziak|student|tried|matur/.test(t)) return 'school classroom students';
    if(/energia|elektrin|plyn|solar|fotovolt/.test(t)) return 'solar panels electricity home';
    if(/pocasie|burk|sneh|vietor|povoden|dazd/.test(t)) return 'rain weather street storm';
    if(/zdrav|nemoc|lek|ambulanc|nemocnic/.test(t)) return 'hospital healthcare medical';
    if(/spotrebit|cena|nakup|obchod|reklamac/.test(t)) return 'shopping supermarket checkout';
    if(/sport|futbal|hokej|beh|cyklist/.test(t)) return 'sports training competition';
    return 'Slovakia city people everyday life';
  }

  function boot(n=0){
    const motion=$('#motion-broll-card');
    if(!motion||!window.objektiv24MotionBroll){if(n<120)setTimeout(()=>boot(n+1),180);return;}
    if($('#video-library-card'))return;
    build(motion);wireDrafts();scheduleSearch(700);
  }

  function build(motion){
    const style=document.createElement('style');
    style.textContent=`
      .video-library-card{margin-top:10px;border:1px solid #d7dcdf;background:#fff;border-radius:10px;padding:14px}.video-library-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.video-library-head h5{margin:0 0 4px;font-size:.82rem}.video-library-head p{margin:0;color:#6e757d;font-size:.69rem;line-height:1.45;max-width:720px}.video-library-search{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:10px}.video-library-search input{min-width:0}.video-library-search button{border:0;background:#303136;color:#d9ff28;border-radius:6px;padding:8px 11px;font-weight:900;font-size:.66rem;cursor:pointer}.video-library-status{margin-top:8px;color:#737a82;font-size:.65rem}.video-library-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.video-lib-item{overflow:hidden;border:1px solid #dfe3e6;border-radius:8px;background:#f8fafb}.video-lib-thumb{position:relative;aspect-ratio:16/9;background:#071019;overflow:hidden}.video-lib-thumb img,.video-lib-thumb video{width:100%;height:100%;object-fit:cover}.video-lib-license{position:absolute;left:6px;bottom:6px;background:#071019d9;color:#fff;border-radius:999px;padding:4px 6px;font-size:.52rem;font-weight:850}.video-lib-body{padding:8px}.video-lib-body b{display:block;font-size:.65rem;line-height:1.28;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.video-lib-body p{margin:4px 0;color:#747b82;font-size:.58rem;line-height:1.3;min-height:2.4em}.video-lib-body button{width:100%;border:0;background:#d9ff28;color:#172000;border-radius:5px;padding:7px;font-size:.62rem;font-weight:950;cursor:pointer}.video-lib-note{margin:9px 0 0;color:#7b8288;font-size:.61rem;line-height:1.45}@media(max-width:800px){.video-library-grid{grid-template-columns:1fr 1fr}}@media(max-width:520px){.video-library-grid{grid-template-columns:1fr}.video-library-search{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
    const card=document.createElement('div');card.id='video-library-card';card.className='video-library-card';
    card.innerHTML=`<div class="video-library-head"><div><h5>Návrhy reálnych video záberov</h5><p>Objektív24 vyhľadá verejne licencované klipy na Wikimedia Commons podľa témy článku. Pred použitím vždy skontrolujte, či záber naozaj sedí k téme.</p></div></div><div class="video-library-search"><input id="video-library-query" type="search" placeholder="napr. road traffic tunnel"><button id="video-library-search" type="button">Hľadať klipy</button></div><div id="video-library-status" class="video-library-status">Pripravujem návrhy…</div><div id="video-library-grid" class="video-library-grid"></div><p class="video-lib-note">Použitím klipu sa automaticky uloží aj zdroj a licencia. Preferujeme reálny B-roll; ilustračné zábery nesmú vytvárať dojem, že zobrazujú presne konkrétnu udalosť, ak to nie je overené.</p>`;
    motion.after(card);
    $('#video-library-search').onclick=()=>search($('#video-library-query')?.value||suggestedQuery(),true);
    $('#video-library-query').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search(e.currentTarget.value,true);}});
  }

  function scheduleSearch(delay=900){clearTimeout(timer);timer=setTimeout(()=>{const q=suggestedQuery();if($('#video-library-query'))$('#video-library-query').value=q;if(q!==lastQuery)search(q,false);},delay);}
  function wireDrafts(){
    ['#title','#category','#intro','#what-happened','#what-it-means','#next-step'].forEach(sel=>$(sel)?.addEventListener('change',()=>scheduleSearch(700)));
    try{const f=selectDraft;selectDraft=function(id){f(id);setTimeout(()=>scheduleSearch(500),180);};}catch{}
    try{const f=resetForm;resetForm=function(){f();setTimeout(()=>{lastQuery='';const g=$('#video-library-grid');if(g)g.innerHTML='';const s=$('#video-library-status');if(s)s.textContent='Vyberte článok a zobrazia sa vhodné video zábery.';},160);};}catch{}
  }

  async function search(query,manual=false){
    const q=clean(query||suggestedQuery());if(!q)return;
    const my=++token;lastQuery=q;
    const status=$('#video-library-status'),grid=$('#video-library-grid');if(status)status.textContent='Hľadám reálne klipy na Wikimedia Commons…';if(grid)grid.innerHTML='';
    try{
      const params=new URLSearchParams({origin:'*',action:'query',generator:'search',gsrsearch:`${q} filetype:video`,gsrnamespace:'6',gsrlimit:'15',prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'480',format:'json',formatversion:'2'});
      const r=await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);if(!r.ok)throw new Error(`HTTP ${r.status}`);const data=await r.json();if(my!==token)return;
      const pages=Array.isArray(data?.query?.pages)?data.query.pages:[];
      const items=pages.map(page=>{const ii=page?.imageinfo?.[0]||{},meta=ii.extmetadata||{},mime=clean(ii.mime).toLowerCase();if(!/^video\/(webm|mp4)/.test(mime))return null;const title=clean(page.title).replace(/^File:/i,'');const license=stripHtml(meta.LicenseShortName?.value||meta.UsageTerms?.value||'Wikimedia Commons');const artist=stripHtml(meta.Artist?.value||meta.Credit?.value||'');const sourceUrl=`https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page.title||'').replace(/ /g,'_'))}`;return {url:ii.url,thumb:ii.thumburl||'',mime,title,license,artist,sourceUrl};}).filter(Boolean).slice(0,6);
      if(!items.length){if(status)status.textContent='Nenašiel som vhodný WebM/MP4 klip. Skúste jednoduchšie anglické kľúčové slová.';return;}
      if(status)status.textContent=`Našiel som ${items.length} návrhov. Kliknutím „Použiť“ sa klip vloží do prvého voľného video slotu.`;
      if(grid)grid.innerHTML=items.map((x,i)=>`<article class="video-lib-item" data-lib="${i}"><div class="video-lib-thumb">${x.thumb?`<img src="${esc(x.thumb)}" alt="">`:`<video src="${esc(x.url)}" muted preload="metadata"></video>`}<span class="video-lib-license">${esc(x.license)}</span></div><div class="video-lib-body"><b title="${esc(x.title)}">${esc(x.title)}</b><p>${esc(x.artist||'Wikimedia Commons')}</p><button type="button">Použiť tento klip</button></div></article>`).join('');
      grid?.querySelectorAll('[data-lib]').forEach((el,i)=>el.querySelector('button').onclick=async()=>{const x=items[i];el.querySelector('button').disabled=true;el.querySelector('button').textContent='Pridávam…';try{await window.objektiv24MotionBroll.addItem({url:x.url,label:x.title,credit:`${x.artist?x.artist+' · ':''}${x.license}`,sourceUrl:x.sourceUrl});el.querySelector('button').textContent='Pridané ✓';if(status)status.textContent='Klip bol pridaný do živého B-rollu a uložený k článku.';}catch(e){el.querySelector('button').disabled=false;el.querySelector('button').textContent='Použiť tento klip';if(status)status.textContent=`Klip sa nepodarilo pridať: ${e.message}`;}});
    }catch(e){if(my!==token)return;if(status)status.textContent=`Vyhľadanie klipov zlyhalo: ${e.message}. B-roll môžete stále nahrať ručne.`;if(manual)console.warn(e);}
  }

  boot();
})();