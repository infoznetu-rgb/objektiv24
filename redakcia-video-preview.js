(() => {
  const $ = s => document.querySelector(s);
  let timer = null, startedAt = 0, elapsedBefore = 0, speaking = false;

  const style = document.createElement('style');
  style.textContent = `
    .video-preview-wrap{margin-top:16px;border:1px solid #dfe1e5;background:#f8f9fa;border-radius:12px;padding:16px}.video-preview-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.video-preview-head strong{font-size:.86rem}.video-preview-head small{color:#737780}.video-preview-grid{display:grid;grid-template-columns:minmax(220px,310px) 1fr;gap:18px;align-items:start}.video-phone{position:relative;aspect-ratio:9/16;border-radius:24px;overflow:hidden;background:#071018;box-shadow:0 16px 44px rgba(0,0,0,.22);isolation:isolate}.video-phone-bg{position:absolute;inset:0;background-position:center;background-size:cover;transform:scale(1.025)}.video-phone-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,10,15,.18),rgba(4,10,15,.24) 38%,rgba(4,10,15,.88) 100%)}.video-phone-brand{position:absolute;z-index:3;left:16px;top:18px;display:flex;align-items:center;gap:4px;color:#fff;font-size:.78rem;font-weight:950;letter-spacing:-.04em}.video-phone-brand b{background:#ceef26;color:#17191d;border-radius:5px;padding:2px 5px;font-size:.64rem}.video-phone-tag{position:absolute;z-index:3;right:14px;top:17px;background:rgba(0,0,0,.45);color:#e4e8eb;border-radius:999px;padding:5px 8px;font-size:.52rem;backdrop-filter:blur(8px)}.video-phone-copy{position:absolute;z-index:3;left:18px;right:18px;bottom:58px;color:#fff;text-shadow:0 2px 18px rgba(0,0,0,.75)}.video-phone-copy .kicker{display:inline-block;background:#ceef26;color:#11151b;border-radius:999px;padding:5px 8px;font-size:.58rem;font-weight:950;margin-bottom:10px}.video-phone-copy h4{font-size:clamp(1.25rem,4vw,1.85rem);line-height:1.02;letter-spacing:-.035em;margin:0 0 9px;text-wrap:balance}.video-phone-copy p{font-size:.82rem;line-height:1.35;margin:0;color:#f1f4f5}.video-phone-progress{position:absolute;z-index:4;left:14px;right:14px;bottom:20px;height:4px;background:rgba(255,255,255,.24);border-radius:99px;overflow:hidden}.video-phone-progress i{display:block;height:100%;width:0;background:#ceef26}.video-phone-time{position:absolute;z-index:4;right:15px;bottom:28px;color:#fff;font-size:.58rem}.video-preview-controls{display:flex;gap:8px;flex-wrap:wrap}.video-preview-controls button{border:1px solid #c9ccd1;background:#fff;color:#34373d;border-radius:7px;padding:10px 12px;font-weight:850;cursor:pointer}.video-preview-controls .main{border:0;background:#303136;color:#ceef26}.video-preview-help{margin:13px 0 0;color:#747982;font-size:.76rem;line-height:1.5}.video-preview-scenes{margin-top:14px;display:grid;gap:7px}.video-preview-scene{display:grid;grid-template-columns:42px 1fr;gap:8px;border-top:1px solid #e1e3e6;padding-top:8px;font-size:.73rem}.video-preview-scene b{color:#77808a}.video-preview-scene span{color:#4e5259}.video-preview-empty{padding:18px;border:1px dashed #cfd3d8;border-radius:9px;color:#777c84;font-size:.78rem}.video-preview-wrap[hidden]{display:none}@media(max-width:720px){.video-preview-grid{grid-template-columns:1fr}.video-phone{width:min(310px,100%);margin:auto}}
  `;
  document.head.appendChild(style);

  function waitForVideoUi(tries=0){
    const actions = $('.short-video-section .video-actions');
    if(!actions){ if(tries<80) setTimeout(()=>waitForVideoUi(tries+1),200); return; }
    if($('#video-preview-button')) return;

    const button = document.createElement('button');
    button.id='video-preview-button'; button.type='button'; button.textContent='▶ Náhľad videa';
    actions.prepend(button);

    const voice = document.createElement('button');
    voice.id='video-preview-voice'; voice.type='button'; voice.textContent='🔊 Náhľad s hlasom';
    actions.insertBefore(voice, actions.children[1] || null);

    const wrap = document.createElement('div');
    wrap.id='video-preview-wrap'; wrap.className='video-preview-wrap'; wrap.hidden=true;
    wrap.innerHTML=`<div class="video-preview-head"><div><strong>Simulovaný náhľad 9:16</strong><br><small>Rozloženie, titulky a časovanie pred finálnym renderom.</small></div><button id="video-preview-close" type="button" aria-label="Zavrieť náhľad">✕</button></div><div id="video-preview-content"></div>`;
    actions.closest('.short-video-section').appendChild(wrap);

    button.addEventListener('click',()=>openPreview(false));
    voice.addEventListener('click',()=>openPreview(true));
    $('#video-preview-close').addEventListener('click',closePreview);
  }

  function clean(v){return String(v||'').replace(/^\s*\d+[.)]\s*/,'').replace(/\s+/g,' ').trim()}
  function captionBlocks(){
    const raw=$('#video-captions')?.value||'';
    let blocks=raw.split(/\n+/).map(clean).filter(Boolean);
    if(!blocks.length){
      const script=$('#video-script')?.value||'';
      blocks=script.split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
    }
    return blocks;
  }
  function imageUrl(){
    const img=$('#image-preview img[src]'); if(img?.src)return img.src;
    const live=$('#live-image'); const bg=live?.style?.backgroundImage||''; const m=bg.match(/url\(["']?(.*?)["']?\)/); return m?.[1]||'';
  }
  function imagePosition(){return $('#image-focal .is-active')?.dataset?.position || '50% 50%'}
  function imageTypeLabel(){
    const t=$('#image-type')?.value||'';
    return t==='ai'?'AI ILUSTRÁCIA':t==='own'?'VLASTNÁ FOTOGRAFIA':t==='official'?'OFICIÁLNY OBRÁZOK':'ILUSTRAČNÁ FOTOGRAFIA';
  }
  function duration(){return Math.max(5,Number($('#video-duration')?.value||30))}

  function scenes(){
    const blocks=captionBlocks(); const d=duration(); const out=[];
    const hook=clean($('#video-hook')?.value)||clean($('#title')?.value);
    const cta=clean($('#video-cta')?.value)||'Viac na objektiv24.sk.';
    out.push({from:0,to:Math.min(3,d),kicker:'V SKRATKE',title:hook,text:''});
    const bodyStart=Math.min(3,d), bodyEnd=Math.max(bodyStart,d-3), span=Math.max(0,bodyEnd-bodyStart);
    const usable=blocks.filter(b=>b!==hook).slice(0,Math.max(1,blocks.length));
    if(usable.length){usable.forEach((b,i)=>{const from=bodyStart+span*i/usable.length;const to=bodyStart+span*(i+1)/usable.length;out.push({from,to,kicker:i===0?'FAKT':'KONTEXT',title:'',text:b})})}
    out.push({from:Math.max(bodyStart,d-3),to:d,kicker:'OBJEKTÍV24',title:'',text:cta});
    return out.filter(s=>s.to>s.from);
  }

  function renderShell(){
    const src=imageUrl(), pos=imagePosition(), list=scenes();
    const content=$('#video-preview-content'); if(!content)return;
    if(!clean($('#video-script')?.value) && !clean($('#video-hook')?.value)){
      content.innerHTML='<div class="video-preview-empty">Najprv kliknite na „Pripraviť video balík“. Potom sa tu zobrazí prehrávateľný náhľad.</div>'; return false;
    }
    content.innerHTML=`<div class="video-preview-grid"><div class="video-phone" id="video-phone"><div class="video-phone-bg" id="video-phone-bg"></div><div class="video-phone-brand"><span>OBJEKTÍV</span><b>24</b></div><div class="video-phone-tag">${imageTypeLabel()}</div><div class="video-phone-copy"><span class="kicker" id="video-preview-kicker"></span><h4 id="video-preview-title"></h4><p id="video-preview-text"></p></div><span class="video-phone-time" id="video-preview-time">0:00 / 0:${String(duration()).padStart(2,'0')}</span><div class="video-phone-progress"><i id="video-preview-progress"></i></div></div><div><div class="video-preview-controls"><button class="main" id="video-preview-play" type="button">▶ Prehrať</button><button id="video-preview-restart" type="button">↺ Od začiatku</button><button id="video-preview-full" type="button">⛶ Celá obrazovka</button></div><p class="video-preview-help">Náhľad používa aktuálnu fotografiu článku a texty z video balíka. Hlasový náhľad využíva slovenský hlas dostupný v prehliadači, takže výsledný profesionálny hlas môže znieť inak.</p><div class="video-preview-scenes">${list.map(s=>`<div class="video-preview-scene"><b>${Math.round(s.from)}–${Math.round(s.to)} s</b><span>${(s.title||s.text||s.kicker).replace(/[<>]/g,'')}</span></div>`).join('')}</div></div></div>`;
    const bg=$('#video-phone-bg'); if(src){bg.style.backgroundImage=`url("${src.replace(/"/g,'%22')}")`;bg.style.backgroundPosition=pos}else{bg.style.background='radial-gradient(circle at 70% 20%,#344c28,transparent 30%),linear-gradient(145deg,#16303e,#071018)'}
    $('#video-preview-play').addEventListener('click',togglePlay);
    $('#video-preview-restart').addEventListener('click',()=>{stop(false);elapsedBefore=0;draw(0)});
    $('#video-preview-full').addEventListener('click',()=>$('#video-phone')?.requestFullscreen?.());
    draw(0); return true;
  }

  function draw(seconds){
    const d=duration(), t=Math.min(d,Math.max(0,seconds));
    const sc=scenes().find(s=>t>=s.from && t<s.to) || scenes().at(-1);
    if(sc){$('#video-preview-kicker').textContent=sc.kicker||'';$('#video-preview-title').textContent=sc.title||'';$('#video-preview-text').textContent=sc.text||''}
    const p=$('#video-preview-progress'); if(p)p.style.width=`${Math.min(100,t/d*100)}%`;
    const time=$('#video-preview-time'); if(time)time.textContent=`0:${String(Math.floor(t)).padStart(2,'0')} / 0:${String(d).padStart(2,'0')}`;
  }
  function currentElapsed(){return elapsedBefore + (timer ? (performance.now()-startedAt)/1000 : 0)}
  function tick(){
    const t=currentElapsed(); draw(t);
    if(t>=duration()){stop(false);elapsedBefore=duration();draw(duration());return}
    timer=requestAnimationFrame(tick);
  }
  function play(){if(currentElapsed()>=duration())elapsedBefore=0;startedAt=performance.now();timer=requestAnimationFrame(tick);const b=$('#video-preview-play');if(b)b.textContent='❚❚ Pauza'}
  function pause(){if(!timer)return;elapsedBefore=currentElapsed();cancelAnimationFrame(timer);timer=null;const b=$('#video-preview-play');if(b)b.textContent='▶ Pokračovať';if(speaking&&speechSynthesis.speaking)speechSynthesis.pause()}
  function togglePlay(){if(timer)pause();else{if(speaking&&speechSynthesis.paused)speechSynthesis.resume();play()}}
  function stop(cancelSpeech=true){if(timer)cancelAnimationFrame(timer);timer=null;const b=$('#video-preview-play');if(b)b.textContent='▶ Prehrať';if(cancelSpeech&&'speechSynthesis'in window)speechSynthesis.cancel();speaking=false}

  function speak(){
    if(!('speechSynthesis' in window))return;
    speechSynthesis.cancel(); const text=clean($('#video-script')?.value); if(!text)return;
    const u=new SpeechSynthesisUtterance(text);u.lang='sk-SK';u.rate=1.02;
    const voices=speechSynthesis.getVoices();const sk=voices.find(v=>/^sk/i.test(v.lang));if(sk)u.voice=sk;
    u.onend=()=>{speaking=false};u.onerror=()=>{speaking=false};speaking=true;speechSynthesis.speak(u);
  }
  function openPreview(withVoice){
    const wrap=$('#video-preview-wrap'); if(!wrap)return; stop();elapsedBefore=0;wrap.hidden=false;
    if(!renderShell())return;wrap.scrollIntoView({behavior:'smooth',block:'start'});if(withVoice)speak();play();
  }
  function closePreview(){stop();elapsedBefore=0;const w=$('#video-preview-wrap');if(w)w.hidden=true}
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&timer)pause()});
  waitForVideoUi();
})();
