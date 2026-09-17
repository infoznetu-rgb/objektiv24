(() => {
  const $ = s => document.querySelector(s);
  const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const BUCKET = 'article-images';
  const MAX_ITEMS = 4;
  let state = { items: [] };
  let saving = false;

  function emptyItem(order) {
    return { id: crypto.randomUUID(), order, url:'', type:'wide', label:'', credit:'', sourceUrl:'' };
  }
  function normalizedItems(items) {
    const out = Array.isArray(items) ? items.slice(0, MAX_ITEMS).map((x,i)=>({
      id:x?.id || crypto.randomUUID(), order:i+1, url:clean(x?.url), type:['wide','detail','document','map'].includes(x?.type)?x.type:'wide',
      label:clean(x?.label), credit:clean(x?.credit), sourceUrl:clean(x?.sourceUrl)
    })) : [];
    while (out.length < MAX_ITEMS) out.push(emptyItem(out.length + 1));
    return out;
  }
  function topicText() {
    return clean([$('#title')?.value,$('#category')?.value,$('#intro')?.value,$('#what-happened')?.value,$('#next-step')?.value].join(' ')).toLocaleLowerCase('sk').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }
  function suggestions() {
    const t = topicText();
    const rules = [
      [/tunel|cest|dopr|vodic|uzaver|dialnic|auto|kolon/, ['širší záber cesty alebo tunela','detail dopravnej značky alebo obmedzenia','autá / premávka v relevantnom prostredí','jednoduchá mapa alebo orientačný detail']],
      [/urad|social|davk|prispev|dochod|formular/, ['budova alebo vstup úradu','detail dokumentu bez osobných údajov','ruky pri vypĺňaní formulára','kalendár / termín / praktický detail']],
      [/skol|ziak|student|tried|matur/, ['budova školy','trieda alebo školské prostredie','učebnice / školské pomôcky','oznam alebo dokument bez osobných údajov']],
      [/energia|elektrin|plyn|solar|fotovolt/, ['dom alebo domácnosť','solárne panely / energetické zariadenie','merač alebo technický detail','faktúra / kalkulačný detail bez osobných údajov']],
      [/pocasie|burk|sneh|vietor|povoden|dazd/, ['širší záber počasia v regióne','detail mokrej / zasneženej cesty','výstražný prvok alebo obloha','praktický detail dopravy alebo terénu']],
      [/zdrav|nemoc|lek|ambulanc|nemocnic/, ['zdravotnícke prostredie','budova nemocnice / ambulancie','neutrálne zdravotnícke pomôcky','dokument alebo termín bez osobných údajov']],
      [/spotrebit|cena|nakup|obchod|reklamac/, ['predajňa alebo regál','detail produktu / cenovky','pokladňa alebo nákupný košík','doklad / reklamácia bez osobných údajov']]
    ];
    for (const [re, arr] of rules) if (re.test(t)) return arr;
    return ['širší reálny záber prostredia','detail predmetu priamo súvisiaceho s témou','druhý uhol alebo praktický detail','mapa / dokument / orientačný vizuál'];
  }

  function boot(tries = 0) {
    const grid = $('#video-pro-panel .vpro-grid');
    if (!grid || typeof client === 'undefined') {
      if (tries < 120) setTimeout(() => boot(tries + 1), 180);
      return;
    }
    if ($('#broll-card')) return;
    state.items = normalizedItems([]);
    build(grid);
    wrapPersistence();
    restore();
  }

  function build(grid) {
    const style = document.createElement('style');
    style.textContent = `
      .broll-card{grid-column:1/-1;border:1px solid #d9dde1;background:#fff;border-radius:10px;padding:14px}.broll-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.broll-head h5{margin:0 0 4px;font-size:.82rem}.broll-head p{margin:0;color:#717780;font-size:.7rem;line-height:1.45;max-width:720px}.broll-count{flex:none;border-radius:999px;background:#eef0f2;color:#626871;padding:6px 9px;font-size:.62rem;font-weight:900}.broll-count.good{background:#eaf5bb;color:#4b5d0d}.broll-suggest{margin-top:10px;padding:10px 12px;border-left:3px solid #d9ff28;background:#f7f9eb;color:#5b6242;font-size:.69rem;line-height:1.45}.broll-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:11px}.broll-slot{border:1px solid #dfe2e5;border-radius:9px;overflow:hidden;background:#fafbfc}.broll-preview{position:relative;aspect-ratio:4/5;background:#0b151d;display:grid;place-items:center;color:#81909a;font-size:.67rem;text-align:center;padding:10px}.broll-preview img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.broll-number{position:absolute;z-index:2;top:7px;left:7px;border-radius:999px;background:#071019dd;color:#d9ff28;padding:4px 7px;font-size:.57rem;font-weight:950}.broll-body{padding:9px}.broll-body label{display:block;font-size:.62rem;color:#6d737c;margin-top:6px}.broll-body input,.broll-body select{width:100%;margin-top:3px;font-size:.68rem;padding:7px}.broll-actions{display:flex;gap:5px;margin-top:7px}.broll-actions button{flex:1;border:1px solid #cbd0d4;background:#fff;border-radius:5px;padding:6px 7px;font-size:.61rem;font-weight:850;cursor:pointer}.broll-actions .remove{color:#8b3e31}.broll-upload{display:block;margin-top:7px}.broll-upload input{font-size:.62rem}.broll-hint{margin-top:9px!important;font-size:.65rem!important;color:#7a8088!important}.broll-type-badge{position:absolute;z-index:2;right:7px;bottom:7px;background:#fff;color:#27313a;border-radius:999px;padding:4px 7px;font-size:.54rem;font-weight:900}@media(max-width:950px){.broll-grid{grid-template-columns:1fr 1fr}}@media(max-width:520px){.broll-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
    const card = document.createElement('div');
    card.id = 'broll-card';
    card.className = 'broll-card';
    card.innerHTML = `<div class="broll-head"><div><h5>B-roll pre video</h5><p>Pridajte 2–4 doplnkové reálne fotografie. Vo finálnom videu sa automaticky rozdelia medzi scény „Čo sa stalo“, „Čo to znamená“ a „Čo ďalej“.</p></div><span id="broll-count" class="broll-count">0/4</span></div><div id="broll-suggest" class="broll-suggest"></div><div id="broll-grid" class="broll-grid"></div><p class="broll-hint">Odporúčanie: hlavná fotografia + aspoň 2 B-roll zábery. Používajte vlastné, oficiálne alebo licencované fotografie; AI vizuál iba ako jasne ilustračný.</p>`;
    grid.appendChild(card);
    ['#title','#category','#intro','#what-happened','#next-step'].forEach(sel => $(sel)?.addEventListener('input', renderSuggestion));
    render();
  }

  function renderSuggestion() {
    const arr = suggestions();
    const el = $('#broll-suggest');
    if (el) el.innerHTML = `<strong>Čo by sa hodilo k tejto téme:</strong> ${arr.map((x,i)=>`${i+1}. ${esc(x)}`).join(' · ')}`;
  }
  function typeLabel(v){return ({wide:'Široký',detail:'Detail',document:'Dokument',map:'Mapa/INFO'})[v]||'Záber';}
  function render() {
    state.items = normalizedItems(state.items);
    const grid = $('#broll-grid'); if (!grid) return;
    grid.innerHTML = state.items.map((item,i)=>`
      <div class="broll-slot" data-broll-slot="${i}">
        <div class="broll-preview">${item.url?`<img src="${esc(item.url)}" alt="">`:'<span>Pridajte doplnkový záber</span>'}<b class="broll-number">B-ROLL ${i+1}</b><span class="broll-type-badge">${esc(typeLabel(item.type))}</span></div>
        <div class="broll-body">
          <label>Typ záberu<select data-broll-type><option value="wide" ${item.type==='wide'?'selected':''}>Široký záber</option><option value="detail" ${item.type==='detail'?'selected':''}>Detail</option><option value="document" ${item.type==='document'?'selected':''}>Dokument / predmet</option><option value="map" ${item.type==='map'?'selected':''}>Mapa / info vizuál</option></select></label>
          <label>Krátky popis<input data-broll-label maxlength="120" value="${esc(item.label)}" placeholder="čo je na zábere"></label>
          <label>Kredit / zdroj<input data-broll-credit maxlength="160" value="${esc(item.credit)}" placeholder="autor / organizácia"></label>
          <label class="broll-upload">Nahrať fotografiu<input data-broll-file type="file" accept="image/jpeg,image/png,image/webp"></label>
          <div class="broll-actions"><button type="button" data-broll-up ${i===0?'disabled':''}>↑</button><button type="button" data-broll-down ${i===state.items.length-1?'disabled':''}>↓</button><button type="button" class="remove" data-broll-remove>Odstrániť</button></div>
        </div>
      </div>`).join('');
    grid.querySelectorAll('[data-broll-slot]').forEach(slot => wireSlot(slot));
    const count = state.items.filter(x=>x.url).length;
    const badge = $('#broll-count'); if (badge) { badge.textContent = `${count}/4`; badge.classList.toggle('good',count>=2); }
    renderSuggestion();
  }

  function wireSlot(slot) {
    const i = Number(slot.dataset.brollSlot);
    slot.querySelector('[data-broll-type]').onchange = e => { state.items[i].type=e.target.value; render(); persistSoon(); };
    slot.querySelector('[data-broll-label]').onchange = e => { state.items[i].label=clean(e.target.value); persistSoon(); };
    slot.querySelector('[data-broll-credit]').onchange = e => { state.items[i].credit=clean(e.target.value); persistSoon(); };
    slot.querySelector('[data-broll-file]').onchange = e => uploadFile(i,e.target.files?.[0]);
    slot.querySelector('[data-broll-remove]').onclick = () => { state.items[i]=emptyItem(i+1); render(); persistSoon(); };
    slot.querySelector('[data-broll-up]').onclick = () => move(i,-1);
    slot.querySelector('[data-broll-down]').onclick = () => move(i,1);
  }
  function move(i,dir){const j=i+dir;if(j<0||j>=state.items.length)return;[state.items[i],state.items[j]]=[state.items[j],state.items[i]];state.items.forEach((x,k)=>x.order=k+1);render();persistSoon();}

  async function resize(file) {
    const dataUrl = await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=reject;r.readAsDataURL(file);});
    const img = await new Promise((resolve,reject)=>{const x=new Image();x.onload=()=>resolve(x);x.onerror=reject;x.src=dataUrl;});
    const max=1800, scale=Math.min(1,max/img.width,max/img.height), c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale)); c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Obrázok sa nepodarilo spracovať.')),'image/jpeg',.86));
  }
  async function uploadFile(i,file) {
    if (!file) return;
    const draftId = clean($('#draft-id')?.value);
    if (!draftId) return alert('Najprv článok uložte ako návrh, potom pridajte B-roll fotografie.');
    if (!currentUser) return;
    if (file.size > 20*1024*1024) return alert('Fotografia je príliš veľká. Maximum je 20 MB.');
    const preview = document.querySelector(`[data-broll-slot="${i}"] .broll-preview`);
    if (preview) preview.innerHTML += '<span style="position:absolute;z-index:5;inset:auto 8px 8px 8px;background:#071019dd;color:#d9ff28;padding:7px;border-radius:6px">Nahrávam…</span>';
    try {
      const blob = await resize(file);
      const d=new Date(), path=`${currentUser.id}/assets/broll/${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${crypto.randomUUID()}.jpg`;
      const {error}=await client.storage.from(BUCKET).upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false});
      if(error) throw error;
      const {data}=client.storage.from(BUCKET).getPublicUrl(path);
      if(!data?.publicUrl) throw new Error('Úložisko nevrátilo verejnú adresu.');
      state.items[i].url=data.publicUrl;
      if(!state.items[i].label) state.items[i].label=suggestions()[i]||`B-roll ${i+1}`;
      render();
      await persistNow();
    } catch(error) { alert(`B-roll sa nepodarilo uložiť: ${error.message}`); render(); }
  }

  function currentDraft(){const id=clean($('#draft-id')?.value);return (typeof drafts!=='undefined'?drafts:[]).find(d=>String(d.id)===id);}
  function collect(){return {version:1,items:state.items.filter(x=>x.url||x.label||x.credit).map((x,i)=>({...x,order:i+1}))};}
  function fill(v={}){state.items=normalizedItems(v?.items||[]);render();}
  let persistTimer=null;
  function persistSoon(){clearTimeout(persistTimer);persistTimer=setTimeout(persistNow,400);}
  async function persistNow(){
    const draftId=clean($('#draft-id')?.value);if(!draftId||!currentUser||saving)return;
    saving=true;
    try{
      const d=typeof readForm==='function'?readForm():null;
      const shortVideo={...(d?.shortVideo||currentDraft()?.shortVideo||{}),broll:collect()};
      const {error}=await client.from('drafts').update({short_video:shortVideo,updated_at:new Date().toISOString()}).eq('id',draftId).eq('user_id',currentUser.id);
      if(error)throw error;
      const local=currentDraft();if(local)local.shortVideo=shortVideo;
    }catch(error){console.warn('B-roll persistence:',error);}finally{saving=false;}
  }

  function restore(){const d=currentDraft();fill(d?.shortVideo?.broll||{});}
  function wrapPersistence(){
    try{const originalReadForm=readForm;readForm=function(){const d=originalReadForm();return{...d,shortVideo:{...(d.shortVideo||{}),broll:collect()}};};}catch{}
    try{const originalSelectDraft=selectDraft;selectDraft=function(id){originalSelectDraft(id);setTimeout(restore,120);};}catch{}
    try{const originalResetForm=resetForm;resetForm=function(){originalResetForm();setTimeout(()=>fill({}),80);};}catch{}
  }

  window.objektiv24Broll={getItems:()=>state.items.filter(x=>/^https:\/\//i.test(x.url)).map(x=>({...x})),getState:collect,refresh:restore};
  boot();
})();