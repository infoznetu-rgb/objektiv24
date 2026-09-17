(() => {
  const $ = s => document.querySelector(s);
  const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
  const BRAND_KIT_ID = 'f22de048e834474b820d900a0be5a674';
  const VERSION = 1;
  const presets = {
    news: {
      label: 'Správa', kicker: 'V SKRATKE', pace: 'normal', duration: '30',
      note: 'Rýchlo vysvetlí čo sa stalo, pridá kontext a skončí praktickým dôsledkom.',
      direction: 'SPRÁVA: čistý redakčný rytmus. 0–3 s silný titulok; 3–12 s hlavný fakt; 12–22 s kontext a reálny B-roll; 22–27 s čo to znamená; záver Objektív24 + objektiv24.sk. Strih približne každé 3–5 sekúnd, bez dramatických efektov.'
    },
    practical: {
      label: 'Prakticky', kicker: 'ČO TREBA VEDIEŤ', pace: 'fast', duration: '30',
      note: 'Pre termíny, zmeny, dávky, dopravu a články, kde má človek niečo urobiť.',
      direction: 'PRAKTICKY: prvé 3 s jasne povedz koho sa zmena týka. Potom 2–3 konkrétne kroky alebo termíny, každý s vlastným vizuálom. Veľké krátke texty, čísla iba ak sú v článku. Záver: čo má človek urobiť + objektiv24.sk.'
    },
    explain: {
      label: 'Vysvetľujeme', kicker: 'VYSVETĽUJEME', pace: 'calm', duration: '40',
      note: 'Pre témy, kde je dôležitejšie vysvetliť súvislosti než iba oznámiť udalosť.',
      direction: 'VYSVETĽUJEME: pokojnejšie tempo. 0–4 s otázka alebo hlavný fakt; 4–15 s čo sa stalo; 15–28 s prečo je to dôležité; 28–35 s praktický význam. Použi jednoduchú mapu, dokument, grafický detail alebo reálny B-roll. Záver Objektív24 + objektiv24.sk.'
    }
  };
  let selected = 'news';

  function detect() {
    const text = clean([$('#title')?.value, $('#category')?.value, $('#intro')?.value, $('#next-step')?.value].join(' ')).toLocaleLowerCase('sk').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/co urobit|ako poziadat|termin|do kedy|prispev|davk|vodic|uzaver|zmena od|pozor na|treba|musi|moze ziskat|ziadost|formular/.test(text)) return 'practical';
    if (/co to znamena|preco|vysvet|suvislost|ako funguje|co je|dopad|kontext/.test(text)) return 'explain';
    return 'news';
  }

  function boot(tries = 0) {
    const grid = $('#video-pro-panel .vpro-grid');
    if (!grid) {
      if (tries < 120) setTimeout(() => boot(tries + 1), 180);
      return;
    }
    if ($('#vbrand-card')) return;
    build(grid);
    wrapPersistence();
    restore();
  }

  function build(grid) {
    const style = document.createElement('style');
    style.textContent = `
      .vbrand-card{grid-column:1/-1;border:1px solid #cad1d5;background:linear-gradient(135deg,#07131b,#10232e);color:#f7fafb;border-radius:12px;padding:14px}.vbrand-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.vbrand-top h5{margin:0 0 4px;font-size:.86rem}.vbrand-top p{margin:0;color:#aab8c0;font-size:.7rem;line-height:1.45}.vbrand-ok{flex:none;background:#d9ff28;color:#061018;border-radius:999px;padding:6px 9px;font-size:.61rem;font-weight:950}.vbrand-controls{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:9px;align-items:end;margin-top:12px}.vbrand-controls label{font-size:.67rem;color:#b8c3c9}.vbrand-controls select{display:block;width:100%;margin-top:5px;background:#fff;color:#20262a}.vbrand-apply{border:0;border-radius:7px;background:#d9ff28;color:#071019;padding:10px 13px;font-size:.68rem;font-weight:950;cursor:pointer}.vbrand-note{margin-top:9px!important;color:#b5c0c6!important;font-size:.68rem!important}.vbrand-palette{display:flex;align-items:center;gap:6px;margin-top:10px}.vbrand-swatch{width:20px;height:20px;border-radius:50%;border:1px solid #ffffff38}.vbrand-palette small{margin-left:4px;color:#8798a2;font-size:.61rem}.vbrand-id{margin-left:auto;color:#71838d!important;font-size:.57rem!important}@media(max-width:760px){.vbrand-controls{grid-template-columns:1fr}.vbrand-top{display:block}.vbrand-ok{display:inline-flex;margin-top:8px}.vbrand-id{display:none}}
    `;
    document.head.appendChild(style);
    const card = document.createElement('div');
    card.id = 'vbrand-card';
    card.className = 'vbrand-card';
    card.innerHTML = `
      <div class="vbrand-top"><div><h5>Objektív24 · jednotná video šablóna</h5><p>Rovnaká identita vo všetkých videách: tmavý redakčný základ, biela typografia, limetkový akcent, čisté titulky a záverečný podpis webu.</p></div><span class="vbrand-ok">BRAND KIT ✓</span></div>
      <div class="vbrand-controls"><label>Typ videa<select id="vbrand-template"><option value="news">Správa · rýchly prehľad</option><option value="practical">Prakticky · čo treba urobiť</option><option value="explain">Vysvetľujeme · kontext a význam</option></select></label><button id="vbrand-apply" class="vbrand-apply" type="button">Použiť šablónu</button></div>
      <p id="vbrand-note" class="vbrand-note"></p>
      <div class="vbrand-palette"><i class="vbrand-swatch" style="background:#03080d"></i><i class="vbrand-swatch" style="background:#10232e"></i><i class="vbrand-swatch" style="background:#f7fafb"></i><i class="vbrand-swatch" style="background:#d9ff28"></i><small>#03080D · #10232E · #F7FAFB · #D9FF28</small><small class="vbrand-id">Objektív24 video systém v${VERSION}</small></div>`;
    grid.prepend(card);
    $('#vbrand-template').addEventListener('change', () => { selected = $('#vbrand-template').value; describe(); });
    $('#vbrand-apply').addEventListener('click', () => apply(true));
    $('#video-generate')?.addEventListener('click', () => setTimeout(() => apply(false), 40));
    ['#title','#category','#intro','#next-step'].forEach(sel => $(sel)?.addEventListener('input', () => {
      if (!clean($('#draft-id')?.value)) { selected = detect(); syncSelect(); describe(); }
    }));
  }

  function syncSelect() {
    const el = $('#vbrand-template');
    if (el) el.value = selected;
  }

  function describe() {
    const p = presets[selected] || presets.news;
    const el = $('#vbrand-note');
    if (el) el.textContent = p.note;
  }

  function stripTemplate(text) {
    return String(text || '').replace(/\n*\[OBJ24 ŠABLÓNA:[\s\S]*$/m, '').trim();
  }

  function apply(showFeedback) {
    const p = presets[selected] || presets.news;
    const pace = $('#vpro-pace'); if (pace) { pace.value = p.pace; pace.dispatchEvent(new Event('change', {bubbles:true})); }
    const kicker = $('#vpro-kicker'); if (kicker) { kicker.value = p.kicker; kicker.dispatchEvent(new Event('input', {bubbles:true})); }
    const duration = $('#video-duration'); if (duration) { duration.value = p.duration; duration.dispatchEvent(new Event('change', {bubbles:true})); }
    const shots = $('#video-shots');
    if (shots) {
      const base = stripTemplate(shots.value);
      shots.value = `${base}${base ? '\n\n' : ''}[OBJ24 ŠABLÓNA: ${p.label.toUpperCase()}]\n${p.direction}`;
      shots.dispatchEvent(new Event('input', {bubbles:true}));
    }
    describe();
    if (showFeedback) {
      const b = $('#vbrand-apply'); const old = b.textContent; b.textContent = 'Použité ✓'; setTimeout(() => b.textContent = old, 1200);
    }
  }

  function currentDraft() {
    const id = clean($('#draft-id')?.value);
    return Array.isArray(window.drafts || drafts) ? (window.drafts || drafts).find(d => String(d.id) === id) : null;
  }

  function restore() {
    const d = currentDraft();
    selected = d?.shortVideo?.brandTemplate || detect();
    if (!presets[selected]) selected = 'news';
    syncSelect(); describe();
  }

  function wrapPersistence() {
    try {
      const originalReadForm = readForm;
      readForm = function() {
        const d = originalReadForm();
        return {...d, shortVideo:{...(d.shortVideo || {}), brandTemplate:selected, brandPresetVersion:VERSION, brandKitId:BRAND_KIT_ID}};
      };
    } catch {}
    try {
      const originalSelectDraft = selectDraft;
      selectDraft = function(id) { originalSelectDraft(id); setTimeout(restore, 80); };
    } catch {}
    try {
      const originalResetForm = resetForm;
      resetForm = function() { originalResetForm(); selected = detect(); setTimeout(() => { syncSelect(); describe(); }, 50); };
    } catch {}
  }

  window.objektiv24VideoBrand = { brandKitId: BRAND_KIT_ID, getTemplate: () => selected, apply: () => apply(true) };
  boot();
})();
