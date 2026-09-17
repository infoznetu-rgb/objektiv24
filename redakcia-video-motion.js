(() => {
  const $ = s => document.querySelector(s);
  const clean = v => String(v || '').replace(/\s+/g,' ').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const BUCKET='article-images';
  const MAX=3;
  let state={items:[]};
  let saving=false;

  function empty(order){return {id:crypto.randomUUID(),order,url:'',label:'',credit:'',mediaType:'video'};}
  function normalize(items){
    const out=Array.isArray(items)?items.slice(0,MAX).map((x,i)=>({
      id:x?.id||crypto.randomUUID(),order:i+1,url:clean(x?.url),label:clean(x?.label),credit:clean(x?.credit),mediaType:'video'
    })):[];
    while(out.length<MAX)out.push(empty(out.length+1));
    return out;
  }

  function boot(n=0){
    const grid=$('#video-pro-panel .vpro-grid');
    if(!grid||typeof client==='undefined'){if(n<120)setTimeout(()=>boot(n+1),180);return;}
    if($('#motion-broll-card'))return;
    state.items=normalize([]);
    build(grid);wrap();restore();
  }

  function build(grid){
    const style=document.createElement('style');
    style.textContent=`
      .motion-broll-card{grid-column:1/-1;border:1px solid #d5dadd;background:#f7fafb;border-radius:10px;padding:14px}.motion-broll-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.motion-broll-head h5{margin:0 0 4px;font-size:.82rem}.motion-broll-head p{margin:0;color:#69717a;font-size:.7rem;line-height:1.45;max-width:720px}.motion-broll-badge{flex:none;border-radius:999px;background:#e8edf0;color:#55616a;padding:6px 9px;font-size:.62rem;font-weight:900}.motion-broll-badge.good{background:#d9ff28;color:#1d2700}.motion-broll-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:11px}.motion-broll-slot{overflow:hidden;border:1px solid #d9dfe3;border-radius:9px;background:#fff}.motion-broll-preview{position:relative;aspect-ratio:9/16;background:#071019;display:grid;place-items:center;color:#91a0aa;font-size:.67rem;text-align:center}.motion-broll-preview video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.motion-broll-num{position:absolute;z-index:3;left:7px;top:7px;background:#071019dd;color:#d9ff28;border-radius:999px;padding:4px 7px;font-size:.56rem;font-weight:950}.motion-broll-live{position:absolute;z-index:3;right:7px;top:7px;background:#d9ff28;color:#101700;border-radius:999px;padding:4px 7px;font-size:.54rem;font-weight:950}.motion-broll-body{padding:9px}.motion-broll-body label{display:block;font-size:.62rem;color:#68717a;margin-top:6px}.motion-broll-body input{width:100%;margin-top:3px;font-size:.68rem;padding:7px}.motion-broll-actions{display:flex;gap:5px;margin-top:7px}.motion-broll-actions button{flex:1;border:1px solid #c8ced3;background:#fff;border-radius:5px;padding:6px 7px;font-size:.61rem;font-weight:850;cursor:pointer}.motion-broll-actions .remove{color:#8b3e31}.motion-broll-note{margin-top:10px!important;font-size:.66rem!important;color:#6d767f!important;line-height:1.5!important}.motion-broll-priority{margin-top:9px;padding:9px 11px;border-left:3px solid #d9ff28;background:#f0f6d7;color:#4f5c20;font-size:.68rem;line-height:1.45}@media(max-width:800px){.motion-broll-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
    const card=document.createElement('div');
    card.id='motion-broll-card';card.className='motion-broll-card';
    card.innerHTML=`<div class="motion-broll-head"><div><h5>Živý B-roll · videoklipy</h5><p>Krátke reálne klipy majú pri renderi prednosť pred fotografiami. Stačia 2–8 sekundové zábery bez hovoreného zvuku — napríklad autá, cesta, budova, ulica, počasie alebo práca s dokumentom.</p></div><span id="motion-broll-count" class="motion-broll-badge">0/3</span></div><div class="motion-broll-priority"><strong>Priorita renderu:</strong> živý videoklip → B-roll fotografia → hlavná fotografia. Tým sa video nebude správať ako slideshow.</div><div id="motion-broll-grid" class="motion-broll-grid"></div><p class="motion-broll-note">Odporúčané: vertikálne MP4 9:16, 1080 × 1920, 2–8 s. Povolené MP4, WebM a MOV. Používajte iba klipy, na ktoré máte právo.</p>`;
    const photo=$('#broll-card');photo?photo.after(card):grid.appendChild(card);
    render();
  }

  function render(){
    state.items=normalize(state.items);
    const grid=$('#motion-broll-grid');if(!grid)return;
    grid.innerHTML=state.items.map((x,i)=>`<div class="motion-broll-slot" data-motion-slot="${i}"><div class="motion-broll-preview">${x.url?`<video src="${esc(x.url)}" muted loop playsinline preload="metadata"></video>`:'<span>Nahrajte krátky reálny videoklip</span>'}<b class="motion-broll-num">VIDEO ${i+1}</b>${x.url?'<span class="motion-broll-live">ŽIVÉ</span>':''}</div><div class="motion-broll-body"><label>Čo je na klipe<input data-motion-label maxlength="120" value="${esc(x.label)}" placeholder="napr. autá pred tunelom"></label><label>Kredit / zdroj<input data-motion-credit maxlength="160" value="${esc(x.credit)}" placeholder="autor / organizácia"></label><label>Nahrať video<input data-motion-file type="file" accept="video/mp4,video/webm,video/quicktime"></label><div class="motion-broll-actions"><button type="button" data-motion-up ${i===0?'disabled':''}>↑</button><button type="button" data-motion-down ${i===state.items.length-1?'disabled':''}>↓</button><button type="button" class="remove" data-motion-remove>Odstrániť</button></div></div></div>`).join('');
    grid.querySelectorAll('[data-motion-slot]').forEach(wire);
    grid.querySelectorAll('video').forEach(v=>{v.addEventListener('mouseenter',()=>v.play().catch(()=>{}));v.addEventListener('mouseleave',()=>{v.pause();v.currentTime=0;});});
    const count=state.items.filter(x=>/^https:\/\//i.test(x.url)).length,b=$('#motion-broll-count');if(b){b.textContent=`${count}/3`;b.classList.toggle('good',count>=1);}
  }

  function wire(slot){
    const i=Number(slot.dataset.motionSlot);
    slot.querySelector('[data-motion-label]').onchange=e=>{state.items[i].label=clean(e.target.value);persistSoon();};
    slot.querySelector('[data-motion-credit]').onchange=e=>{state.items[i].credit=clean(e.target.value);persistSoon();};
    slot.querySelector('[data-motion-file]').onchange=e=>upload(i,e.target.files?.[0]);
    slot.querySelector('[data-motion-remove]').onclick=()=>{state.items[i]=empty(i+1);render();persistSoon();};
    slot.querySelector('[data-motion-up]').onclick=()=>move(i,-1);
    slot.querySelector('[data-motion-down]').onclick=()=>move(i,1);
  }
  function move(i,d){const j=i+d;if(j<0||j>=state.items.length)return;[state.items[i],state.items[j]]=[state.items[j],state.items[i]];state.items.forEach((x,k)=>x.order=k+1);render();persistSoon();}

  async function upload(i,file){
    if(!file)return;
    const draftId=clean($('#draft-id')?.value);if(!draftId)return alert('Najprv článok uložte ako návrh.');
    if(!currentUser)return;
    if(!/^video\/(mp4|webm|quicktime)$/i.test(file.type||''))return alert('Použite MP4, WebM alebo MOV.');
    if(file.size>80*1024*1024)return alert('Videoklip je príliš veľký. Maximum je 80 MB.');
    const p=document.querySelector(`[data-motion-slot="${i}"] .motion-broll-preview`);if(p)p.insertAdjacentHTML('beforeend','<span style="position:absolute;z-index:5;left:8px;right:8px;bottom:8px;background:#071019dd;color:#d9ff28;padding:7px;border-radius:6px">Nahrávam video…</span>');
    try{
      const ext=file.type.includes('webm')?'webm':file.type.includes('quicktime')?'mov':'mp4';
      const d=new Date(),path=`${currentUser.id}/assets/broll-video/${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${crypto.randomUUID()}.${ext}`;
      const {error}=await client.storage.from(BUCKET).upload(path,file,{contentType:file.type||'video/mp4',cacheControl:'31536000',upsert:false});if(error)throw error;
      const {data}=client.storage.from(BUCKET).getPublicUrl(path);if(!data?.publicUrl)throw new Error('Úložisko nevrátilo verejnú adresu videa.');
      state.items[i].url=data.publicUrl;if(!state.items[i].label)state.items[i].label=`Živý B-roll ${i+1}`;render();await persistNow();
    }catch(error){alert(`Videoklip sa nepodarilo uložiť: ${error.message}`);render();}
  }

  function collect(){return {version:1,items:state.items.filter(x=>x.url||x.label||x.credit).map((x,i)=>({...x,order:i+1,mediaType:'video'}))};}
  function fill(v={}){state.items=normalize(v?.items||[]);render();}
  function currentDraft(){const id=clean($('#draft-id')?.value);return (typeof drafts!=='undefined'?drafts:[]).find(d=>String(d.id)===id);}
  function restore(){const d=currentDraft();fill(d?.shortVideo?.motionBroll||{});}
  let timer=null;
  function persistSoon(){clearTimeout(timer);timer=setTimeout(persistNow,450);}
  async function persistNow(){
    const draftId=clean($('#draft-id')?.value);if(!draftId||!currentUser||saving)return;saving=true;
    try{
      const d=typeof readForm==='function'?readForm():null;
      const shortVideo={...(d?.shortVideo||currentDraft()?.shortVideo||{}),motionBroll:collect()};
      const {error}=await client.from('drafts').update({short_video:shortVideo,updated_at:new Date().toISOString()}).eq('id',draftId).eq('user_id',currentUser.id);if(error)throw error;
      const local=currentDraft();if(local)local.shortVideo=shortVideo;
    }catch(error){console.warn('Motion B-roll save:',error);}finally{saving=false;}
  }
  function wrap(){
    try{const f=readForm;readForm=function(){const d=f();return {...d,shortVideo:{...(d.shortVideo||{}),motionBroll:collect()}};};}catch{}
    try{const f=selectDraft;selectDraft=function(id){f(id);setTimeout(restore,160);};}catch{}
    try{const f=resetForm;resetForm=function(){f();setTimeout(()=>fill({}),100);};}catch{}
  }

  window.objektiv24MotionBroll={getItems:()=>state.items.filter(x=>/^https:\/\//i.test(x.url)).map(x=>({...x,mediaType:'video'})),getState:collect,refresh:restore};
  boot();
})();