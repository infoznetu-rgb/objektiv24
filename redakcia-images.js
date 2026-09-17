(() => {
  const BUCKET = 'article-images';
  const $ = s => document.querySelector(s);
  const imageSection = $('#image-upload')?.closest('.form-section');
  if (!imageSection || typeof client === 'undefined') return;

  const stripHtml = value => {
    const doc = new DOMParser().parseFromString(String(value || ''), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const normal = value => String(value || '').toLocaleLowerCase('sk').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let imageMeta = {
    type: '', alt: '', sourceUrl: '', credit: '', license: '', position: '50% 50%', searchQuery: '', reviewed: false
  };
  let activeMode = 'commons';
  let queryTouched = false;

  const style = document.createElement('style');
  style.textContent = `
    .image-editor{display:grid;gap:16px}.image-editor-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.image-editor-head p{margin:4px 0 0;color:#6f737b;font-size:.82rem;line-height:1.5}.image-trust{flex:none;border:1px solid #cfd1d7;border-radius:999px;padding:7px 10px;font-size:.66rem;font-weight:900;letter-spacing:.05em;color:#666b75;background:#fff}.image-trust.ok{border-color:#a7bd35;color:#4e6112;background:#f4fad6}.image-trust.ai{border-color:#8fa6be;color:#365675;background:#edf5fb}.image-tabs{display:flex;gap:8px;flex-wrap:wrap}.image-tabs button{border:1px solid #cfd1d7;background:#fff;color:#3f4248;border-radius:999px;padding:9px 12px;font-weight:800;font-size:.78rem;cursor:pointer}.image-tabs button.is-active{background:#303136;color:#ceef26;border-color:#303136}.image-panel{border:1px solid #dfe1e5;background:#fbfbfc;border-radius:10px;padding:15px}.image-panel[hidden]{display:none}.image-search-row{display:grid;grid-template-columns:1fr auto;gap:8px}.image-search-row input{min-width:0}.image-search-row button,.image-small-button{border:0;background:#303136;color:#ceef26;border-radius:5px;padding:10px 13px;font-weight:800;cursor:pointer}.image-search-note{font-size:.75rem;color:#747882;margin:8px 0 0;line-height:1.45}.image-search-note strong{color:#42454c}.image-results{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}.image-result{overflow:hidden;border:1px solid #d9dbe0;background:#fff;border-radius:9px;display:flex;flex-direction:column}.image-result img{width:100%;aspect-ratio:4/3;object-fit:cover;background:#eef0f2}.image-result-body{padding:10px;display:flex;flex-direction:column;gap:6px;flex:1}.image-result-title{font-size:.76rem;font-weight:800;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.image-result-meta{font-size:.67rem;color:#6f737b;line-height:1.35}.image-license{display:inline-flex;align-self:flex-start;background:#eef3d5;color:#566414;border-radius:999px;padding:3px 7px;font-size:.61rem;font-weight:900}.image-result-actions{display:flex;gap:6px;margin-top:auto}.image-result-actions button,.image-result-actions a{flex:1;text-align:center;text-decoration:none;border:1px solid #cfd1d7;background:#fff;color:#3c3e44;border-radius:4px;padding:7px 8px;font-size:.68rem;font-weight:800;cursor:pointer}.image-result-actions button{background:#303136;color:#ceef26;border-color:#303136}.image-empty{grid-column:1/-1;padding:16px;border:1px dashed #cfd3d8;border-radius:8px;color:#777b84;font-size:.78rem}.image-ai-warning{border-left:3px solid #c4d63c;padding:8px 10px;background:#f8faea;color:#5b6041;font-size:.76rem;line-height:1.45;margin-bottom:12px}.image-ai-warning.is-sensitive{border-left-color:#c58957;background:#fff4e9;color:#775032}.image-prompt{width:100%;min-height:160px}.image-prompt-actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}.image-upload-status{font-size:.75rem;color:#6f737b;margin-top:7px}.image-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.image-meta-grid .wide{grid-column:1/-1}.image-review{display:flex;align-items:flex-start;gap:9px;margin:13px 0 0;font-size:.78rem;line-height:1.45;color:#5e626a}.image-review input{margin-top:3px}.image-preview-advanced{margin-top:0;max-width:none}.image-preview-advanced img{height:260px;object-fit:cover;background:#e9ebee}.focal-grid{display:grid;grid-template-columns:repeat(3,34px);gap:4px;margin-top:7px}.focal-grid button{width:34px;height:28px;border:1px solid #cfd1d7;background:#fff;border-radius:4px;cursor:pointer;color:#7a7e86}.focal-grid button.is-active{background:#303136;color:#ceef26;border-color:#303136}.image-source-fields.is-optional{opacity:.72}.image-source-fields.is-optional::before{content:'Voliteľné pri vlastnom alebo AI obrázku';display:block;font-size:.68rem;color:#858991;margin:6px 0 -4px}.commons-credit{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
    @media(max-width:760px){.image-results{grid-template-columns:1fr 1fr}.image-meta-grid{grid-template-columns:1fr}.image-meta-grid .wide{grid-column:auto}.image-editor-head{display:block}.image-trust{display:inline-flex;margin-top:10px}}
    @media(max-width:480px){.image-results{grid-template-columns:1fr}.image-search-row{grid-template-columns:1fr}.image-tabs button{flex:1}.image-preview-advanced img{height:210px}}
  `;
  document.head.appendChild(style);

  imageSection.innerHTML = `
    <div class="image-editor">
      <div class="image-editor-head">
        <div><h3>Obrázok článku</h3><p>Najprv hľadáme reálnu fotografiu s jasnou licenciou. AI používame iba ako zreteľne označenú ilustráciu, nie ako falošný dokumentačný záber.</p></div>
        <span id="image-trust" class="image-trust">CHÝBA OBRÁZOK</span>
      </div>
      <div class="image-tabs" role="tablist" aria-label="Spôsob výberu obrázka">
        <button type="button" class="is-active" data-image-mode="commons">Reálna fotografia</button>
        <button type="button" data-image-mode="upload">Vlastná / oficiálna</button>
        <button type="button" data-image-mode="ai">AI ilustrácia</button>
      </div>

      <div id="image-panel-commons" class="image-panel">
        <label for="image-search-query">Motív fotografie</label>
        <div class="image-search-row"><input id="image-search-query" type="text" placeholder="napr. Slovakia road traffic cycling"><button id="image-search-button" type="button">Hľadať fotografie</button></div>
        <p id="image-search-note" class="image-search-note">Vyhľadávame iba vo <strong>Wikimedia Commons</strong> a zobrazujeme licencie CC0, Public Domain, CC BY a CC BY-SA.</p>
        <div id="image-results" class="image-results"><div class="image-empty">Doplňte titulok článku a kliknite na „Hľadať fotografie“.</div></div>
      </div>

      <div id="image-panel-upload" class="image-panel" hidden>
        <label for="upload-image-kind">Čo nahrávate</label>
        <select id="upload-image-kind"><option value="own">Vlastná fotografia Objektív24</option><option value="official">Oficiálny obrázok s povolením na použitie</option><option value="photo">Iná licencovaná fotografia</option></select>
        <label for="image-upload">Nahrať obrázok</label>
        <input id="image-upload" type="file" accept="image/jpeg,image/png,image/webp">
        <p class="hint">Obrázok sa zmenší a uloží do úložiska Objektív24. Maximum 20 MB pred spracovaním.</p>
        <p id="image-upload-status" class="image-upload-status"></p>
      </div>

      <div id="image-panel-ai" class="image-panel" hidden>
        <div id="image-ai-warning" class="image-ai-warning">AI obrázok musí byť zjavne ilustračný a na webe bude automaticky označený „Ilustračný obrázok · AI“.</div>
        <label for="image-ai-prompt">Odporúčané zadanie pre AI</label>
        <textarea id="image-ai-prompt" class="image-prompt" readonly></textarea>
        <div class="image-prompt-actions"><button id="copy-image-prompt" class="image-small-button" type="button">Kopírovať zadanie</button><button id="refresh-image-prompt" class="image-small-button" type="button">Obnoviť zadanie</button></div>
        <label for="ai-image-upload">Nahrať hotovú AI ilustráciu</label>
        <input id="ai-image-upload" type="file" accept="image/jpeg,image/png,image/webp">
        <p id="ai-upload-status" class="image-upload-status"></p>
      </div>

      <div id="image-preview" class="image-preview image-preview-advanced" hidden><img alt="Náhľad obrázka článku"><button type="button" id="remove-image">Odstrániť obrázok</button></div>

      <div class="image-meta-grid">
        <div><label for="image-type">Typ obrázka</label><select id="image-type"><option value="">Vyberte typ</option><option value="photo">Ilustračná fotografia</option><option value="official">Oficiálny obrázok</option><option value="own">Vlastná fotografia</option><option value="ai">AI ilustrácia</option></select></div>
        <div><label>Ohnisko fotografie</label><div id="image-focal" class="focal-grid" aria-label="Ohnisko fotografie">${[
          ['0% 0%','↖'],['50% 0%','↑'],['100% 0%','↗'],['0% 50%','←'],['50% 50%','•'],['100% 50%','→'],['0% 100%','↙'],['50% 100%','↓'],['100% 100%','↘']
        ].map(([pos,label])=>`<button type="button" data-position="${pos}" aria-label="Ohnisko ${pos}">${label}</button>`).join('')}</div></div>
        <div class="wide"><label for="image-alt">ALT text — čo je na obrázku</label><input id="image-alt" type="text" maxlength="280" placeholder="Stručný vecný opis fotografie"></div>
        <div class="image-source-fields"><label for="image-credit">Autor / kredit</label><input id="image-credit" type="text" maxlength="300" placeholder="Autor alebo organizácia"></div>
        <div class="image-source-fields"><label for="image-license">Licencia / právo použitia</label><input id="image-license" type="text" maxlength="120" placeholder="napr. CC BY-SA 4.0"></div>
        <div class="wide image-source-fields"><label for="image-source-url">Zdrojový odkaz obrázka</label><input id="image-source-url" type="text" inputmode="url" placeholder="https://..."></div>
      </div>
      <label class="image-review"><input id="image-reviewed" type="checkbox"><span>Skontroloval som, že obrázok zodpovedá téme, neklame o udalosti a máme právo ho použiť.</span></label>
    </div>`;

  const fields = {
    type: $('#image-type'), alt: $('#image-alt'), sourceUrl: $('#image-source-url'), credit: $('#image-credit'), license: $('#image-license'), reviewed: $('#image-reviewed'), searchQuery: $('#image-search-query')
  };

  function isAllowedLicense(license) {
    const l = normal(license).replace(/[_-]+/g, ' ');
    return l.includes('public domain') || l === 'cc0' || l.startsWith('cc0 ') || l.startsWith('cc by ') || l.startsWith('cc by sa ');
  }

  function suggestQuery() {
    const text = normal([$('#title')?.value, $('#category')?.value, $('#intro')?.value].join(' '));
    const rules = [
      [/cyklist|pretek|uzaver|dopr|cest|dialnic|vodic|auto|kolobez|kamion/, 'Slovakia road traffic cycling'],
      [/vlak|zeleznic|stanic/, 'Slovakia railway station train'],
      [/lisk|besnot|veterinar|zvier/, 'red fox Slovakia wildlife'],
      [/energia|solar|fotovolt|zelena solidarita|elektrin/, 'solar panels house Slovakia'],
      [/posta|balik|zasiel|sipo/, 'post office parcel Slovakia'],
      [/davk|dochod|social|prispev|rodic|rodina/, 'Slovakia household paperwork family'],
      [/poist|zajazd|cestovn|dovolen/, 'travel luggage airport Europe'],
      [/podvod|phishing|kyber|internet|heslo|sms/, 'smartphone cybersecurity warning'],
      [/nemoc|zdrav|lek|ambulanc|liec/, 'hospital healthcare Slovakia'],
      [/dan|financna sprava|formular|urad/, 'office paperwork calculator Slovakia'],
      [/skol|ziak|student|univerz/, 'school classroom Slovakia'],
      [/pocasie|burk|sneh|vietor|povoden/, 'Slovakia weather landscape'],
      [/parlament|vlada|minister|prezident|zakon|polit/, 'Slovakia parliament building'],
      [/spotrebit|reklamac|nakup|obchod|cena/, 'shopping parcel consumer Europe']
    ];
    for (const [re, q] of rules) if (re.test(text)) return q;
    const category = ($('#category')?.value || 'Slovakia').trim();
    return `${category} Slovakia`.replace(/\s+/g, ' ');
  }

  function isSensitiveTopic() {
    const text = normal([$('#title')?.value, $('#intro')?.value, $('#what-happened')?.value].join(' '));
    return /nehod|poziar|utok|zran|mrt|obvinen|zatkn|polici|sud|vojna|volb|polit|minister|prezident|premier|protest|trest/.test(text);
  }

  function buildAiPrompt() {
    const title = ($('#title')?.value || 'spravodajská téma').trim();
    const category = ($('#category')?.value || 'Slovensko').trim();
    const intro = ($('#intro')?.value || '').trim();
    const sensitive = isSensitiveTopic();
    return [
      `Fotorealistická editorial ilustrácia pre slovenský spravodajský web Objektív24.`,
      `Téma: ${title}.`,
      `Rubrika: ${category}.`,
      intro ? `Kontext: ${intro}` : '',
      `Horizontálny formát 16:9, prirodzené denné svetlo, realistické materiály a prostredie, jeden jasný hlavný motív, kompozícia čitateľná aj ako malá mobilná miniatúra.`,
      `Bez textu v obrázku, bez watermarku, bez loga média, bez falošných dokumentov s čitateľnými údajmi, bez prehnanej dramatizácie.`,
      sensitive ? `Dôležité: iba symbolická ilustračná scéna. Nezobrazovať rozpoznateľnú konkrétnu reálnu osobu ani predstierať, že ide o autentickú fotografiu konkrétnej udalosti.` : `Obrázok má pôsobiť civilne a dôveryhodne, nie reklamne ani senzáciechtivo.`
    ].filter(Boolean).join(' ');
  }

  function sourceHost(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }

  function updateTrust() {
    const badge = $('#image-trust');
    const has = Boolean((currentImageData || '').trim());
    badge.className = 'image-trust';
    if (!has) { badge.textContent = 'CHÝBA OBRÁZOK'; return; }
    if (imageMeta.type === 'ai') { badge.textContent = imageMeta.reviewed ? 'AI · SKONTROLOVANÉ' : 'AI · ČAKÁ NA KONTROLU'; badge.classList.add('ai'); return; }
    const sourced = imageMeta.type === 'own' || (imageMeta.sourceUrl && imageMeta.license);
    if (sourced && imageMeta.alt && imageMeta.reviewed) { badge.textContent = 'OBRÁZOK · OVERENÝ'; badge.classList.add('ok'); }
    else badge.textContent = 'DOPLNIŤ ÚDAJE';
  }

  function syncFieldsFromMeta() {
    fields.type.value = imageMeta.type || '';
    fields.alt.value = imageMeta.alt || '';
    fields.sourceUrl.value = imageMeta.sourceUrl || '';
    fields.credit.value = imageMeta.credit || '';
    fields.license.value = imageMeta.license || '';
    fields.reviewed.checked = Boolean(imageMeta.reviewed);
    if (imageMeta.searchQuery) fields.searchQuery.value = imageMeta.searchQuery;
    document.querySelectorAll('[data-position]').forEach(b => b.classList.toggle('is-active', b.dataset.position === (imageMeta.position || '50% 50%')));
    document.querySelectorAll('.image-source-fields').forEach(el => el.classList.toggle('is-optional', ['own','ai'].includes(imageMeta.type)));
    const preview = $('#image-preview img');
    if (preview) preview.style.objectPosition = imageMeta.position || '50% 50%';
    const live = $('#live-image');
    if (live) live.style.backgroundPosition = imageMeta.position || '50% 50%';
    updateTrust();
  }

  function resetMeta() {
    imageMeta = {type:'',alt:'',sourceUrl:'',credit:'',license:'',position:'50% 50%',searchQuery:'',reviewed:false};
    queryTouched = false;
    const q = suggestQuery(); imageMeta.searchQuery = q; fields.searchQuery.value = q;
    syncFieldsFromMeta();
    $('#image-ai-prompt').value = buildAiPrompt();
  }

  function metaFromDraft(d) {
    imageMeta = {
      type: d.imageType || (String(d.image || '').includes('/assets/ai/') ? 'ai' : (d.image ? 'photo' : '')),
      alt: d.imageAlt || '',
      sourceUrl: d.imageSourceUrl || '',
      credit: d.imageCredit || '',
      license: d.imageLicense || '',
      position: d.imagePosition || '50% 50%',
      searchQuery: d.imageSearchQuery || suggestQuery(),
      reviewed: Boolean(d.imageReviewed)
    };
    queryTouched = Boolean(d.imageSearchQuery);
    syncFieldsFromMeta();
    $('#image-ai-prompt').value = buildAiPrompt();
  }

  function setMode(mode) {
    activeMode = mode;
    document.querySelectorAll('[data-image-mode]').forEach(b => b.classList.toggle('is-active', b.dataset.imageMode === mode));
    ['commons','upload','ai'].forEach(m => { const p = $(`#image-panel-${m}`); if (p) p.hidden = m !== mode; });
    if (mode === 'ai') {
      const warning = $('#image-ai-warning');
      warning.classList.toggle('is-sensitive', isSensitiveTopic());
      warning.textContent = isSensitiveTopic()
        ? 'Citlivá alebo konkrétna udalosť: AI použite iba symbolicky. Nevytvárajte falošný záber konkrétnej osoby, nehody, zásahu alebo politickej udalosti.'
        : 'AI obrázok musí byť zjavne ilustračný a na webe bude automaticky označený „Ilustračný obrázok · AI“.';
      $('#image-ai-prompt').value = buildAiPrompt();
    }
  }

  async function resizeToBlob(file) {
    const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result || '')); r.onerror = reject; r.readAsDataURL(file); });
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = dataUrl; });
    const maxW = 2000, maxH = 1400, scale = Math.min(1, maxW / img.width, maxH / img.height);
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Konverzia obrázka zlyhala')), 'image/jpeg', .86));
  }

  async function uploadImage(file, kind, statusEl) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('Obrázok je väčší ako 20 MB.'); return; }
    if (!currentUser?.id) { alert('Najprv sa prihláste do Redakcie.'); return; }
    statusEl.textContent = 'Spracúvam a nahrávam obrázok…';
    try {
      const blob = await resizeToBlob(file);
      const d = new Date();
      const folder = kind === 'ai' ? 'assets/ai' : 'assets/photo';
      const path = `${currentUser.id}/${folder}/${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${crypto.randomUUID()}.jpg`;
      const { error } = await client.storage.from(BUCKET).upload(path, blob, {contentType:'image/jpeg',cacheControl:'31536000',upsert:false});
      if (error) throw error;
      const { data } = client.storage.from(BUCKET).getPublicUrl(path);
      currentImageData = data.publicUrl;
      if (kind === 'ai') {
        imageMeta.type = 'ai'; imageMeta.credit = 'Objektív24'; imageMeta.license = 'AI ilustrácia'; imageMeta.sourceUrl = '';
        imageMeta.alt = imageMeta.alt || `Ilustračná scéna k téme článku: ${($('#title')?.value || '').trim()}`.slice(0, 270);
      } else {
        const type = $('#upload-image-kind').value || 'own'; imageMeta.type = type;
        if (type === 'own') { imageMeta.credit = imageMeta.credit || 'Objektív24'; imageMeta.license = imageMeta.license || 'Vlastná fotografia'; imageMeta.sourceUrl = ''; }
      }
      imageMeta.reviewed = false;
      showPreview(currentImageData); syncFieldsFromMeta(); updateLivePreview();
      statusEl.textContent = 'Obrázok je uložený a pripravený.';
      $('#draft-status').textContent = 'Obrázok pripravený';
    } catch (error) {
      console.error(error); statusEl.textContent = 'Nahratie zlyhalo.'; alert('Obrázok sa nepodarilo nahrať: ' + (error?.message || error));
    }
  }

  function useCommons(item) {
    currentImageData = item.imageUrl;
    imageMeta = {
      type:'photo', alt:item.description || item.title, sourceUrl:item.sourceUrl, credit:item.credit, license:item.license,
      position:'50% 50%', searchQuery:fields.searchQuery.value.trim(), reviewed:false
    };
    showPreview(currentImageData); syncFieldsFromMeta(); updateLivePreview();
    $('#draft-status').textContent = 'Fotografia vybraná · skontrolujte údaje a zaškrtnite kontrolu';
    $('#image-preview').scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  async function searchCommons() {
    const q = fields.searchQuery.value.trim() || suggestQuery();
    fields.searchQuery.value = q; imageMeta.searchQuery = q; queryTouched = true;
    const root = $('#image-results'); root.innerHTML = '<div class="image-empty">Hľadám bezpečne použiteľné fotografie…</div>';
    try {
      const params = new URLSearchParams({action:'query',format:'json',origin:'*',generator:'search',gsrsearch:`${q} filetype:bitmap`,gsrnamespace:'6',gsrlimit:'24',prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'1200'});
      const r = await fetch('https://commons.wikimedia.org/w/api.php?' + params.toString(), {cache:'no-store'});
      if (!r.ok) throw new Error('Wikimedia ' + r.status);
      const json = await r.json();
      const pages = Object.values(json?.query?.pages || {});
      const items = pages.map(page => {
        const ii = page.imageinfo?.[0]; if (!ii || !String(ii.mime || '').startsWith('image/')) return null;
        const ex = ii.extmetadata || {};
        const license = stripHtml(ex.LicenseShortName?.value || ex.UsageTerms?.value || '');
        if (!isAllowedLicense(license)) return null;
        const title = stripHtml(ex.ObjectName?.value || page.title?.replace(/^File:/,'') || 'Fotografia');
        const description = stripHtml(ex.ImageDescription?.value || ex.Caption?.value || title).slice(0, 280);
        const credit = stripHtml(ex.Artist?.value || ex.Credit?.value || 'Wikimedia Commons').slice(0, 300);
        return {title,description,credit,license,imageUrl:ii.thumburl || ii.url,sourceUrl:ii.descriptionurl || ''};
      }).filter(Boolean).slice(0, 9);
      if (!items.length) { root.innerHTML = '<div class="image-empty">Nenašla sa fotografia s povolenou licenciou. Skúste širší motív alebo použite vlastnú/AI ilustráciu.</div>'; return; }
      root.innerHTML = items.map((it,i)=>`<article class="image-result"><img src="${esc(it.imageUrl)}" alt="${esc(it.description)}" loading="lazy"><div class="image-result-body"><span class="image-license">${esc(it.license)}</span><div class="image-result-title">${esc(it.title)}</div><div class="image-result-meta commons-credit">${esc(it.credit || 'Wikimedia Commons')}</div><div class="image-result-actions"><button type="button" data-commons-index="${i}">Použiť</button><a href="${esc(it.sourceUrl)}" target="_blank" rel="noopener">Overiť ↗</a></div></div></article>`).join('');
      root.querySelectorAll('[data-commons-index]').forEach(b => b.addEventListener('click', () => useCommons(items[Number(b.dataset.commonsIndex)])));
    } catch (error) {
      console.error(error); root.innerHTML = '<div class="image-empty">Vyhľadávanie sa nepodarilo. Skúste znova alebo použite vlastný obrázok.</div>';
    }
  }

  document.querySelectorAll('[data-image-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.imageMode)));
  $('#image-search-button').addEventListener('click', searchCommons);
  fields.searchQuery.addEventListener('input', () => { queryTouched = true; imageMeta.searchQuery = fields.searchQuery.value.trim(); });
  $('#copy-image-prompt').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#image-ai-prompt').value); $('#draft-status').textContent = 'AI zadanie skopírované'; } catch { $('#image-ai-prompt').select(); document.execCommand('copy'); } });
  $('#refresh-image-prompt').addEventListener('click', () => { $('#image-ai-prompt').value = buildAiPrompt(); });
  $('#image-upload').addEventListener('change', e => uploadImage(e.target.files?.[0], 'upload', $('#image-upload-status')));
  $('#ai-image-upload').addEventListener('change', e => uploadImage(e.target.files?.[0], 'ai', $('#ai-upload-status')));
  $('#remove-image').addEventListener('click', () => { currentImageData=''; hidePreview(); resetMeta(); updateLivePreview(); $('#image-upload').value=''; $('#ai-image-upload').value=''; });

  Object.entries(fields).forEach(([key,el]) => {
    if (!el || key === 'searchQuery') return;
    const event = key === 'reviewed' || key === 'type' ? 'change' : 'input';
    el.addEventListener(event, () => {
      if (key === 'reviewed') imageMeta.reviewed = el.checked;
      else imageMeta[key] = el.value.trim();
      syncFieldsFromMeta(); updateLivePreview();
    });
  });
  document.querySelectorAll('[data-position]').forEach(b => b.addEventListener('click', () => { imageMeta.position = b.dataset.position; syncFieldsFromMeta(); updateLivePreview(); }));

  ['#title','#category','#intro','#what-happened'].forEach(sel => $(sel)?.addEventListener('input', () => {
    if (!queryTouched) { imageMeta.searchQuery = suggestQuery(); fields.searchQuery.value = imageMeta.searchQuery; }
    if (activeMode === 'ai') setMode('ai');
  }));

  const originalDbToDraft = dbToDraft;
  dbToDraft = function(row) {
    const d = originalDbToDraft(row);
    return {...d,
      imageType:row.image_type||'', imageAlt:row.image_alt||'', imageSourceUrl:row.image_source_url||'', imageCredit:row.image_credit||'',
      imageLicense:row.image_license||'', imagePosition:row.image_position||'50% 50%', imageSearchQuery:row.image_search_query||'', imageReviewed:Boolean(row.image_reviewed)
    };
  };

  const originalDraftToDb = draftToDb;
  draftToDb = function(draft) {
    return {...originalDraftToDb(draft),
      image_type:draft.imageType||'', image_alt:draft.imageAlt||'', image_source_url:draft.imageSourceUrl||'', image_credit:draft.imageCredit||'',
      image_license:draft.imageLicense||'', image_position:draft.imagePosition||'50% 50%', image_search_query:draft.imageSearchQuery||'', image_reviewed:Boolean(draft.imageReviewed)
    };
  };

  const originalReadForm = readForm;
  readForm = function() {
    const d = originalReadForm();
    return {...d,imageType:imageMeta.type,imageAlt:imageMeta.alt,imageSourceUrl:imageMeta.sourceUrl,imageCredit:imageMeta.credit,imageLicense:imageMeta.license,imagePosition:imageMeta.position,imageSearchQuery:fields.searchQuery.value.trim(),imageReviewed:imageMeta.reviewed};
  };

  const originalSelectDraft = selectDraft;
  selectDraft = function(id) {
    originalSelectDraft(id);
    const d = drafts.find(x => x.id === id); if (d) metaFromDraft(d);
  };

  const originalResetForm = resetForm;
  resetForm = function() { originalResetForm(); resetMeta(); setMode('commons'); };

  const originalUpdateLivePreview = updateLivePreview;
  updateLivePreview = function() {
    originalUpdateLivePreview();
    const live = $('#live-image'); if (live) live.style.backgroundPosition = imageMeta.position || '50% 50%';
    let li = $('#check-image-meta');
    if (!li) { li = document.createElement('li'); li.id='check-image-meta'; li.textContent='Popis, pôvod a kontrola obrázka'; $('.checklist')?.appendChild(li); }
    const typeOk = ['photo','official','own','ai'].includes(imageMeta.type);
    const sourceOk = ['own','ai'].includes(imageMeta.type) || Boolean(imageMeta.sourceUrl && imageMeta.license);
    li?.classList.toggle('ok', Boolean(currentImageData && typeOk && imageMeta.alt.length >= 8 && sourceOk && imageMeta.reviewed));
    updateTrust();
  };

  $('#publish-draft')?.addEventListener('click', event => {
    if (!(currentImageData || '').trim()) return;
    const problems = [];
    if (!['photo','official','own','ai'].includes(imageMeta.type)) problems.push('vyberte typ obrázka');
    if ((imageMeta.alt || '').trim().length < 8) problems.push('doplňte stručný ALT opis obrázka');
    if (!['own','ai'].includes(imageMeta.type) && !(imageMeta.sourceUrl || '').trim()) problems.push('doplňte zdrojový odkaz obrázka');
    if (!['own','ai'].includes(imageMeta.type) && !(imageMeta.license || '').trim()) problems.push('doplňte licenciu alebo právo použitia');
    if (!imageMeta.reviewed) problems.push('potvrďte redakčnú kontrolu obrázka');
    if (!problems.length) return;
    event.preventDefault(); event.stopImmediatePropagation();
    $('#draft-status').textContent = 'Skontrolujte obrázok pred publikovaním';
    alert('Obrázok ešte nie je pripravený na publikovanie:\n\n• ' + problems.join('\n• '));
  }, {capture:true});

  resetMeta(); setMode('commons'); updateLivePreview();
})();
