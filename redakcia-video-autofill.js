(() => {
  const $ = s => document.querySelector(s);
  const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
  let runToken = 0;
  let running = false;
  let lastDraftId = '';

  function stripHtml(v='') {
    const d = document.createElement('div');
    d.innerHTML = String(v || '');
    return clean(d.textContent || '');
  }

  function topicText() {
    return clean([
      $('#title')?.value,
      $('#category')?.value,
      $('#intro')?.value,
      $('#what-happened')?.value,
      $('#what-it-means')?.value,
      $('#next-step')?.value
    ].join(' ')).toLocaleLowerCase('sk').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function queryForTopic() {
    const t = topicText();
    if (/tunel|cest|dopr|vodic|uzaver|dialnic|auto|kolon|premav/.test(t)) return 'road tunnel traffic driving highway cars';
    if (/urad|social|davk|prispev|dochod|formular/.test(t)) return 'office paperwork public administration people';
    if (/skol|ziak|student|tried|matur/.test(t)) return 'school classroom students education';
    if (/energia|elektrin|plyn|solar|fotovolt/.test(t)) return 'electricity solar energy home';
    if (/pocasie|burk|sneh|vietor|povoden|dazd/.test(t)) return 'weather rain street storm snow';
    if (/zdrav|nemoc|lek|ambulanc|nemocnic/.test(t)) return 'hospital healthcare medical building';
    if (/spotrebit|cena|nakup|obchod|reklamac/.test(t)) return 'shopping supermarket checkout store';
    return 'Slovakia city people street everyday life';
  }

  function scoreItem(x) {
    const s = `${x.title} ${x.description}`.toLowerCase();
    let score = 0;
    const plus = [
      [/tunnel|tunel/, 8], [/traffic|premav|cars?|vehicles?/, 7], [/road|street|highway|freeway|motorway/, 6],
      [/driv|journey|route/, 4], [/city|urban/, 2]
    ];
    const minus = [
      [/accident|crash|collision|jumped|joy|bad traffic|cctv|dashcam|police|fire|explosion|war|military/, -20],
      [/metro|subway|train|railway/, -8], [/game|animation|simulation/, -12]
    ];
    plus.forEach(([re,n]) => { if (re.test(s)) score += n; });
    minus.forEach(([re,n]) => { if (re.test(s)) score += n; });
    if (/video\/(webm|mp4)/.test(x.mime)) score += 2;
    if (x.license) score += 2;
    return score;
  }

  function existingLooksBad(items) {
    return items.some(x => /jumped|joy|accident|crash|collision|cctv|bad traffic/i.test(`${x.label} ${x.credit}`));
  }

  async function fetchCandidates() {
    const q = queryForTopic();
    const params = new URLSearchParams({
      origin: '*', action: 'query', generator: 'search', gsrsearch: `${q} filetype:video`, gsrnamespace: '6', gsrlimit: '25',
      prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '480', format: 'json', formatversion: '2'
    });
    const r = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    if (!r.ok) throw new Error(`Wikimedia HTTP ${r.status}`);
    const data = await r.json();
    const pages = Array.isArray(data?.query?.pages) ? data.query.pages : [];
    return pages.map(page => {
      const ii = page?.imageinfo?.[0] || {};
      const meta = ii.extmetadata || {};
      const mime = clean(ii.mime).toLowerCase();
      const title = clean(page.title).replace(/^File:/i, '');
      const license = stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value || '');
      const artist = stripHtml(meta.Artist?.value || meta.Credit?.value || '');
      const description = stripHtml(meta.ImageDescription?.value || meta.ObjectName?.value || '');
      const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page.title || '').replace(/ /g,'_'))}`;
      return { url: ii.url, mime, title, license, artist, description, sourceUrl };
    }).filter(x => /^https:\/\//i.test(x.url) && /^video\/(webm|mp4)/.test(x.mime) && x.license)
      .map(x => ({ ...x, score: scoreItem(x) }))
      .filter(x => x.score > 0)
      .sort((a,b) => b.score - a.score)
      .slice(0, 8);
  }

  async function autofill(force = false) {
    const api = window.objektiv24MotionBroll;
    const draftId = clean($('#draft-id')?.value);
    if (!api || !draftId || running) return;
    const current = api.getItems?.() || [];
    if (!force && current.length >= 3 && !existingLooksBad(current)) return;

    running = true;
    const my = ++runToken;
    const status = $('#video-library-status');
    if (status) status.textContent = 'Automaticky vyberám vhodné licencované B-roll klipy…';
    try {
      const candidates = await fetchCandidates();
      if (my !== runToken || !candidates.length) return;

      const needReplace = existingLooksBad(current);
      const targetCount = 3;
      const chosen = candidates.slice(0, targetCount);
      if (!chosen.length) return;

      if (needReplace) {
        for (let i = 0; i < chosen.length; i++) {
          const x = chosen[i];
          await api.setItem(i, x.url, {
            label: `Ilustračný B-roll: ${x.title}`,
            credit: `${x.artist ? x.artist + ' · ' : ''}${x.license}`,
            sourceUrl: x.sourceUrl
          });
        }
      } else {
        let slot = current.length;
        for (const x of chosen) {
          if (slot >= targetCount) break;
          await api.setItem(slot, x.url, {
            label: `Ilustračný B-roll: ${x.title}`,
            credit: `${x.artist ? x.artist + ' · ' : ''}${x.license}`,
            sourceUrl: x.sourceUrl
          });
          slot++;
        }
      }
      if (api.whenIdle) await api.whenIdle();
      if (status) status.textContent = 'B-roll bol automaticky doplnený a uložený. Pred renderom si klipy prezrite.';
      lastDraftId = draftId;
    } catch (e) {
      console.warn('Auto B-roll:', e);
      if (status) status.textContent = 'Automatické doplnenie klipov sa nepodarilo. Môžete použiť ručný výber.';
    } finally {
      running = false;
    }
  }

  function boot(tries = 0) {
    if (!window.objektiv24MotionBroll || typeof client === 'undefined') {
      if (tries < 120) setTimeout(() => boot(tries + 1), 180);
      return;
    }
    setTimeout(() => autofill(false), 900);
    try {
      const original = selectDraft;
      selectDraft = function(id) {
        original(id);
        setTimeout(() => autofill(false), 900);
      };
    } catch {}
    ['#title','#category','#intro','#what-happened','#what-it-means','#next-step'].forEach(sel => {
      $(sel)?.addEventListener('change', () => setTimeout(() => autofill(false), 700));
    });
  }

  window.objektiv24AutoBroll = { run: () => autofill(true) };
  boot();
})();
