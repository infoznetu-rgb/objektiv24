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
  let aiSceneMode = 'human';

  const style = document.createElement('style');
  style.textContent = `
    .image-editor{display:grid;gap:16px}.image-editor-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.image-editor-head p{margin:4px 0 0;color:#6f737b;font-size:.82rem;line-height:1.5}.image-trust{flex:none;border:1px solid #cfd1d7;border-radius:999px;padding:7px 10px;font-size:.66rem;font-weight:900;letter-spacing:.05em;color:#666b75;background:#fff}.image-trust.ok{border-color:#a7bd35;color:#4e6112;background:#f4fad6}.image-trust.ai{border-color:#8fa6be;color:#365675;background:#edf5fb}.image-trust.warn{border-color:#e6a85d;color:#784817;background:#fff5e7}.image-tabs{display:flex;gap:8px;flex-wrap:wrap}.image-tabs button{border:1px solid #cfd1d7;background:#fff;color:#3f4248;border-radius:999px;padding:9px 12px;font-weight:800;font-size:.78rem;cursor:pointer}.image-tabs button.is-active{background:#303136;color:#ceef26;border-color:#303136}.image-panel{border:1px solid #dfe1e5;background:#fbfbfc;border-radius:10px;padding:15px}.image-panel[hidden]{display:none}.image-search-row{display:grid;grid-template-columns:1fr auto;gap:8px}.image-search-row input{min-width:0}.image-search-row button,.image-small-button{border:0;background:#303136;color:#ceef26;border-radius:5px;padding:10px 13px;font-weight:800;cursor:pointer}.image-search-note{font-size:.75rem;color:#747882;margin:8px 0 0;line-height:1.45}.image-search-note strong{color:#42454c}.image-results{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}.image-result{overflow:hidden;border:1px solid #d9dbe0;background:#fff;border-radius:9px;display:flex;flex-direction:column}.image-result img{width:100%;aspect-ratio:4/3;object-fit:cover;background:#eef0f2}.image-result-body{padding:10px;display:flex;flex-direction:column;gap:6px;flex:1}.image-result-title{font-size:.76rem;font-weight:800;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.image-result-meta{font-size:.67rem;color:#6f737b;line-height:1.35}.image-license{display:inline-flex;align-self:flex-start;background:#eef3d5;color:#566414;border-radius:999px;padding:3px 7px;font-size:.61rem;font-weight:900}.image-result-actions{display:flex;gap:6px;margin-top:auto}.image-result-actions button,.image-result-actions a{flex:1;text-align:center;text-decoration:none;border:1px solid #cfd1d7;background:#fff;color:#3c3e44;border-radius:4px;padding:7px 8px;font-size:.68rem;font-weight:800;cursor:pointer}.image-result-actions button{background:#303136;color:#ceef26;border-color:#303136}.image-empty{grid-column:1/-1;padding:16px;border:1px dashed #cfd3d8;border-radius:8px;color:#777b84;font-size:.78rem}.image-ai-warning{border-left:3px solid #c4d63c;padding:9px 11px;background:#f8faea;color:#5b6041;font-size:.76rem;line-height:1.45;margin-bottom:12px}.image-ai-warning.is-sensitive{border-left-color:#c58957;background:#fff4e9;color:#775032}.image-fallback-warning{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #f0c98f;border-radius:10px;padding:11px 12px;background:#fff8ed;color:#755023;font-size:.75rem;line-height:1.4}.image-fallback-warning[hidden]{display:none}.image-fallback-warning strong{display:block;color:#553311}.image-fallback-warning button{flex:none;border:0;border-radius:6px;background:#303136;color:#ceef26;padding:9px 11px;font-weight:850;cursor:pointer}.image-scene-title{margin:3px 0 8px;font-size:.76rem;font-weight:850;color:#40434a}.image-scene-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}.image-scene-tabs button{border:1px solid #cfd1d7;border-radius:9px;background:#fff;color:#50545b;padding:10px 8px;text-align:left;cursor:pointer}.image-scene-tabs button strong{display:block;font-size:.72rem}.image-scene-tabs button small{display:block;margin-top:3px;color:#858a93;font-size:.64rem;line-height:1.3}.image-scene-tabs button.is-active{border-color:#303136;background:#303136;color:#ceef26}.image-scene-tabs button.is-active small{color:#dce4ba}.image-scene-summary{margin:0 0 10px;padding:10px 11px;border-radius:8px;background:#eef1f3;color:#50545b;font-size:.74rem;line-height:1.45}.image-prompt{width:100%;min-height:210px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.76rem;line-height:1.5}.image-prompt-actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}.image-upload-status{font-size:.75rem;color:#6f737b;margin-top:7px}.image-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}.image-meta-grid .wide{grid-column:1/-1}.image-review{display:flex;align-items:flex-start;gap:9px;margin:13px 0 0;font-size:.78rem;line-height:1.45;color:#5e626a}.image-review input{margin-top:3px}.image-preview-advanced{margin-top:0;max-width:none}.image-preview-advanced img{height:260px;object-fit:cover;background:#e9ebee}.focal-grid{display:grid;grid-template-columns:repeat(3,34px);gap:4px;margin-top:7px}.focal-grid button{width:34px;height:28px;border:1px solid #cfd1d7;background:#fff;border-radius:4px;cursor:pointer;color:#7a7e86}.focal-grid button.is-active{background:#303136;color:#ceef26;border-color:#303136}.image-source-fields.is-optional{opacity:.72}.image-source-fields.is-optional::before{content:'Voliteľné pri vlastnom alebo AI obrázku';display:block;font-size:.68rem;color:#858991;margin:6px 0 -4px}.commons-credit{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
    @media(max-width:760px){.image-results{grid-template-columns:1fr 1fr}.image-meta-grid{grid-template-columns:1fr}.image-meta-grid .wide{grid-column:auto}.image-editor-head{display:block}.image-trust{display:inline-flex;margin-top:10px}.image-scene-tabs{grid-template-columns:1fr}.image-fallback-warning{align-items:stretch;flex-direction:column}.image-fallback-warning button{width:100%}}
    @media(max-width:480px){.image-results{grid-template-columns:1fr}.image-search-row{grid-template-columns:1fr}.image-tabs button{flex:1}.image-preview-advanced img{height:210px}}
  `;
  document.head.appendChild(style);

  imageSection.innerHTML = `
    <div class="image-editor">
      <div class="image-editor-head">
        <div><h3>Obrázok článku</h3><p>Najprv hľadáme reálnu fotografiu s jasnou licenciou. Ak vhodná fotografia nie je, AI režim pripraví fotorealistickú redakčnú scénu priamo podľa témy článku.</p></div>
        <span id="image-trust" class="image-trust">CHÝBA OBRÁZOK</span>
      </div>

      <div id="image-fallback-warning" class="image-fallback-warning" hidden>
        <div><strong>Automatický náhradný obrázok</strong>Tento článok používa všeobecnú grafiku. Pre titulnú kartu odporúčame nahradiť ju relevantnou fotografiou alebo fotorealistickou AI fotografiou.</div>
        <button id="prepare-ai-photo" type="button">Pripraviť AI fotografiu</button>
      </div>

      <div class="image-tabs" role="tablist" aria-label="Spôsob výberu obrázka">
        <button type="button" class="is-active" data-image-mode="commons">Reálna fotografia</button>
        <button type="button" data-image-mode="upload">Vlastná / oficiálna</button>
        <button type="button" data-image-mode="ai">AI fotografia</button>
      </div>

      <div id="image-panel-commons" class="image-panel">
        <label for="image-search-query">Motív fotografie</label>
        <div class="image-search-row"><input id="image-search-query" type="text" placeholder="napr. student paperwork Slovakia"><button id="image-search-button" type="button">Hľadať fotografie</button></div>
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
        <div id="image-ai-warning" class="image-ai-warning">AI fotografia zostáva ilustračným obsahom a na webe bude jasne označená ako AI. Cieľom je realistická redakčná fotografia, nie grafika ani infografika.</div>
        <p class="image-scene-title">Vyberte typ scény</p>
        <div class="image-scene-tabs" aria-label="Variant AI fotografie">
          <button type="button" class="is-active" data-ai-scene="human"><strong>Človek v situácii</strong><small>Najprirodzenejší spravodajský záber.</small></button>
          <button type="button" data-ai-scene="environment"><strong>Miesto / prostredie</strong><small>Úrad, cesta, pobočka alebo pracovisko.</small></button>
          <button type="button" data-ai-scene="detail"><strong>Detail / predmety</strong><small>Dokumenty, ruky, zariadenie alebo predmet témy.</small></button>
        </div>
        <p id="image-ai-scene-summary" class="image-scene-summary"></p>
        <label for="image-ai-prompt">Zadanie pre fotorealistický generátor</label>
        <textarea id="image-ai-prompt" class="image-prompt"></textarea>
        <div class="image-prompt-actions">
          <button id="copy-image-prompt" class="image-small-button" type="button">Kopírovať zadanie</button>
          <button id="copy-all-image-prompts" class="image-small-button" type="button">Kopírovať 3 varianty</button>
          <button id="refresh-image-prompt" class="image-small-button" type="button">Navrhnúť nanovo</button>
        </div>
        <label for="ai-image-upload">Nahrať vygenerovanú AI fotografiu</label>
        <input id="ai-image-upload" type="file" accept="image/jpeg,image/png,image/webp">
        <p class="hint">Odporúčaný pomer 16:9. Vyberte fotografiu, ktorá vyzerá prirodzene aj ako malá miniatúra a neobsahuje text, logá ani grafické symboly.</p>
        <p id="ai-upload-status" class="image-upload-status"></p>
      </div>

      <div id="image-preview" class="image-preview image-preview-advanced" hidden><img alt="Náhľad obrázka článku"><button type="button" id="remove-image">Odstrániť obrázok</button></div>

      <div class="image-meta-grid">
        <div><label for="image-type">Typ obrázka</label><select id="image-type"><option value="">Vyberte typ</option><option value="photo">Ilustračná fotografia</option><option value="official">Oficiálny obrázok</option><option value="own">Vlastná fotografia</option><option value="ai">AI fotografia</option></select></div>
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
      [/sirot|potvrdenie o studiu|student|univerz|skol/, 'student paperwork university Slovakia'],
      [/predcasn.*dochod|starobn.*dochod|penzi|dochod/, 'senior paperwork pension Slovakia'],
      [/socialn.*poist|davk|matersk|tehotensk|prispev/, 'social services paperwork Slovakia'],
      [/dan|danov|financna sprava|formular|odklad/, 'tax forms calculator office Slovakia'],
      [/posta|balik|zasiel|sipo|pobock/, 'post office parcel counter Slovakia'],
      [/cyklist|pretek|uzaver|dopr|cest|dialnic|vodic|auto|kamion|tunel/, 'Slovakia road traffic closure'],
      [/vlak|zeleznic|stanic/, 'Slovakia railway station train'],
      [/lisk|besnot|veterinar|zvier/, 'red fox Slovakia wildlife'],
      [/energia|solar|fotovolt|zelena solidarita|elektrin/, 'solar panels house Slovakia'],
      [/poist|zajazd|cestovn|dovolen/, 'travel documents luggage Europe'],
      [/podvod|phishing|kyber|internet|heslo|sms/, 'smartphone cybersecurity warning'],
      [/nemoc|zdrav|lek|ambulanc|liec/, 'healthcare consultation Slovakia'],
      [/pocasie|burk|sneh|vietor|povoden/, 'Slovakia weather landscape'],
      [/spotrebit|reklamac|nakup|obchod|cena/, 'consumer shopping parcel Europe']
    ];
    for (const [re, q] of rules) if (re.test(text)) return q;
    const category = ($('#category')?.value || 'Slovakia').trim();
    return `${category} Slovakia editorial photo`.replace(/\s+/g, ' ');
  }

  function isSensitiveTopic() {
    const text = normal([$('#title')?.value, $('#intro')?.value, $('#what-happened')?.value].join(' '));
    return /nehod|poziar|utok|zran|mrt|obvinen|zatkn|polici|sud|vojna|volb|polit|minister|prezident|premier|protest|trest/.test(text);
  }

  function articleImageContext() {
    return normal([
      $('#title')?.value,
      $('#category')?.value,
      $('#intro')?.value,
      $('#what-happened')?.value,
      $('#what-it-means')?.value
    ].join(' '));
  }

  function aiSceneSet() {
    const t = articleImageContext();
    const sets = [
      {
        re:/sirot|potvrdenie o studiu|student|univerz|skol/,
        human:'a Slovak university-age student at a simple desk reviewing study paperwork on a laptop, natural daylight from a window, ordinary home interior, candid moment',
        environment:'a quiet university administration or student-services corridor in Slovakia, a young adult arriving with a document folder, realistic public-institution interior, no visible logos',
        detail:'close documentary detail of hands reviewing a study confirmation, notebook, pen and laptop on a modest desk, no readable personal data'
      },
      {
        re:/predcasn.*dochod|starobn.*dochod|penzi|dochod/,
        human:'an older adult at a kitchen table calmly reviewing pension paperwork, reading glasses and a closed envelope nearby, natural window light, ordinary Slovak home',
        environment:'a realistic social-services waiting area in Slovakia with older adults seated naturally, neutral institutional interior, no visible logos or readable signs',
        detail:'close documentary detail of older hands reviewing pension paperwork beside reading glasses and a calculator, no readable personal data'
      },
      {
        re:/socialn.*poist|davk|matersk|tehotensk|prispev/,
        human:'an adult at home using a laptop while checking official social-benefit paperwork, calm natural expression, daylight, realistic Slovak household',
        environment:'a neutral Slovak public-service office reception area with people waiting naturally, modern but ordinary interior, no branding or readable signs',
        detail:'hands using a laptop beside official-looking blank forms, pen and envelope, realistic paperwork without readable personal information'
      },
      {
        re:/dan|danov|financna sprava|formular|odklad|szco|odvod/,
        human:'a self-employed adult working at a home office desk with laptop, calculator and tax paperwork, realistic Slovak setting, natural daylight, candid editorial photography',
        environment:'a modest accountant or small-business office in Slovakia with paperwork and laptop, realistic working environment, no logos',
        detail:'close documentary detail of hands checking tax forms with calculator, pen and laptop, all document text unreadable'
      },
      {
        re:/posta|balik|zasiel|sipo|pobock/,
        human:'a customer carrying a parcel while approaching a generic Slovak postal-service counter, natural everyday scene, realistic documentary photography, no visible brand marks',
        environment:'exterior of a generic Slovak post-office style public-service building on an ordinary street, people entering naturally, no readable signage or logos',
        detail:'close documentary detail of hands holding a parcel and collection slip at a service counter, no readable personal data or logos'
      },
      {
        re:/cyklist|pretek|uzaver|dopr|cest|dialnic|vodic|auto|kamion|tunel/,
        human:'a Slovak driver viewed naturally beside a stationary car near temporary road restrictions, safe roadside context, realistic editorial photography',
        environment:'a real-looking Slovak road with temporary cones and lane restriction, normal traffic and landscape, believable daylight, no dramatic crash scene',
        detail:'close documentary detail of temporary road barriers, reflective cones and a vehicle dashboard edge, realistic road texture'
      },
      {
        re:/vlak|zeleznic|stanic/,
        human:'a passenger with a small bag checking travel information at a Slovak railway station, candid everyday moment, realistic natural light',
        environment:'a realistic Slovak railway platform with a regional train and waiting passengers, neutral station architecture, no readable signs',
        detail:'close documentary detail of a train doorway, platform edge and travel bag, natural materials and light'
      },
      {
        re:/podvod|phishing|kyber|internet|heslo|sms/,
        human:'an adult looking cautiously at a smartphone message at home, realistic concern without exaggeration, natural daylight, candid editorial photography',
        environment:'a normal home workspace with smartphone and laptop suggesting online safety, realistic and understated, no hacker imagery',
        detail:'close documentary detail of a smartphone in hand beside laptop keyboard, screen content intentionally unreadable, no warning icons'
      },
      {
        re:/nemoc|zdrav|lek|ambulanc|liec|rodin|matersk/,
        human:'an adult in a calm healthcare consultation setting with a medical professional seen generically, natural expressions, realistic Slovak clinic, no identifiable patient data',
        environment:'a clean ordinary clinic waiting room in Slovakia, natural daylight, realistic public healthcare environment, no visible logos or readable notices',
        detail:'close documentary detail of hands holding an appointment card or health document beside a phone, all text unreadable'
      },
      {
        re:/spotrebit|reklamac|nakup|obchod|cena|zajazd|cestovn/,
        human:'a consumer at home comparing a purchase or travel document on a laptop, realistic everyday environment, natural daylight, candid editorial photography',
        environment:'a neutral travel or customer-service desk with an adult discussing documents, realistic office setting, no logos or readable branding',
        detail:'close documentary detail of hands checking a receipt or booking document beside a smartphone and payment card, all text and numbers unreadable'
      }
    ];
    for (const set of sets) if (set.re.test(t)) return set;
    return {
      human:'an ordinary person in Slovakia dealing with the practical situation described by the article, candid natural posture, realistic everyday environment',
      environment:'a believable Slovak location directly connected with the article topic, natural daylight, documentary editorial photography',
      detail:'a close documentary detail of relevant everyday objects and hands connected with the article topic, realistic materials and no readable private data'
    };
  }

  function sceneLabel(mode=aiSceneMode) {
    return mode === 'environment' ? 'Miesto / prostredie' : mode === 'detail' ? 'Detail / predmety' : 'Človek v situácii';
  }

  function sceneText(mode=aiSceneMode) {
    const set = aiSceneSet();
    return set[mode] || set.human;
  }

  function buildAiPrompt(mode=aiSceneMode) {
    const title = ($('#title')?.value || 'spravodajská téma').trim();
    const category = ($('#category')?.value || 'Slovensko').trim();
    const intro = ($('#intro')?.value || '').trim();
    const sensitive = isSensitiveTopic();
    const scene = sceneText(mode);
    return [
      'Create a highly photorealistic editorial news photograph for the Slovak news website Objektív24.',
      `Article topic: ${title}.`,
      `Section: ${category}.`,
      intro ? `Editorial context: ${intro.slice(0, 260)}` : '',
      `Visible scene: ${scene}.`,
      'Visual direction: authentic documentary photography, believable Slovak or Central European environment, natural daylight, subtle realistic colors, 35mm or 50mm photojournalistic lens, eye-level perspective, natural body language, realistic skin and hands, physically correct objects, shallow-to-moderate depth of field.',
      'Composition: horizontal 16:9 hero image, one clear focal subject, strong but natural composition, enough clean space for responsive cropping, readable as a small mobile thumbnail.',
      'Do not create an illustration, vector art, 3D render, poster, infographic, collage, stock-photo cliché, advertising composition or futuristic scene.',
      'Do not show large currency symbols, charts, arrows, floating icons, UI overlays, captions, readable document text, logos, watermarks, fake headlines or brand marks.',
      'Do not invent official uniforms, official seals, exact documents or recognizable real people.',
      sensitive ? 'Sensitive-topic rule: use a generic symbolic documentary scene only. Do not reconstruct a real accident, police action, crime, protest, political event or identifiable public figure.' : 'The mood should be calm, credible and observational rather than dramatic, promotional or sensational.',
      'The finished image must look like a convincing editorial photograph while remaining clearly suitable to label as an AI-generated illustrative image.'
    ].filter(Boolean).join(' ');
  }

  function refreshAiPrompt() {
    const prompt = $('#image-ai-prompt');
    const summary = $('#image-ai-scene-summary');
    if (prompt) prompt.value = buildAiPrompt(aiSceneMode);
    if (summary) summary.textContent = `${sceneLabel(aiSceneMode)}: ${sceneText(aiSceneMode)}`;
    document.querySelectorAll('[data-ai-scene]').forEach(b => b.classList.toggle('is-active', b.dataset.aiScene === aiSceneMode));
  }

  function allAiPrompts() {
    return ['human','environment','detail'].map(mode => `${sceneLabel(mode).toUpperCase()}\n${buildAiPrompt(mode)}`).join('\n\n---\n\n');
  }

  function sourceHost(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }

  function isFallbackImage() {
    const src = String(currentImageData || '');
    return /\/assets\/fallback\//i.test(src);
  }

  function updateFallbackWarning() {
    const box = $('#image-fallback-warning');
    if (box) box.hidden = !isFallbackImage();
  }

  function updateTrust() {
    const badge = $('#image-trust');
    const has = Boolean((currentImageData || '').trim());
    badge.className = 'image-trust';
    updateFallbackWarning();
    if (!has) { badge.textContent = 'CHÝBA OBRÁZOK'; return; }
    if (isFallbackImage()) { badge.textContent = 'FALLBACK · ODPORÚČANÁ VÝMENA'; badge.classList.add('warn'); return; }
    if (imageMeta.type === 'ai') { badge.textContent = imageMeta.reviewed ? 'AI FOTO · SKONTROLOVANÉ' : 'AI FOTO · ČAKÁ NA KONTROLU'; badge.classList.add('ai'); return; }
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
    aiSceneMode = 'human';
    const q = suggestQuery(); imageMeta.searchQuery = q; fields.searchQuery.value = q;
    syncFieldsFromMeta();
    refreshAiPrompt();
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
    refreshAiPrompt();
  }

  function setMode(mode) {
    activeMode = mode;
    document.querySelectorAll('[data-image-mode]').forEach(b => b.classList.toggle('is-active', b.dataset.imageMode === mode));
    ['commons','upload','ai'].forEach(m => { const p = $(`#image-panel-${m}`); if (p) p.hidden = m !== mode; });
    if (mode === 'ai') {
      const warning = $('#image-ai-warning');
      warning.classList.toggle('is-sensitive', isSensitiveTopic());
      warning.textContent = isSensitiveTopic()
        ? 'Citlivá alebo konkrétna udalosť: používajte iba všeobecnú fotorealistickú ilustračnú scénu. Nevytvárajte falošný autentický záber konkrétnej osoby, nehody, zásahu alebo politickej udalosti.'
        : 'AI fotografia má pôsobiť ako dôveryhodná redakčná fotografia, ale na webe zostane jasne označená ako AI. Vyhýbame sa grafom, ikonám, veľkým symbolom a reklamnej estetike.';
      refreshAiPrompt();
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
        imageMeta.type = 'ai'; imageMeta.credit = 'Objektív24 · AI'; imageMeta.license = 'AI-generated editorial illustration'; imageMeta.sourceUrl = '';
        const title = ($('#title')?.value || '').trim();
        imageMeta.alt = imageMeta.alt || `Fotorealistická AI fotografia k téme: ${title}`.slice(0, 270);
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
  $('#prepare-ai-photo')?.addEventListener('click', () => {
    aiSceneMode = 'human';
    setMode('ai');
    $('#image-panel-ai')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  document.querySelectorAll('[data-ai-scene]').forEach(b => b.addEventListener('click', () => {
    aiSceneMode = b.dataset.aiScene || 'human';
    refreshAiPrompt();
  }));
  $('#copy-image-prompt').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#image-ai-prompt').value); $('#draft-status').textContent = 'AI zadanie skopírované'; }
    catch { $('#image-ai-prompt').select(); document.execCommand('copy'); }
  });
  $('#copy-all-image-prompts').addEventListener('click', async () => {
    const value = allAiPrompts();
    try { await navigator.clipboard.writeText(value); $('#draft-status').textContent = 'Tri AI varianty skopírované'; }
    catch { $('#image-ai-prompt').value = value; $('#image-ai-prompt').select(); document.execCommand('copy'); }
  });
  $('#refresh-image-prompt').addEventListener('click', () => refreshAiPrompt());
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
    if (activeMode === 'ai') refreshAiPrompt();
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
