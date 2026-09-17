(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const short = (v, n=88) => { const t=clean(v); if(t.length<=n)return t; const c=t.slice(0,n-1); const i=c.lastIndexOf(' '); return (i>45?c.slice(0,i):c).replace(/[,:;\-–—]+$/,'')+'…'; };
  const sentences = v => clean(v).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
  const fileSafe = v => clean(v).toLocaleLowerCase('sk').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60) || 'video-objektiv24';
  const wordCount = v => clean(v) ? clean(v).split(/\s+/).length : 0;

  let pro = {coverTitle:'', coverKicker:'V SKRATKE', safeZones:true, pace:'normal'};

  function wait(tries=0){
    const section=$('.short-video-section');
    if(!section){ if(tries<100)setTimeout(()=>wait(tries+1),180); return; }
    if($('#video-pro-panel'))return;
    build(section);
    wirePersistence();
    refresh();
  }

  function build(section){
    const style=document.createElement('style');
    style.textContent=`
      .video-pro-panel{margin-top:16px;border:1px solid #dfe1e5;background:linear-gradient(180deg,#fff,#fafbfc);border-radius:12px;padding:15px}.video-pro-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.video-pro-head h4{margin:0 0 4px;font-size:.94rem}.video-pro-head p{margin:0;color:#747983;font-size:.76rem;line-height:1.5}.video-pro-score{flex:none;min-width:74px;text-align:center;border-radius:999px;background:#eef0f2;color:#60656d;padding:8px 10px;font-size:.69rem;font-weight:950}.video-pro-score.good{background:#eef6cf;color:#506112}.video-pro-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:12px;margin-top:13px}.video-pro-card{border:1px solid #e1e3e6;background:#fff;border-radius:9px;padding:12px}.video-pro-card h5{margin:0 0 9px;font-size:.78rem}.video-pro-checks{display:grid;grid-template-columns:1fr 1fr;gap:6px}.video-pro-check{display:flex;gap:7px;align-items:flex-start;font-size:.7rem;color:#6d727a}.video-pro-check i{font-style:normal;width:17px;height:17px;border-radius:50%;display:inline-grid;place-items:center;background:#eceef0;color:#8b9097;font-size:.62rem;flex:none}.video-pro-check.ok{color:#4c5d18}.video-pro-check.ok i{background:#dff08c;color:#354600}.video-hook-options{display:grid;gap:7px}.video-hook-option{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border:1px solid #e0e2e6;border-radius:8px;padding:9px 10px;background:#fbfbfc}.video-hook-option span{font-size:.72rem;line-height:1.38;color:#4f545b}.video-hook-option button,.video-pro-actions button{border:1px solid #c8cbd0;background:#fff;color:#3d4148;border-radius:6px;padding:7px 9px;font-weight:850;font-size:.68rem;cursor:pointer}.video-hook-option button:hover,.video-pro-actions button:hover{background:#f2f3f4}.video-pro-fields{display:grid;grid-template-columns:1fr 140px;gap:10px}.video-pro-fields .wide{grid-column:1/-1}.video-pro-fields label{font-size:.7rem;color:#6c7179}.video-pro-fields input,.video-pro-fields select{width:100%;margin-top:5px}.video-pro-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.video-pro-actions .primary{background:#303136;color:#ceef26;border-color:#303136}.video-cover-preview{position:relative;aspect-ratio:9/16;max-width:180px;border-radius:14px;overflow:hidden;background:#09131b;margin-top:10px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.16)}.video-cover-preview .bg{position:absolute;inset:0;background-size:cover;background-position:center}.video-cover-preview .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,8,12,.08),rgba(4,8,12,.85) 72%,rgba(4,8,12,.96))}.video-cover-preview .copy{position:absolute;z-index:2;left:13px;right:13px;bottom:17px}.video-cover-preview .copy b{display:inline-block;background:#ceef26;color:#11151b;padding:4px 6px;border-radius:999px;font-size:.5rem;margin-bottom:7px}.video-cover-preview .copy strong{display:block;font-size:1rem;line-height:1.04;letter-spacing:-.025em}.video-cover-preview .brand{position:absolute;z-index:2;left:12px;top:12px;font-size:.61rem;font-weight:950}.video-safe-zone{position:absolute;z-index:8;pointer-events:none;border:1px dashed rgba(206,239,38,.75);background:rgba(206,239,38,.045)}.video-safe-zone.top{left:7%;right:7%;top:5%;height:8%}.video-safe-zone.right{right:2%;top:15%;bottom:20%;width:15%}.video-safe-zone.bottom{left:7%;right:18%;bottom:3%;height:16%}.video-safe-label{position:absolute;z-index:9;pointer-events:none;right:4%;bottom:4%;font-size:.48rem;color:#dff36b;background:rgba(0,0,0,.45);padding:3px 5px;border-radius:4px}.video-pro-note{font-size:.69rem;color:#7a7f87;line-height:1.5;margin:9px 0 0}@media(max-width:800px){.video-pro-grid{grid-template-columns:1fr}.video-pro-checks{grid-template-columns:1fr}.video-pro-fields{grid-template-columns:1fr}.video-pro-fields .wide{grid-column:auto}}
    `;
    document.head.appendChild(style);

    const panel=document.createElement('div');
    panel.id='video-pro-panel'; panel.className='video-pro-panel';
    panel.innerHTML=`
      <div class="video-pro-head"><div><h4>Video PRO</h4><p>Kontrola pripravenosti, hook varianty, cover, bezpečné zóny a export pre finálny render.</p></div><span id="video-pro-score" class="video-pro-score">0 %</span></div>
      <div class="video-pro-grid">
        <div class="video-pro-card"><h5>Kontrola pripravenosti</h5><div id="video-pro-checks" class="video-pro-checks"></div><div class="video-pro-actions"><button id="video-export-srt" type="button">Stiahnuť SRT</button><button id="video-export-json" type="button">Export produkcie JSON</button><button id="video-copy-render" class="primary" type="button">Kopírovať zadanie pre finálny render</button></div><p class="video-pro-note">SRT a produkčný balík zostanú použiteľné aj keby sme neskôr zmenili video službu.</p></div>
        <div class="video-pro-card"><h5>Cover videa</h5><div class="video-pro-fields"><label class="wide">Text na coveri<input id="video-cover-title" maxlength="90" placeholder="Krátky titulok na náhľad videa"></label><label>Kicker<input id="video-cover-kicker" maxlength="28" value="V SKRATKE"></label><label>Tempo<select id="video-pace"><option value="calm">Pokojné</option><option value="normal" selected>Normálne</option><option value="fast">Svižné</option></select></label></div><div id="video-cover-preview" class="video-cover-preview"><div class="bg"></div><div class="shade"></div><div class="brand">OBJEKTÍV24</div><div class="copy"><b id="video-cover-kicker-preview">V SKRATKE</b><strong id="video-cover-title-preview">Krátke vysvetlenie témy</strong></div></div></div>
        <div class="video-pro-card"><h5>3 bezpečné hooky bez clickbaitu</h5><div id="video-hook-options" class="video-hook-options"></div></div>
        <div class="video-pro-card"><h5>Náhľad sociálnych sietí</h5><label style="display:flex;gap:8px;align-items:flex-start;font-size:.72rem;color:#5e636b"><input id="video-safe-zones" type="checkbox" checked style="width:auto;margin-top:2px"><span>Zobraziť bezpečné zóny pre TikTok/Reels — text nebude pod pravými ikonami ani spodným popisom.</span></label><p class="video-pro-note">Bezpečné zóny sa zobrazujú iba v redakčnom náhľade, nie vo výslednom videu.</p></div>
      </div>`;
    const note=section.querySelector('.video-note');
    note ? note.before(panel) : section.appendChild(panel);

    $('#video-cover-title').addEventListener('input',()=>{pro.coverTitle=$('#video-cover-title').value;updateCover();refreshChecks()});
    $('#video-cover-kicker').addEventListener('input',()=>{pro.coverKicker=$('#video-cover-kicker').value;updateCover()});
    $('#video-pace').addEventListener('change',()=>{pro.pace=$('#video-pace').value;refreshChecks()});
    $('#video-safe-zones').addEventListener('change',()=>{pro.safeZones=$('#video-safe-zones').checked;applySafeZones()});
    $('#video-export-srt').addEventListener('click',exportSrt);
    $('#video-export-json').addEventListener('click',exportJson);
    $('#video-copy-render').addEventListener('click',copyRenderBrief);
    ['#video-hook','#video-script','#video-captions','#video-cta','#video-duration','#title','#intro','#what-it-means','#next-step','#image-type'].forEach(sel=>$(sel)?.addEventListener('input',refresh));
    $('#video-duration')?.addEventListener('change',refresh);

    const observer=new MutationObserver(()=>{applySafeZones();updateCover()});
    observer.observe(section,{childList:true,subtree:true});
  }

  function imageUrl(){return $('#image-preview img[src]')?.src || ''}
  function updateCover(){
    const title=clean(pro.coverTitle)||short($('#video-hook')?.value||$('#title')?.value,72)||'Krátke vysvetlenie témy';
    const kicker=clean(pro.coverKicker)||'V SKRATKE';
    const bg=$('#video-cover-preview .bg'); const src=imageUrl();
    if(bg) bg.style.backgroundImage=src?`url("${src.replace(/"/g,'%22')}")`:'linear-gradient(145deg,#1b3b49,#081018)';
    $('#video-cover-title-preview').textContent=title;
    $('#video-cover-kicker-preview').textContent=kicker;
  }

  function hookVariants(){
    const title=short($('#title')?.value,92);
    const intro=sentences($('#intro')?.value)[0]||'';
    const meaning=sentences($('#what-it-means')?.value)[0]||'';
    const next=sentences($('#next-step')?.value)[0]||'';
    const candidates=[
      {label:'FAKT',text:title || short(intro,92)},
      {label:'ČO TO ZNAMENÁ',text:short(meaning || intro || title,100)},
      {label:'PRAKTICKY',text:short(next || meaning || intro || title,100)}
    ];
    const seen=new Set();
    return candidates.filter(x=>{const k=clean(x.text).toLowerCase(); if(!k||seen.has(k))return false; seen.add(k); return true;});
  }

  function renderHooks(){
    const box=$('#video-hook-options'); if(!box)return;
    const variants=hookVariants();
    box.innerHTML=variants.length?variants.map((v,i)=>`<div class="video-hook-option"><span><b>${esc(v.label)}</b> · ${esc(v.text)}</span><button type="button" data-hook-index="${i}">Použiť</button></div>`).join(''):'<div class="video-pro-note">Doplňte titulok alebo text článku a varianty sa pripravia automaticky.</div>';
    $$('[data-hook-index]').forEach(btn=>btn.addEventListener('click',()=>{const v=variants[Number(btn.dataset.hookIndex)]; if(!v)return; const hook=$('#video-hook'); hook.value=v.text; hook.dispatchEvent(new Event('input',{bubbles:true})); if(!clean(pro.coverTitle)){pro.coverTitle=v.text;$('#video-cover-title').value=v.text;} updateCover();refreshChecks();}));
  }

  function checks(){
    const d=Math.max(10,Number($('#video-duration')?.value||30));
    const script=clean($('#video-script')?.value), words=wordCount(script);
    const target=d<=20?[30,55]:d<=30?[45,75]:[65,100];
    return [
      ['Relevantný obrázok',Boolean(imageUrl())],
      ['Hook do 2–3 sekúnd',clean($('#video-hook')?.value).length>=12 && clean($('#video-hook')?.value).length<=110],
      ['Voiceover pripravený',words>=target[0] && words<=target[1]],
      ['Titulky pripravené',captionBlocks().length>=2],
      ['CTA na Objektív24',/objektiv24/i.test($('#video-cta')?.value||'')],
      ['Cover videa',clean(pro.coverTitle||$('#video-hook')?.value||$('#title')?.value).length>=12],
      ['Formát 9:16',($('#video-format')?.value||'9:16')==='9:16'],
      ['Bezpečné zóny skontrolované',Boolean(pro.safeZones)]
    ];
  }

  function refreshChecks(){
    const data=checks(), ok=data.filter(x=>x[1]).length, pct=Math.round(ok/data.length*100);
    const score=$('#video-pro-score'); if(score){score.textContent=`${pct} %`;score.classList.toggle('good',pct>=88)}
    const box=$('#video-pro-checks'); if(box)box.innerHTML=data.map(([label,done])=>`<div class="video-pro-check ${done?'ok':''}"><i>${done?'✓':'•'}</i><span>${esc(label)}</span></div>`).join('');
  }

  function captionBlocks(){
    let blocks=String($('#video-captions')?.value||'').split(/\n+/).map(v=>clean(v.replace(/^\d+[.)]\s*/,''))).filter(Boolean);
    if(!blocks.length) blocks=sentences($('#video-script')?.value);
    return blocks;
  }

  function srtTime(seconds){
    const ms=Math.max(0,Math.round(seconds*1000)), h=Math.floor(ms/3600000), m=Math.floor(ms%3600000/60000), s=Math.floor(ms%60000/1000), x=ms%1000;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(x).padStart(3,'0')}`;
  }
  function makeSrt(){
    const blocks=captionBlocks(), d=Math.max(5,Number($('#video-duration')?.value||30)); if(!blocks.length)return '';
    const start=0, end=Math.max(1,d-2.5), span=end-start;
    return blocks.map((text,i)=>`${i+1}\n${srtTime(start+span*i/blocks.length)} --> ${srtTime(start+span*(i+1)/blocks.length)}\n${text}\n`).join('\n');
  }
  function download(name,text,type){
    const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportSrt(){
    const srt=makeSrt(); if(!srt){alert('Najprv pripravte video balík a titulky.');return}
    download(`${fileSafe($('#title')?.value)}.srt`,srt,'application/x-subrip;charset=utf-8');
  }

  function productionPack(){
    return {
      brand:'Objektív24', platform:['TikTok','Instagram Reels','YouTube Shorts'], aspectRatio:$('#video-format')?.value||'9:16', duration:Number($('#video-duration')?.value||30), pace:pro.pace,
      title:clean($('#title')?.value), hook:clean($('#video-hook')?.value), voiceover:clean($('#video-script')?.value), captions:captionBlocks(), shotList:String($('#video-shots')?.value||'').trim(), cta:clean($('#video-cta')?.value), post: String($('#video-post')?.value||'').trim(),
      cover:{title:clean(pro.coverTitle)||clean($('#video-hook')?.value)||short($('#title')?.value,72),kicker:clean(pro.coverKicker)||'V SKRATKE'},
      image:{url:imageUrl(),type:$('#image-type')?.value||'',alt:$('#image-alt')?.value||'',credit:$('#image-credit')?.value||'',license:$('#image-license')?.value||'',position:$('#image-focal .is-active')?.dataset?.position||'50% 50%'},
      safeZones:Boolean(pro.safeZones), srt:makeSrt(), generatedAt:new Date().toISOString()
    };
  }
  function exportJson(){download(`${fileSafe($('#title')?.value)}-video.json`,JSON.stringify(productionPack(),null,2),'application/json;charset=utf-8')}

  async function copyRenderBrief(){
    const p=productionPack();
    const text=`Vytvor finálne vertikálne video Objektív24.\nFormát: ${p.aspectRatio}, približne ${p.duration} sekúnd, tempo: ${p.pace}.\nŠtýl: moderné slovenské vysvetľujúce spravodajstvo, čisté titulky, prirodzené prechody, bez clickbaitu.\nCover: ${p.cover.kicker} — ${p.cover.title}\nHook: ${p.hook}\nVoiceover: ${p.voiceover}\nZábery: ${p.shotList}\nCTA: ${p.cta}\nHlavný obrázok: ${p.image.url || 'nie je priložený'}\nDôležité: nepoužívaj falošné dokumentárne zábery; pri ilustračných alebo AI vizuáloch ich nepodávaj ako autentický záznam udalosti.`;
    try{await navigator.clipboard.writeText(text);const b=$('#video-copy-render');const old=b.textContent;b.textContent='Skopírované ✓';setTimeout(()=>b.textContent=old,1300)}catch{prompt('Skopírujte zadanie:',text)}
  }

  function applySafeZones(){
    const phone=$('#video-phone'); if(!phone)return;
    phone.querySelectorAll('.video-safe-zone,.video-safe-label').forEach(n=>n.remove());
    if(!pro.safeZones)return;
    ['top','right','bottom'].forEach(cls=>{const d=document.createElement('div');d.className=`video-safe-zone ${cls}`;phone.appendChild(d)});
    const label=document.createElement('div');label.className='video-safe-label';label.textContent='SAFE ZONE';phone.appendChild(label);
  }

  function collectPro(){
    return {coverTitle:clean($('#video-cover-title')?.value),coverKicker:clean($('#video-cover-kicker')?.value)||'V SKRATKE',safeZones:Boolean($('#video-safe-zones')?.checked),pace:$('#video-pace')?.value||'normal'};
  }
  function fillPro(value={}){
    pro={coverTitle:value.coverTitle||'',coverKicker:value.coverKicker||'V SKRATKE',safeZones:value.safeZones!==false,pace:value.pace||'normal'};
    if($('#video-cover-title'))$('#video-cover-title').value=pro.coverTitle;
    if($('#video-cover-kicker'))$('#video-cover-kicker').value=pro.coverKicker;
    if($('#video-safe-zones'))$('#video-safe-zones').checked=pro.safeZones;
    if($('#video-pace'))$('#video-pace').value=pro.pace;
    updateCover();renderHooks();refreshChecks();applySafeZones();
  }

  function wirePersistence(){
    if(typeof readForm==='function'){
      const oldRead=readForm; readForm=function(){const d=oldRead();return {...d,shortVideo:{...(d.shortVideo||{}),pro:collectPro()}}};
    }
    if(typeof selectDraft==='function'){
      const oldSelect=selectDraft; selectDraft=function(id){oldSelect(id);setTimeout(()=>{const d=(typeof drafts!=='undefined'?drafts:[]).find(x=>x.id===id);fillPro(d?.shortVideo?.pro||{})},0)};
    }
    if(typeof resetForm==='function'){
      const oldReset=resetForm; resetForm=function(){oldReset();setTimeout(()=>fillPro({}),0)};
    }
  }

  function refresh(){
    updateCover();renderHooks();refreshChecks();applySafeZones();
  }

  wait();
})();