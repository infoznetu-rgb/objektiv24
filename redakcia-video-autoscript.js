(() => {
  const $ = s => document.querySelector(s);
  const clean = v => String(v || '').replace(/\s+/g, ' ').trim();

  function sentenceParts(text) {
    return clean(text).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);
  }

  function take(text, maxSentences = 2, maxWords = 34) {
    const parts = sentenceParts(text).slice(0, maxSentences);
    let words = clean(parts.join(' ')).split(/\s+/).filter(Boolean);
    if (words.length > maxWords) words = words.slice(0, maxWords);
    let out = clean(words.join(' '));
    if (out && !/[.!?…]$/.test(out)) out += '.';
    return out;
  }

  function compactTitle(text, maxWords = 16) {
    const words = clean(text).split(/\s+/).filter(Boolean);
    return words.length > maxWords ? words.slice(0, maxWords).join(' ') + '…' : words.join(' ');
  }

  function buildVoiceover() {
    const title = clean($('#title')?.value);
    const intro = clean($('#intro')?.value);
    const whatHappened = clean($('#what-happened')?.value);
    const whatItMeans = clean($('#what-it-means')?.value);
    const nextStep = clean($('#next-step')?.value);
    const hookField = $('#video-hook');
    const coverField = $('#vpro-cover');
    const ctaField = $('#video-cta');

    if (hookField && !clean(hookField.value)) hookField.value = compactTitle(title || intro, 14);
    if (coverField && !clean(coverField.value)) coverField.value = compactTitle(title || intro, 15);
    if (ctaField && !clean(ctaField.value)) ctaField.value = 'Podrobnosti a zdroje nájdete na Objektív24.';

    const sections = [];
    const introPart = take(intro, 1, 24);
    const happenedPart = take(whatHappened, 2, 38);
    const meansPart = take(whatItMeans, 2, 30);
    const nextPart = take(nextStep, 2, 30);

    if (introPart) sections.push(introPart);
    if (happenedPart) sections.push(happenedPart);
    if (meansPart) sections.push(meansPart);
    if (nextPart) sections.push(nextPart);

    let voiceover = clean(sections.join(' '));
    if (!voiceover) voiceover = clean([title, intro].filter(Boolean).join('. '));
    if (voiceover && !/[.!?…]$/.test(voiceover)) voiceover += '.';

    const words = voiceover.split(/\s+/).filter(Boolean);
    if (words.length > 112) voiceover = words.slice(0, 112).join(' ').replace(/[,:;\-–—]+$/, '') + '…';
    return voiceover;
  }

  function ensureScript() {
    const script = $('#video-script');
    if (!script || clean(script.value)) return false;
    const generated = buildVoiceover();
    if (!generated) return false;
    script.value = generated;
    script.dispatchEvent(new Event('input', { bubbles: true }));
    script.dispatchEvent(new Event('change', { bubbles: true }));
    try {
      const msg = $('#heygen-message');
      if (msg) {
        msg.hidden = false;
        msg.classList.remove('fail');
        msg.textContent = 'Voiceover sa automaticky pripravil z článku. Video balík už netreba vytvárať ručne.';
      }
    } catch {}
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('#heygen-render');
    if (!button) return;
    ensureScript();
  }, true);

  function decorate(n = 0) {
    const panel = $('#heygen-render-panel');
    if (!panel) {
      if (n < 160) setTimeout(() => decorate(n + 1), 180);
      return;
    }
    if (panel.querySelector('[data-autoscript-note]')) return;
    const note = document.createElement('p');
    note.dataset.autoscriptNote = '1';
    note.style.cssText = 'margin:8px 0 0;font-size:.67rem;line-height:1.45;color:#657078';
    note.textContent = 'Voiceover: ak video balík nie je pripravený, Redakcia ho pri renderi automaticky poskladá z textu článku.';
    panel.querySelector('.heygen-head > div')?.appendChild(note);
  }

  decorate();
})();
