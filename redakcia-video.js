(() => {
  const $ = s => document.querySelector(s);
  const form = $('#article-form');
  const footer = form?.querySelector('.form-footer');
  if (!form || !footer || typeof dbToDraft !== 'function' || typeof draftToDb !== 'function') return;

  let currentVideoPack = {};

  const style = document.createElement('style');
  style.textContent = `
    .short-video-section{position:relative}.video-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.video-head h3{margin:0 0 5px;font-size:1.05rem}.video-head p{margin:0;color:#6f737b;font-size:.8rem;line-height:1.5;max-width:680px}.video-badge{flex:none;border:1px solid #cfd1d7;background:#fff;border-radius:999px;padding:7px 10px;font-size:.66rem;font-weight:900;letter-spacing:.05em;color:#686c75}.video-badge.ready{background:#f4fad6;border-color:#a7bd35;color:#506315}.video-controls{display:grid;grid-template-columns:160px 180px 1fr;gap:10px;align-items:end;margin:16px 0}.video-generate{border:0;background:#303136;color:#ceef26;border-radius:5px;padding:12px 15px;font-weight:900;cursor:pointer;min-height:44px}.video-generate:hover{filter:brightness(1.08)}.video-box{border:1px solid #dfe1e5;background:#fff;border-radius:9px;padding:14px;margin-top:10px}.video-box-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px}.video-box-head strong{font-size:.82rem}.video-copy{border:1px solid #cfd1d7;background:#fff;color:#484b52;border-radius:4px;padding:6px 9px;font-size:.68rem;font-weight:800;cursor:pointer}.video-box textarea{min-height:104px;border-color:#d9dbe0}.video-box textarea.tall{min-height:180px}.video-metrics{display:flex;gap:9px;flex-wrap:wrap;margin:11px 0}.video-metrics span{background:#f1f2f3;border-radius:999px;padding:5px 8px;font-size:.68rem;color:#646972}.video-safety{border-left:3px solid #b7c53c;background:#f8faea;padding:10px 12px;margin-top:12px;font-size:.75rem;line-height:1.5;color:#5c6241}.video-safety.sensitive{border-left-color:#c58a56;background:#fff3e8;color:#765035}.video-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.video-actions button{border:1px solid #bfc2c8;background:#fff;color:#3c3e44;border-radius:5px;padding:10px 13px;font-weight:800;cursor:pointer}.video-actions .primary-video{border:0;background:#303136;color:#ceef26}.video-note{font-size:.72rem;color:#7a7e86;margin:10px 0 0}.video-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.video-grid .wide{grid-column:1/-1}@media(max-width:760px){.video-controls{grid-template-columns:1fr}.video-grid{grid-template-columns:1fr}.video-grid .wide{grid-column:auto}.video-head{display:block}.video-badge{display:inline-flex;margin-top:10px}}
  `;
  document.head.appendChild(style);

  const section = document.createElement('section');
  section.className = 'form-section short-video-section';
  section.innerHTML = `
    <div class="video-head">
      <div><h3>Krátke video</h3><p>Z článku pripravíme redakčný balík pre TikTok, Instagram Reels a YouTube Shorts. Video má vysvetliť podstatu, nie nahradiť článok ani zveličovať titulok.</p></div>
      <span id="video-badge" class="video-badge">NEPRIPRAVENÉ</span>
    </div>
    <div class="video-controls">
      <div><label for="video-duration">Dĺžka</label><select id="video-duration"><option value="20">20 sekúnd</option><option value="30" selected>30 sekúnd</option><option value="40">40 sekúnd</option></select></div>
      <div><label for="video-format">Formát</label><select id="video-format"><option value="9:16">9:16 · TikTok/Reels/Shorts</option><option value="1:1">1:1 · sociálna sieť</option></select></div>
      <button id="video-generate" class="video-generate" type="button">✦ Pripraviť video balík</button>
    </div>
    <div id="video-metrics" class="video-metrics" hidden></div>
    <div class="video-grid">
      <div class="video-box wide"><div class="video-box-head"><strong>HOOK · prvé 2–3 sekundy</strong><button class="video-copy" type="button" data-copy="#video-hook">Kopírovať</button></div><textarea id="video-hook" rows="3" placeholder="Úvodná veta videa"></textarea></div>
      <div class="video-box"><div class="video-box-head"><strong>VOICEOVER</strong><button class="video-copy" type="button" data-copy="#video-script">Kopírovať</button></div><textarea id="video-script" class="tall" placeholder="Text hovoreného komentára"></textarea></div>
      <div class="video-box"><div class="video-box-head"><strong>TITULKY NA OBRAZOVKU</strong><button class="video-copy" type="button" data-copy="#video-captions">Kopírovať</button></div><textarea id="video-captions" class="tall" placeholder="Krátke titulky po blokoch"></textarea></div>
      <div class="video-box"><div class="video-box-head"><strong>ZÁBERY / SHOT LIST</strong><button class="video-copy" type="button" data-copy="#video-shots">Kopírovať</button></div><textarea id="video-shots" class="tall" placeholder="Čo má byť vidieť v jednotlivých sekundách"></textarea></div>
      <div class="video-box"><div class="video-box-head"><strong>POPIS PRÍSPEVKU + HASHTAGY</strong><button class="video-copy" type="button" data-copy="#video-post">Kopírovať</button></div><textarea id="video-post" class="tall" placeholder="Text pod videom"></textarea></div>
      <div class="video-box wide"><div class="video-box-head"><strong>ZÁVER / CTA</strong><button class="video-copy" type="button" data-copy="#video-cta">Kopírovať</button></div><textarea id="video-cta" rows="2">Viac faktov, zdrojov a praktický ďalší krok nájdete na objektiv24.sk.</textarea></div>
    </div>
    <div id="video-safety" class="video-safety">Používame iba fakty z článku. Bez clickbaitu, falošných záberov udalosti a bez tvrdení, ktoré článok neobsahuje.</div>
    <div class="video-actions"><button id="video-copy-all" class="primary-video" type="button">Kopírovať celý balík</button><button id="video-clear" type="button">Vyčistiť video balík</button></div>
    <p class="video-note">Pilot nič automaticky nezverejňuje. Po kontrole možno tento balík použiť na výrobu videa a neskôr napojiť na video nástroj.</p>`;
  footer.before(section);

  const fields = {
    duration: $('#video-duration'), format: $('#video-format'), hook: $('#video-hook'), script: $('#video-script'), captions: $('#video-captions'), shots: $('#video-shots'), post: $('#video-post'), cta: $('#video-cta')
  };

  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const normalize = value => clean(value).toLocaleLowerCase('sk').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const wordCount = value => clean(value) ? clean(value).split(/\s+/).length : 0;
  const sentences = value => clean(value).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
  const shorten = (value, max = 105) => {
    const v = clean(value); if (v.length <= max) return v;
    const cut = v.slice(0, max - 1); const at = cut.lastIndexOf(' ');
    return (at > 50 ? cut.slice(0, at) : cut).replace(/[,:;\-–—]+$/,'') + '…';
  };
  const trimWords = (value, max) => {
    const w = clean(value).split(/\s+/); return w.length <= max ? clean(value) : w.slice(0, max).join(' ').replace(/[,:;\-–—]+$/,'') + '…';
  };
  const targetWords = duration => duration <= 20 ? 43 : duration <= 30 ? 66 : 88;

  function isSensitive() {
    const text = normalize([$('#title')?.value, $('#intro')?.value, $('#what-happened')?.value, $('#category')?.value].join(' '));
    return /volb|polit|vlada|parlament|minister|prezident|premier|stran|kandidat|referend|protest|polici|sud|obvinen|zatkn|nehod|poziar|utok|zran|mrt|vojna/.test(text);
  }

  function topicalHashtags() {
    const text = normalize([$('#title')?.value, $('#category')?.value].join(' '));
    const tags = ['#Objektiv24', '#Slovensko'];
    const rules = [
      [/dopr|cest|vodic|auto|cyklist/, '#Doprava'], [/peniaz|davk|dochod|prispev|social/, '#Peniaze'], [/energia|elektrin|plyn|solar/, '#Energia'],
      [/internet|podvod|kyber|phishing|sms/, '#Bezpecnost'], [/zdrav|nemoc|lek|veterinar/, '#Zdravie'], [/posta|urad|slovensko sk|sluzb/, '#Sluzby'],
      [/spotrebit|poist|reklamac|nakup/, '#Spotrebitel'], [/region|obec|mesto|kraj/, '#Regiony'], [/skol|student|ziak/, '#Skolstvo'], [/sport|futbal|hokej|basketbal/, '#Sport']
    ];
    for (const [re, tag] of rules) if (re.test(text) && !tags.includes(tag)) tags.push(tag);
    return tags.slice(0, 4).join(' ');
  }

  function hookFromArticle() {
    const title = clean($('#title')?.value);
    const intro = clean($('#intro')?.value);
    if (!title) return '';
    const t = title.replace(/[.!]+$/,'');
    if (t.length <= 82) return t + '.';
    const first = sentences(intro)[0];
    return first && first.length <= 100 ? first : shorten(t, 96);
  }

  function buildScript(duration) {
    const hook = hookFromArticle();
    const intro = sentences($('#intro')?.value)[0] || '';
    const happened = sentences($('#what-happened')?.value).slice(0,2);
    const meaning = sentences($('#what-it-means')?.value).slice(0,2);
    const next = sentences($('#next-step')?.value).slice(0,1);
    const max = targetWords(duration);
    const candidates = [hook];
    [intro, ...happened, ...meaning, ...next].forEach(s => {
      if (!s || normalize(s) === normalize(hook)) return;
      const prospective = clean([...candidates, s].join(' '));
      if (wordCount(prospective) <= max - 8) candidates.push(s);
    });
    const ending = 'Podrobnosti a zdroje nájdete na Objektív24.';
    let result = clean([...candidates, ending].join(' '));
    if (wordCount(result) > max) result = trimWords(result, max);
    return result;
  }

  function buildCaptions(script) {
    const s = sentences(script);
    const blocks = [];
    s.forEach(sentence => {
      const words = sentence.split(/\s+/);
      for (let i=0;i<words.length;i+=7) blocks.push(words.slice(i,i+7).join(' '));
    });
    return blocks.map((b,i)=>`${i+1}. ${b}`).join('\n');
  }

  function visualSuggestion() {
    const text = normalize([$('#title')?.value, $('#category')?.value].join(' '));
    const rules = [
      [/dopr|cest|vodic|cyklist|auto/, 'detail cesty, dopravy, značky alebo relevantného dopravného prostredia'],
      [/davk|dochod|social|peniaz|prispev/, 'civilný detail dokumentov, domácnosti, kalkulačky alebo kalendára'],
      [/energia|solar|elektrin|plyn/, 'dom, energetické zariadenie, solárne panely alebo merač energie'],
      [/podvod|kyber|internet|sms|phishing/, 'mobil alebo notebook, bezpečnostný detail bez čitateľnej falošnej správy'],
      [/zdrav|nemoc|lek|veterinar/, 'reálne zdravotnícke alebo veterinárne prostredie bez inscenovaného pacienta'],
      [/posta|balik|zasiel/, 'balík, poštové prostredie alebo detail služby'],
      [/skol|student|ziak/, 'školské prostredie, učebňa alebo školské pomôcky'],
      [/polit|vlada|parlament|minister|prezident/, 'neutrálny reálny záber verejnej budovy, rokovacej sály alebo dokumentov'],
      [/sport|futbal|hokej|basketbal/, 'reálne športové prostredie súvisiace s disciplínou']
    ];
    for (const [re, v] of rules) if (re.test(text)) return v;
    return 'reálna ilustračná fotografia prostredia alebo predmetu priamo súvisiaceho s témou';
  }

  function buildShots(duration) {
    const imageReady = Boolean(String(window.currentImageData || '').trim()) || Boolean(document.querySelector('#image-preview img[src]'));
    const main = imageReady ? 'hlavná fotografia článku, pomalý jemný pohyb/zoom' : visualSuggestion();
    const visual = visualSuggestion();
    if (duration <= 20) return `0–3 s · HOOK — výrazný titulok + ${main}\n3–9 s · FAKT — ${visual}\n9–15 s · ČO TO ZNAMENÁ — druhý detail alebo čistá grafika s 2–4 slovami\n15–20 s · CTA — logo Objektív24 + objektiv24.sk`;
    if (duration <= 30) return `0–3 s · HOOK — výrazný titulok + ${main}\n3–10 s · ČO SA STALO — ${visual}\n10–18 s · KONTEXT — druhý reálny detail, mapa/prostredie alebo dokument bez citlivých údajov\n18–25 s · ČO MÁ ČLOVEK UROBIŤ — praktický obrazový krok, krátky text na obrazovke\n25–30 s · CTA — Objektív24 · fakty, kontext, ďalší krok · objektiv24.sk`;
    return `0–3 s · HOOK — výrazný titulok + ${main}\n3–12 s · ČO SA STALO — ${visual}\n12–22 s · KONTEXT — druhý reálny detail alebo súvisiace prostredie\n22–31 s · ČO TO ZNAMENÁ — vecná grafika alebo tretí relevantný záber\n31–36 s · ČO ĎALEJ — praktický krok z článku\n36–40 s · CTA — Objektív24 · objektiv24.sk`;
  }

  function buildPost() {
    const title = clean($('#title')?.value);
    const intro = shorten($('#intro')?.value, 180);
    return `${title}\n\n${intro}\n\nViac faktov, zdrojov a praktický ďalší krok: objektiv24.sk\n\n${topicalHashtags()}`.trim();
  }

  function collectPack() {
    return {
      duration:Number(fields.duration.value)||30,
      format:fields.format.value||'9:16',
      hook:fields.hook.value.trim(),
      script:fields.script.value.trim(),
      captions:fields.captions.value.trim(),
      shots:fields.shots.value.trim(),
      post:fields.post.value.trim(),
      cta:fields.cta.value.trim(),
      generated_at:currentVideoPack.generated_at||null
    };
  }

  function updateBadge() {
    const p = collectPack();
    const ready = Boolean(p.hook && p.script && p.shots);
    const badge = $('#video-badge');
    badge.textContent = ready ? 'VIDEO BALÍK PRIPRAVENÝ' : 'NEPRIPRAVENÉ';
    badge.classList.toggle('ready', ready);
    const metrics = $('#video-metrics');
    if (p.script) {
      const words = wordCount(p.script); const seconds = Math.round(words / 2.15);
      metrics.hidden = false;
      metrics.innerHTML = `<span>${words} slov</span><span>≈ ${seconds} s hovorenia</span><span>${p.format}</span><span>TikTok · Reels · Shorts</span>`;
    } else metrics.hidden = true;
  }

  function fillPack(pack = {}) {
    currentVideoPack = {...pack};
    fields.duration.value = String(pack.duration || 30);
    fields.format.value = pack.format || '9:16';
    fields.hook.value = pack.hook || '';
    fields.script.value = pack.script || '';
    fields.captions.value = pack.captions || '';
    fields.shots.value = pack.shots || '';
    fields.post.value = pack.post || '';
    fields.cta.value = pack.cta || 'Viac faktov, zdrojov a praktický ďalší krok nájdete na objektiv24.sk.';
    updateBadge();
  }

  function generate() {
    const title = clean($('#title')?.value), intro = clean($('#intro')?.value);
    if (!title || !intro) { alert('Najprv doplňte titulok a krátky úvod článku.'); return; }
    const duration = Number(fields.duration.value)||30;
    const hook = hookFromArticle(); const script = buildScript(duration);
    fields.hook.value = hook;
    fields.script.value = script;
    fields.captions.value = buildCaptions(script);
    fields.shots.value = buildShots(duration);
    fields.post.value = buildPost();
    fields.cta.value = 'Viac faktov, zdrojov a praktický ďalší krok nájdete na objektiv24.sk.';
    currentVideoPack.generated_at = new Date().toISOString();
    const safety = $('#video-safety');
    if (isSensitive()) {
      safety.classList.add('sensitive');
      safety.textContent = 'Citlivá téma: používajte iba reálne licencované zábery alebo jasne označenú symbolickú ilustráciu. Pri politike a verejnom rozhodovaní zachovajte neutrálne faktické znenie; nevytvárajte falošný záber konkrétnej osoby alebo udalosti.';
    } else {
      safety.classList.remove('sensitive');
      safety.textContent = 'Používame iba fakty z článku. Bez clickbaitu, falošných záberov udalosti a bez tvrdení, ktoré článok neobsahuje.';
    }
    updateBadge();
    const status = $('#draft-status'); if (status) status.textContent = 'Video balík pripravený · uložte návrh';
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); return true; }
  }

  $('#video-generate').addEventListener('click', generate);
  section.addEventListener('input', updateBadge);
  section.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const el = $(btn.dataset.copy); if (!el) return; await copyText(el.value); const old=btn.textContent; btn.textContent='Skopírované ✓'; setTimeout(()=>btn.textContent=old,1200);
  }));
  $('#video-copy-all').addEventListener('click', async () => {
    const p = collectPack();
    const text = `OBJEKTÍV24 · KRÁTKE VIDEO\nFormát: ${p.format} · cieľ ${p.duration} s\n\nHOOK\n${p.hook}\n\nVOICEOVER\n${p.script}\n\nTITULKY\n${p.captions}\n\nZÁBERY\n${p.shots}\n\nCTA\n${p.cta}\n\nPOPIS PRÍSPEVKU\n${p.post}`;
    await copyText(text); const b=$('#video-copy-all'); const old=b.textContent; b.textContent='Celý balík skopírovaný ✓'; setTimeout(()=>b.textContent=old,1400);
  });
  $('#video-clear').addEventListener('click', () => { if (confirm('Vyčistiť pripravený video balík?')) { currentVideoPack={}; fillPack({}); } });

  const originalDbToDraft = dbToDraft;
  dbToDraft = function(row) { const d = originalDbToDraft(row); return {...d, shortVideo: row.short_video && typeof row.short_video === 'object' ? row.short_video : {}}; };

  const originalDraftToDb = draftToDb;
  draftToDb = function(draft) { return {...originalDraftToDb(draft), short_video: draft.shortVideo || {}}; };

  const originalReadForm = readForm;
  readForm = function() { const d = originalReadForm(); return {...d, shortVideo: collectPack()}; };

  const originalSelectDraft = selectDraft;
  selectDraft = function(id) { originalSelectDraft(id); const d = drafts.find(x=>x.id===id); fillPack(d?.shortVideo || {}); };

  const originalResetForm = resetForm;
  resetForm = function() { originalResetForm(); currentVideoPack={}; fillPack({}); };

  fillPack({});
})();
