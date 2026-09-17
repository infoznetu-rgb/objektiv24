(() => {
  const $ = s => document.querySelector(s);
  const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const BUCKET = 'article-images';
  const W = 1080, H = 1920;
  let currentJob = null;
  let pollTimer = null;
  let configured = false;
  let previewAudio = null;

  function boot(tries = 0) {
    const pro = $('#video-pro-panel');
    if (!pro || typeof client === 'undefined') {
      if (tries < 120) setTimeout(() => boot(tries + 1), 180);
      return;
    }
    if ($('#heygen-render-panel')) return;
    build(pro);
    wrapDraftNavigation();
    setTimeout(loadLatestRender, 120);
  }

  function build(pro) {
    const style = document.createElement('style');
    style.textContent = `
      .heygen-render{margin-top:14px;border:1px solid #d8dce1;background:#fff;border-radius:12px;padding:15px}.heygen-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.heygen-head h4{margin:0 0 5px;font-size:.95rem}.heygen-head p{margin:0;color:#717780;font-size:.75rem;line-height:1.48;max-width:720px}.heygen-pill{flex:none;border-radius:999px;padding:7px 10px;background:#eef0f2;color:#626871;font-size:.66rem;font-weight:950}.heygen-pill.ok{background:#eaf5bb;color:#4b5d0d}.heygen-pill.busy{background:#eaf2fb;color:#335d82}.heygen-pill.fail{background:#fff0e8;color:#8a4f2f}.heygen-grid{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:end;margin-top:13px}.heygen-grid label{font-size:.7rem;color:#686e77}.heygen-grid select{display:block;width:100%;margin-top:5px}.heygen-actions{display:flex;gap:7px;flex-wrap:wrap}.heygen-actions button{border:1px solid #c7cbd1;background:#fff;border-radius:6px;padding:9px 11px;font-weight:850;font-size:.69rem;cursor:pointer}.heygen-actions .render{background:#303136;color:#ceef26;border-color:#303136}.heygen-actions button:disabled{opacity:.5;cursor:not-allowed}.heygen-progress{margin-top:12px}.heygen-progress-track{height:8px;background:#edf0f2;border-radius:999px;overflow:hidden}.heygen-progress-track i{display:block;height:100%;width:0;background:#303136;transition:width .35s ease}.heygen-progress-meta{display:flex;justify-content:space-between;gap:12px;margin-top:6px;font-size:.68rem;color:#747a82}.heygen-message{margin-top:11px;padding:10px 12px;border-left:3px solid #b7c53c;background:#f8faea;color:#5a6141;font-size:.73rem;line-height:1.5}.heygen-message.fail{border-left-color:#c98a58;background:#fff4e9;color:#754f35}.heygen-result{margin-top:13px}.heygen-result video{display:block;width:min(100%,360px);aspect-ratio:9/16;background:#071018;border-radius:14px;object-fit:contain}.heygen-result-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.heygen-result-actions a{display:inline-flex;text-decoration:none;border:1px solid #c7cbd1;background:#fff;color:#3a3e44;border-radius:6px;padding:8px 10px;font-weight:850;font-size:.69rem}.heygen-result-actions a.primary{background:#303136;color:#ceef26;border-color:#303136}.heygen-setup{margin-top:10px;font-size:.7rem;color:#777d85;line-height:1.45}.heygen-voice-row{display:grid;grid-template-columns:1fr auto;gap:7px}.heygen-preview-voice{margin-top:5px;border:1px solid #c7cbd1;background:#fff;border-radius:6px;padding:8px 10px;cursor:pointer}.heygen-mode-note{display:inline-flex;margin-top:8px;border-radius:999px;padding:5px 8px;background:#f1f3f4;color:#5f6870;font-size:.63rem;font-weight:900;letter-spacing:.03em}.heygen-features{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.heygen-features span{display:inline-flex;border-radius:999px;background:#eef3d5;color:#526014;padding:5px 8px;font-size:.61rem;font-weight:900}@media(max-width:760px){.heygen-grid{grid-template-columns:1fr}.heygen-actions{width:100%}.heygen-actions button{flex:1}.heygen-head{display:block}.heygen-pill{display:inline-flex;margin-top:9px}}
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'heygen-render-panel';
    panel.className = 'heygen-render';
    panel.innerHTML = `
      <div class="heygen-head">
        <div><h4>Finálne video · HeyGen Studio</h4><p>Objektív24 automaticky pripraví päť vertikálnych scén: hook, hlavný fakt, význam, praktický krok a záverečnú kartu. Hovorený text sa rozdelí medzi scény a titulky sa vypália priamo do videa.</p><span class="heygen-mode-note">STUDIO DIRECT · 5 SCÉN · BEZ VIDEO AGENTA</span><div class="heygen-features"><span>9:16 · 1080p</span><span>Objektív24 dizajn</span><span>Slovenský voiceover</span><span>Vypálené titulky + SRT</span></div></div>
        <span id="heygen-pill" class="heygen-pill">KONTROLA</span>
      </div>
      <div class="heygen-grid">
        <label>Profesionálny hlas
          <div class="heygen-voice-row"><select id="heygen-voice" disabled><option value="">Načítavam…</option></select><button id="heygen-preview-voice" class="heygen-preview-voice" type="button" title="Prehrať ukážku hlasu">▶</button></div>
        </label>
        <div class="heygen-actions"><button id="heygen-connect" type="button">Skontrolovať HeyGen</button><button id="heygen-refresh" type="button">Obnoviť stav</button><button id="heygen-render" class="render" type="button">✦ Vytvoriť finálne video</button></div>
      </div>
      <div class="heygen-progress"><div class="heygen-progress-track"><i id="heygen-progress-bar"></i></div><div class="heygen-progress-meta"><span id="heygen-status">Kontrolujem pripojenie…</span><strong id="heygen-percent">0 %</strong></div></div>
      <div id="heygen-message" class="heygen-message" hidden></div>
      <div id="heygen-result" class="heygen-result"></div>
      <p class="heygen-setup">Pred renderom sa vytvoria vlastné 1080 × 1920 vizuály Objektív24 a uložia sa do úložiska článku. HeyGen už iba spoľahlivo spojí scény, hlas a titulky do MP4.</p>`;
    pro.after(panel);

    $('#heygen-connect').addEventListener('click', () => checkConnection(true));
    $('#heygen-refresh').addEventListener('click', () => currentJob ? pollStatus(true) : loadLatestRender());
    $('#heygen-render').addEventListener('click', createRender);
    $('#heygen-preview-voice').addEventListener('click', previewVoice);
    $('#heygen-voice').addEventListener('change', () => { if (previewAudio) { previewAudio.pause(); previewAudio = null; } });
    checkConnection(false);
  }

  async function invoke(action, body = {}) {
    const { data, error } = await client.functions.invoke('heygen-render', { body: { action, ...body } });
    if (!error) return data;
    let details = null;
    try { if (error.context?.clone) details = await error.context.clone().json(); } catch {}
    const e = new Error(details?.error?.message || error.message || 'Serverová požiadavka zlyhala.');
    e.code = details?.error?.code || '';
    e.status = error.context?.status || 0;
    throw e;
  }

  function setPill(text, mode = '') {
    const p = $('#heygen-pill');
    if (!p) return;
    p.textContent = text;
    p.className = 'heygen-pill' + (mode ? ' ' + mode : '');
  }
  function message(text, fail = false) {
    const el = $('#heygen-message');
    if (!el) return;
    if (!text) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.className = 'heygen-message' + (fail ? ' fail' : '');
    el.textContent = text;
  }
  function setProgress(value, statusText) {
    const n = Math.min(100, Math.max(0, Number(value || 0)));
    const bar = $('#heygen-progress-bar'); if (bar) bar.style.width = `${n}%`;
    const pct = $('#heygen-percent'); if (pct) pct.textContent = `${Math.round(n)} %`;
    const status = $('#heygen-status'); if (status && statusText) status.textContent = statusText;
  }

  async function checkConnection(showSuccess = true) {
    setPill('KONTROLUJEM', 'busy');
    $('#heygen-connect').disabled = true;
    try {
      const data = await invoke('config');
      configured = Boolean(data?.configured);
      if (!configured) throw new Error('HeyGen nie je nakonfigurovaný.');
      setPill('PRIPOJENÉ', 'ok');
      if (showSuccess) message('HeyGen je pripojený. Päťscénový Studio render je pripravený.');
      await loadVoices();
    } catch (error) {
      configured = false;
      setPill('NEPRIPOJENÉ', 'fail');
      message(`HeyGen sa nepodarilo overiť: ${error.message}`, true);
    } finally { $('#heygen-connect').disabled = false; }
  }

  async function loadVoices() {
    const select = $('#heygen-voice');
    if (!select) return;
    select.disabled = true;
    select.innerHTML = '<option>Načítavam slovenské hlasy…</option>';
    try {
      const data = await invoke('voices');
      const voices = Array.isArray(data?.data) ? data.data : [];
      window.objektiv24HeyGenVoices = voices;
      select.innerHTML = '<option value="">Automaticky vybrať slovenský hlas</option>' + voices.map(v => `<option value="${esc(v.voice_id)}">${esc(v.name || 'Hlas')} · ${esc(v.language || 'Slovak')}${v.gender ? ' · ' + esc(v.gender) : ''}</option>`).join('');
      select.disabled = false;
    } catch (error) {
      select.innerHTML = '<option value="">Automatický slovenský hlas</option>';
      select.disabled = false;
      message(`Hlasy sa nepodarilo načítať: ${error.message}`, true);
    }
  }

  function previewVoice() {
    const id = $('#heygen-voice')?.value || '';
    const voices = window.objektiv24HeyGenVoices || [];
    const voice = voices.find(v => v.voice_id === id);
    if (!voice?.preview_audio_url) return message(id ? 'Tento hlas nemá zvukovú ukážku.' : 'Vyberte konkrétny hlas a kliknite na ▶.');
    if (previewAudio) previewAudio.pause();
    previewAudio = new Audio(voice.preview_audio_url);
    previewAudio.play().catch(() => message('Ukážku hlasu sa nepodarilo prehrať.', true));
  }

  function production() {
    const image = (typeof currentImageData !== 'undefined' && currentImageData) || $('#image-preview img[src]')?.src || '';
    return {
      title: clean($('#title')?.value), duration: Number($('#video-duration')?.value || 30), aspectRatio: '9:16', pace: $('#vpro-pace')?.value || 'normal',
      hook: clean($('#video-hook')?.value), voiceover: clean($('#video-script')?.value), captions: String($('#video-captions')?.value || '').trim(),
      shotList: String($('#video-shots')?.value || '').trim(), cta: clean($('#video-cta')?.value), post: String($('#video-post')?.value || '').trim(),
      whatHappened: clean($('#what-happened')?.value), whatItMeans: clean($('#what-it-means')?.value), nextStep: clean($('#next-step')?.value),
      brandTemplate: window.objektiv24VideoBrand?.getTemplate?.() || 'news',
      cover: { title: clean($('#vpro-cover')?.value) || clean($('#video-hook')?.value) || clean($('#title')?.value), kicker: clean($('#vpro-kicker')?.value) || 'V SKRATKE' },
      image: { url: image, type: $('#image-type')?.value || '', alt: $('#image-alt')?.value || '', credit: $('#image-credit')?.value || '', license: $('#image-license')?.value || '' }
    };
  }

  async function ensurePublicImage(draftId, p) {
    let src = String(p?.image?.url || '').trim();
    if (/^https:\/\//i.test(src)) return src;
    if (!/^data:image\//i.test(src) && !/^blob:/i.test(src)) throw new Error('Fotografia nemá verejnú adresu a nedá sa automaticky preniesť. Nahrajte obrázok znova v časti Obrázok článku.');
    message('Pripravujem fotografiu pre HeyGen — starý obrázok presúvam do úložiska Objektív24…');
    setProgress(2, 'Ukladám fotografiu…');
    const response = await fetch(src);
    if (!response.ok) throw new Error('Starý obrázok sa nepodarilo načítať.');
    const blob = await response.blob();
    const mime = blob.type || 'image/jpeg';
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    const d = new Date();
    const path = `${currentUser.id}/assets/render/${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await client.storage.from(BUCKET).upload(path, blob, { contentType:mime, cacheControl:'31536000', upsert:false });
    if (uploadError) throw new Error(`Obrázok sa nepodarilo uložiť: ${uploadError.message}`);
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl || '';
    if (!/^https:\/\//i.test(publicUrl)) throw new Error('Úložisko nevrátilo verejnú adresu obrázka.');
    try { if (typeof currentImageData !== 'undefined') currentImageData = publicUrl; } catch {}
    const img = $('#image-preview img'); if (img) img.src = publicUrl;
    p.image.url = publicUrl;
    const { error: dbError } = await client.from('drafts').update({ image_url:publicUrl, updated_at:new Date().toISOString() }).eq('id', draftId).eq('user_id', currentUser.id);
    if (dbError) console.warn('Obrázok je uložený, ale URL sa nepodarilo zapísať do návrhu:', dbError);
    return publicUrl;
  }

  function sentences(text) {
    return clean(text).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
  }
  function splitVoiceover(text, count = 4) {
    const s = sentences(text);
    if (s.length >= count) {
      const groups = Array.from({length:count}, () => []);
      const target = Math.max(1, Math.ceil(s.reduce((n,x)=>n+x.split(/\s+/).length,0) / count));
      let g = 0, words = 0;
      s.forEach((part, i) => {
        const remainingSentences = s.length - i;
        const remainingGroups = count - g;
        const w = part.split(/\s+/).length;
        if (g < count - 1 && groups[g].length && words + w > target && remainingSentences >= remainingGroups) { g++; words = 0; }
        groups[g].push(part); words += w;
      });
      return groups.map(x => clean(x.join(' '))).filter(Boolean);
    }
    const words = clean(text).split(/\s+/).filter(Boolean);
    const size = Math.ceil(words.length / count);
    return Array.from({length:count}, (_,i) => words.slice(i*size,(i+1)*size).join(' ')).filter(Boolean);
  }
  function firstSentence(text, fallback = '') { return sentences(text)[0] || fallback; }
  function short(text, max = 165) {
    const v = clean(text);
    if (v.length <= max) return v;
    const cut = v.slice(0,max-1), at = cut.lastIndexOf(' ');
    return (at > max * .55 ? cut.slice(0,at) : cut).replace(/[,:;\-–—]+$/,'') + '…';
  }

  function roundRect(ctx,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  }
  function drawCover(ctx,img,x,y,w,h,zoom=1,alpha=1){
    if(!img)return;const iw=img.width,ih=img.height;const scale=Math.max(w/iw,h/ih)*zoom;const sw=w/scale,sh=h/scale;const sx=(iw-sw)/2,sy=(ih-sh)/2;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);ctx.restore();
  }
  function drawContain(ctx,img,x,y,w,h){
    if(!img)return;const scale=Math.min(w/img.width,h/img.height);const dw=img.width*scale,dh=img.height*scale;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  }
  function linesFor(ctx,text,maxWidth,maxLines=5){
    const words=clean(text).split(/\s+/).filter(Boolean), lines=[];let line='';
    for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width<=maxWidth){line=test;}else{if(line)lines.push(line);line=word;if(lines.length===maxLines-1)break;}}
    if(line&&lines.length<maxLines)lines.push(line);return lines;
  }
  function drawLines(ctx,text,x,y,maxWidth,fontSize,maxLines=5,lineHeight=1.08,color='#fff',weight=800){
    let size=fontSize, lines=[];
    do{ctx.font=`${weight} ${size}px Arial, sans-serif`;lines=linesFor(ctx,text,maxWidth,maxLines);if(lines.length<=maxLines)break;size-=4;}while(size>32);
    ctx.fillStyle=color;ctx.textBaseline='top';lines.forEach((line,i)=>ctx.fillText(line,x,y+i*size*lineHeight));
    return y+lines.length*size*lineHeight;
  }
  function brandHeader(ctx){
    ctx.fillStyle='#f7fafb';ctx.font='900 30px Arial, sans-serif';ctx.fillText('OBJEKTÍV',60,65);ctx.fillStyle='#d9ff28';ctx.fillText('24',207,65);
  }
  function pill(ctx,text,x,y){
    ctx.font='900 24px Arial, sans-serif';const width=Math.max(150,ctx.measureText(text).width+38);ctx.fillStyle='#d9ff28';roundRect(ctx,x,y,width,48,24);ctx.fill();ctx.fillStyle='#071019';ctx.textBaseline='middle';ctx.fillText(text,x+19,y+25);ctx.textBaseline='top';
  }
  function footer(ctx){
    ctx.fillStyle='#9eb0ba';ctx.font='700 24px Arial, sans-serif';ctx.fillText('objektiv24.sk',60,1815);
  }
  function baseCanvas(){const c=document.createElement('canvas');c.width=W;c.height=H;return c;}

  function renderSceneCard(bitmap, kind, p, copy) {
    const canvas=baseCanvas(),ctx=canvas.getContext('2d');
    ctx.fillStyle='#03080d';ctx.fillRect(0,0,W,H);
    if(kind==='outro'){
      const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#10232e');g.addColorStop(1,'#03080d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#d9ff28';ctx.fillRect(60,560,92,10);ctx.fillStyle='#f7fafb';ctx.font='900 86px Arial, sans-serif';ctx.fillText('OBJEKTÍV',60,650);ctx.fillStyle='#d9ff28';ctx.fillText('24',475,650);
      ctx.fillStyle='#f7fafb';ctx.font='800 42px Arial, sans-serif';ctx.fillText('Fakty. Kontext. Ďalší krok.',60,790);ctx.fillStyle='#a7b6be';ctx.font='700 34px Arial, sans-serif';ctx.fillText('objektiv24.sk',60,875);ctx.fillStyle='#d9ff28';roundRect(ctx,60,1470,960,3,2);ctx.fill();return canvas;
    }

    if(bitmap){drawCover(ctx,bitmap,0,0,W,H,kind==='hero'?1.02:kind==='fact'?1.14:1.08,.34);}
    const shade=ctx.createLinearGradient(0,250,0,H);shade.addColorStop(0,'rgba(3,8,13,.20)');shade.addColorStop(.48,'rgba(3,8,13,.66)');shade.addColorStop(1,'rgba(3,8,13,.98)');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
    brandHeader(ctx);

    if(kind==='hero'){
      if(bitmap){ctx.save();roundRect(ctx,55,165,970,930,28);ctx.clip();ctx.fillStyle='#10232e';ctx.fillRect(55,165,970,930);drawContain(ctx,bitmap,55,165,970,930);ctx.restore();}
      pill(ctx,p.cover.kicker||'V SKRATKE',60,1165);
      drawLines(ctx,copy,60,1245,940,58,5,1.05,'#f7fafb',900);footer(ctx);return canvas;
    }

    const config={fact:['ČO SA STALO','#d9ff28'],meaning:['ČO TO ZNAMENÁ','#f7fafb'],action:['ČO ĎALEJ','#d9ff28']}[kind]||['V SKRATKE','#d9ff28'];
    pill(ctx,config[0],60,260);
    const cardY=kind==='action'?470:430;
    ctx.fillStyle='rgba(7,19,27,.88)';roundRect(ctx,45,cardY,990,850,34);ctx.fill();ctx.strokeStyle='rgba(217,255,40,.22)';ctx.lineWidth=2;ctx.stroke();
    const accent=kind==='meaning'?'#f7fafb':'#d9ff28';ctx.fillStyle=accent;ctx.fillRect(75,cardY+75,76,8);
    drawLines(ctx,copy,75,cardY+135,930,52,6,1.12,'#f7fafb',850);
    if(kind==='action'){ctx.fillStyle='#d9ff28';ctx.font='900 28px Arial, sans-serif';ctx.fillText('PRAKTICKÝ KROK',75,cardY+690);}
    footer(ctx);return canvas;
  }

  function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Nepodarilo sa vytvoriť obraz scény.')),'image/png',.94));}
  async function loadBitmap(url){
    try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('image fetch');const blob=await r.blob();return await createImageBitmap(blob);}catch(error){console.warn('Video scene image:',error);return null;}
  }
  async function uploadScene(blob,index){
    const d=new Date();const path=`${currentUser.id}/assets/render-scenes/${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${crypto.randomUUID()}-${index}.png`;
    const {error}=await client.storage.from(BUCKET).upload(path,blob,{contentType:'image/png',cacheControl:'31536000',upsert:false});
    if(error)throw new Error(`Scénu ${index} sa nepodarilo uložiť: ${error.message}`);
    const {data}=client.storage.from(BUCKET).getPublicUrl(path);if(!data?.publicUrl)throw new Error(`Scéna ${index} nemá verejnú URL.`);return data.publicUrl;
  }

  async function buildSceneAssets(p) {
    setProgress(3,'Pripravujem 5 scén Objektív24…');
    message('Vytváram päť vertikálnych scén, rozdeľujem voiceover a pripravujem titulky…');
    const parts=splitVoiceover(p.voiceover,4);
    while(parts.length<4)parts.push(parts[parts.length-1]||p.voiceover);
    const bitmap=await loadBitmap(p.image.url);
    const copies=[
      short(p.cover.title||p.hook||p.title,145),
      short(firstSentence(p.whatHappened,parts[1]),170),
      short(firstSentence(p.whatItMeans,parts[2]),170),
      short(firstSentence(p.nextStep,parts[3]),170)
    ];
    const kinds=['hero','fact','meaning','action','outro'];
    const urls=[];
    for(let i=0;i<kinds.length;i++){
      setProgress(3+i,`Pripravujem scénu ${i+1}/5…`);
      if(i===0&&!bitmap){urls.push(p.image.url);continue;}
      const canvas=renderSceneCard(bitmap,kinds[i],p,copies[i]||'');
      const blob=await canvasBlob(canvas);urls.push(await uploadScene(blob,i+1));
    }
    try{bitmap?.close?.();}catch{}
    return [
      {url:urls[0],script:parts[0]},
      {url:urls[1],script:parts[1]},
      {url:urls[2],script:parts[2]},
      {url:urls[3],script:parts[3]},
      {url:urls[4],duration:2.2}
    ];
  }

  async function createRender() {
    const draftId = clean($('#draft-id')?.value);
    const p = production();
    if (!draftId) return alert('Najprv návrh uložte.');
    if (!p.voiceover) return alert('Najprv pripravte video balík — chýba voiceover.');
    if (!p.image.url) return alert('Najprv vyberte relevantný obrázok článku.');
    if (!configured) { await checkConnection(false); if (!configured) return; }
    if (!confirm('Spustiť 5-scénový HeyGen Studio render? Táto akcia môže spotrebovať HeyGen API kredit.')) return;

    stopPolling();$('#heygen-render').disabled = true;setPill('PRIPRAVUJEM', 'busy');
    try {
      await ensurePublicImage(draftId,p);
      p.scenes=await buildSceneAssets(p);
      setProgress(9,'Odosielam 5 scén do HeyGen Studio…');
      message('Scény sú pripravené. HeyGen teraz spojí obraz, slovenský hlas a vypálené titulky.');
      const voiceId=$('#heygen-voice')?.value||'';
      const response=await invoke('render',{draftId,voiceId,production:p});
      const r=response?.data||{};if(!r.video_id)throw new Error('HeyGen nevrátil video_id.');
      const row={user_id:currentUser.id,draft_id:draftId,title:p.title||'Objektív24 video',provider:'heygen-studio',session_id:null,video_id:r.video_id,status:r.status||'processing',progress:Number(r.progress||5),voice_id:r.voice_id||voiceId||null};
      const {data:inserted,error}=await client.from('video_renders').insert(row).select().single();currentJob=error?{...row,id:null}:inserted;
      setPill('RENDERUJE SA','busy');message(`HeyGen Studio prijal ${r.scene_count||5} scén. Stav sa bude obnovovať automaticky.`);renderJob();startPolling();
    } catch (error) {
      setPill('CHYBA','fail');setProgress(0,'Render sa nespustil.');
      if(error?.code==='VIDEO_WRITE_PERMISSION_REQUIRED'||/Video.*Zapis|write|permission|scope/i.test(error?.message||'')) message('HeyGen pripojenie funguje, ale API kľúč nemá právo vytvárať videá. V HeyGen pri API kľúči nastavte „Wideo → Zapis“.',true);
      else message(`Render sa nespustil: ${error.message}`,true);
    } finally {$('#heygen-render').disabled=false;}
  }

  function renderJob() {
    const result=$('#heygen-result');if(!result)return;
    if(!currentJob){result.innerHTML='';setProgress(0,'Zatiaľ nie je spustený nový Studio render.');return;}
    const status=currentJob.status||'processing',progress=Number(currentJob.progress||0);
    setProgress(progress,status==='completed'?'Finálne video je hotové.':status==='failed'?'Render zlyhal.':`HeyGen Studio renderuje · ${progress}%`);
    if(status==='completed'&&currentJob.video_url){
      setPill('HOTOVÉ','ok');message('Hotové 5-scénové video je pripravené. Pred publikovaním ho celé skontrolujte.');
      result.innerHTML=`<video controls playsinline poster="${esc(currentJob.thumbnail_url||'')}" src="${esc(currentJob.video_url)}"></video><div class="heygen-result-actions"><a class="primary" href="${esc(currentJob.video_url)}" target="_blank" rel="noopener">Otvoriť MP4 ↗</a>${currentJob.subtitle_url?`<a href="${esc(currentJob.subtitle_url)}" target="_blank" rel="noopener">Titulky SRT ↗</a>`:''}${currentJob.video_page_url?`<a href="${esc(currentJob.video_page_url)}" target="_blank" rel="noopener">Otvoriť v HeyGen ↗</a>`:''}</div>`;
    } else if(status==='failed'){setPill('ZLYHAL','fail');message(currentJob.failure_message||'HeyGen Studio render zlyhal.',true);result.innerHTML='';}
    else{setPill('RENDERUJE SA','busy');result.innerHTML='';}
  }

  async function pollStatus(manual=false){
    if(!currentJob?.video_id&&!currentJob?.session_id)return;if(manual)message('Obnovujem stav renderu…');
    try{
      const response=await invoke('status',{videoId:currentJob.video_id||'',sessionId:currentJob.session_id||''});const s=response?.data||{};
      currentJob={...currentJob,status:s.status||currentJob.status,progress:Number(s.progress??currentJob.progress??0),video_id:s.video_id||currentJob.video_id||null,video_url:s.video_url||currentJob.video_url||null,thumbnail_url:s.thumbnail_url||currentJob.thumbnail_url||null,subtitle_url:s.subtitle_url||currentJob.subtitle_url||null,video_page_url:s.video_page_url||currentJob.video_page_url||null,failure_message:s.failure_message||null,updated_at:new Date().toISOString()};
      if(currentJob.id)await client.from('video_renders').update({status:currentJob.status,progress:currentJob.progress,video_id:currentJob.video_id,video_url:currentJob.video_url,thumbnail_url:currentJob.thumbnail_url,subtitle_url:currentJob.subtitle_url,video_page_url:currentJob.video_page_url,failure_message:currentJob.failure_message,updated_at:currentJob.updated_at}).eq('id',currentJob.id);
      if(manual)message(currentJob.status==='completed'?'Video je hotové.':currentJob.status==='failed'?(currentJob.failure_message||'Render zlyhal.'):'Stav bol obnovený.',currentJob.status==='failed');renderJob();if(['completed','failed'].includes(currentJob.status))stopPolling();
    }catch(error){if(manual)message(`Stav sa nepodarilo obnoviť: ${error.message}`,true);}
  }
  function startPolling(){stopPolling();pollStatus();pollTimer=setInterval(pollStatus,8000);}function stopPolling(){if(pollTimer)clearInterval(pollTimer);pollTimer=null;}
  async function loadLatestRender(){stopPolling();currentJob=null;renderJob();const draftId=clean($('#draft-id')?.value);if(!draftId||!currentUser)return;const{data,error}=await client.from('video_renders').select('*').eq('draft_id',draftId).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error||!data)return;currentJob=data;renderJob();if(!['completed','failed'].includes(currentJob.status))startPolling();}
  function wrapDraftNavigation(){try{const original=selectDraft;selectDraft=function(id){original(id);setTimeout(loadLatestRender,100);};}catch{}try{const original=resetForm;resetForm=function(){original();stopPolling();currentJob=null;renderJob();};}catch{}window.addEventListener('beforeunload',stopPolling);}
  boot();
})();