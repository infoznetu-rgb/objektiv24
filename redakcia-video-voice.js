(() => {
  const $ = s => document.querySelector(s);
  let activeUtterance = null;
  let selectedVoiceName = '';

  function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
  function voices(){return ('speechSynthesis' in window) ? speechSynthesis.getVoices() : []}
  function scoreVoice(v){
    const name=(v.name||'').toLowerCase();
    const lang=(v.lang||'').toLowerCase();
    let score=0;
    if(lang==='sk-sk')score+=120; else if(lang.startsWith('sk'))score+=100;
    if(/natural|neural|premium|enhanced/.test(name))score+=60;
    if(/microsoft|google|apple/.test(name))score+=25;
    if(/zuzana|laura|victoria|slovak/.test(name))score+=18;
    if(/espeak|speech dispatcher/.test(name))score-=40;
    if(v.localService)score+=4;
    return score;
  }
  function sortedVoices(){return voices().slice().sort((a,b)=>scoreVoice(b)-scoreVoice(a)||String(a.name).localeCompare(String(b.name)))}
  function bestVoice(){
    const list=sortedVoices();
    if(selectedVoiceName){const chosen=list.find(v=>v.name===selectedVoiceName);if(chosen)return chosen}
    return list.find(v=>/^sk/i.test(v.lang)) || list[0] || null;
  }

  function addVoicePicker(){
    const controls=$('.video-preview-controls');
    if(!controls || $('#video-preview-voice-select'))return;
    const wrap=document.createElement('label');
    wrap.style.cssText='display:grid;gap:5px;width:100%;margin-top:6px;font-size:.72rem;color:#6d727a';
    wrap.innerHTML='<span>Hlas pre rýchly náhľad</span><select id="video-preview-voice-select" style="max-width:100%;padding:9px 10px;border:1px solid #c9ccd1;border-radius:7px;background:#fff"></select>';
    controls.parentElement.insertBefore(wrap, controls.nextSibling);
    fillVoicePicker();
    $('#video-preview-voice-select')?.addEventListener('change',e=>{selectedVoiceName=e.target.value||''});

    const help=$('.video-preview-help');
    if(help)help.textContent='Rýchly náhľad používa najkvalitnejší slovenský hlas dostupný v tomto zariadení. Ak prehliadač nemá Natural/Neural hlas, bude stále znieť systémovo. Finálny TikTok render použije samostatný kvalitný AI voiceover.';
  }

  function fillVoicePicker(){
    const select=$('#video-preview-voice-select');if(!select)return;
    const list=sortedVoices();
    if(!list.length){select.innerHTML='<option>Načítavam dostupné hlasy…</option>';return}
    const sk=list.filter(v=>/^sk/i.test(v.lang));
    const preferred=sk.length?sk:list.slice(0,12);
    select.innerHTML=preferred.map((v,i)=>`<option value="${String(v.name).replace(/"/g,'&quot;')}"${(selectedVoiceName?v.name===selectedVoiceName:i===0)?' selected':''}>${v.name} · ${v.lang}${/natural|neural|premium|enhanced/i.test(v.name)?' · Natural':''}</option>`).join('');
    selectedVoiceName=select.value||preferred[0]?.name||'';
  }

  function speakBetter(){
    if(!('speechSynthesis' in window))return;
    speechSynthesis.cancel();
    const text=clean($('#video-script')?.value);if(!text)return;
    const u=new SpeechSynthesisUtterance(text);
    const v=bestVoice();
    if(v){u.voice=v;u.lang=v.lang||'sk-SK'}else u.lang='sk-SK';
    u.rate=.93;u.pitch=.98;u.volume=1;
    u.onend=()=>{activeUtterance=null};
    u.onerror=()=>{activeUtterance=null};
    activeUtterance=u;
    speechSynthesis.speak(u);
  }

  function cancel(){if('speechSynthesis' in window)speechSynthesis.cancel();activeUtterance=null}

  function interceptVoiceButton(event){
    const target=event.target?.closest?.('#video-preview-voice');
    if(!target)return;
    event.preventDefault();event.stopImmediatePropagation();
    cancel();
    $('#video-preview-button')?.click();
    setTimeout(()=>{addVoicePicker();fillVoicePicker();speakBetter()},80);
  }

  document.addEventListener('click',interceptVoiceButton,true);
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('#video-preview-close,#video-preview-restart'))cancel();
    if(event.target?.closest?.('#video-preview-play') && activeUtterance){
      setTimeout(()=>{
        if(!('speechSynthesis' in window))return;
        const label=$('#video-preview-play')?.textContent||'';
        if(label.includes('Pokračovať')||label.includes('Prehrať'))speechSynthesis.pause();
        else if(speechSynthesis.paused)speechSynthesis.resume();
      },0);
    }
  },true);

  if('speechSynthesis' in window){
    speechSynthesis.addEventListener?.('voiceschanged',()=>{fillVoicePicker()});
    setTimeout(()=>{voices();fillVoicePicker()},250);
  }

  const observer=new MutationObserver(()=>{if($('#video-preview-content')&&!$('#video-preview-wrap')?.hidden)addVoicePicker()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
