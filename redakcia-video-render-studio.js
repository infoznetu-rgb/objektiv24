(() => {
  const $ = s => document.querySelector(s);
  const clean = v => String(v || '').replace(/\s+/g, ' ').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const BUCKET = 'article-images';
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
      .heygen-render{margin-top:14px;border:1px solid #d8dce1;background:#fff;border-radius:12px;padding:15px}.heygen-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start}.heygen-head h4{margin:0 0 5px;font-size:.95rem}.heygen-head p{margin:0;color:#717780;font-size:.75rem;line-height:1.48;max-width:700px}.heygen-pill{flex:none;border-radius:999px;padding:7px 10px;background:#eef0f2;color:#626871;font-size:.66rem;font-weight:950}.heygen-pill.ok{background:#eaf5bb;color:#4b5d0d}.heygen-pill.busy{background:#eaf2fb;color:#335d82}.heygen-pill.fail{background:#fff0e8;color:#8a4f2f}.heygen-grid{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:end;margin-top:13px}.heygen-grid label{font-size:.7rem;color:#686e77}.heygen-grid select{display:block;width:100%;margin-top:5px}.heygen-actions{display:flex;gap:7px;flex-wrap:wrap}.heygen-actions button{border:1px solid #c7cbd1;background:#fff;border-radius:6px;padding:9px 11px;font-weight:850;font-size:.69rem;cursor:pointer}.heygen-actions .render{background:#303136;color:#ceef26;border-color:#303136}.heygen-actions button:disabled{opacity:.5;cursor:not-allowed}.heygen-progress{margin-top:12px}.heygen-progress-track{height:8px;background:#edf0f2;border-radius:999px;overflow:hidden}.heygen-progress-track i{display:block;height:100%;width:0;background:#303136;transition:width .35s ease}.heygen-progress-meta{display:flex;justify-content:space-between;gap:12px;margin-top:6px;font-size:.68rem;color:#747a82}.heygen-message{margin-top:11px;padding:10px 12px;border-left:3px solid #b7c53c;background:#f8faea;color:#5a6141;font-size:.73rem;line-height:1.5}.heygen-message.fail{border-left-color:#c98a58;background:#fff4e9;color:#754f35}.heygen-result{margin-top:13px}.heygen-result video{display:block;width:min(100%,360px);aspect-ratio:9/16;background:#071018;border-radius:14px;object-fit:contain}.heygen-result-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.heygen-result-actions a{display:inline-flex;text-decoration:none;border:1px solid #c7cbd1;background:#fff;color:#3a3e44;border-radius:6px;padding:8px 10px;font-weight:850;font-size:.69rem}.heygen-result-actions a.primary{background:#303136;color:#ceef26;border-color:#303136}.heygen-setup{margin-top:10px;font-size:.7rem;color:#777d85;line-height:1.45}.heygen-voice-row{display:grid;grid-template-columns:1fr auto;gap:7px}.heygen-preview-voice{margin-top:5px;border:1px solid #c7cbd1;background:#fff;border-radius:6px;padding:8px 10px;cursor:pointer}.heygen-mode-note{display:inline-flex;margin-top:8px;border-radius:999px;padding:5px 8px;background:#f1f3f4;color:#5f6870;font-size:.63rem;font-weight:900;letter-spacing:.03em}@media(max-width:760px){.heygen-grid{grid-template-columns:1fr}.heygen-actions{width:100%}.heygen-actions button{flex:1}.heygen-head{display:block}.heygen-pill{display:inline-flex;margin-top:9px}}
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'heygen-render-panel';
    panel.className = 'heygen-render';
    panel.innerHTML = `
      <div class="heygen-head">
        <div><h4>Finálne video · HeyGen Studio</h4><p>Stabilný priamy render: fotografia článku + slovenský voiceover + SRT titulky. Redakcia pred renderom automaticky presunie starý obrázok do bezpečného verejného úložiska.</p><span class="heygen-mode-note">STUDIO DIRECT · BEZ VIDEO AGENTA</span></div>
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
      <p class="heygen-setup">Nový režim nepoužíva Video Agent. HeyGen dostane presne jednu verejnú fotografiu, presný text a vybraný slovenský hlas, takže je podstatne menej vecí, ktoré môžu zlyhať.</p>`;
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
      if (showSuccess) message('HeyGen je pripojený. Nový režim používa priamy Studio render.');
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

  async function createRender() {
    const draftId = clean($('#draft-id')?.value);
    const p = production();
    if (!draftId) return alert('Najprv návrh uložte.');
    if (!p.voiceover) return alert('Najprv pripravte video balík — chýba voiceover.');
    if (!p.image.url) return alert('Najprv vyberte relevantný obrázok článku.');
    if (!configured) { await checkConnection(false); if (!configured) return; }
    if (!confirm('Spustiť stabilný HeyGen Studio render? Táto akcia môže spotrebovať HeyGen API kredit.')) return;

    stopPolling();
    $('#heygen-render').disabled = true;
    setPill('PRIPRAVUJEM', 'busy');
    try {
      await ensurePublicImage(draftId, p);
      setProgress(4, 'Odosielam do HeyGen Studio…');
      message('Fotografia je pripravená. Spúšťam priamy Studio render…');
      const voiceId = $('#heygen-voice')?.value || '';
      const response = await invoke('render', { draftId, voiceId, production:p });
      const r = response?.data || {};
      if (!r.video_id) throw new Error('HeyGen nevrátil video_id.');
      const row = {
        user_id:currentUser.id, draft_id:draftId, title:p.title || 'Objektív24 video', provider:'heygen-studio', session_id:null,
        video_id:r.video_id, status:r.status || 'processing', progress:Number(r.progress || 5), voice_id:r.voice_id || voiceId || null
      };
      const { data:inserted, error } = await client.from('video_renders').insert(row).select().single();
      currentJob = error ? { ...row, id:null } : inserted;
      setPill('RENDERUJE SA', 'busy');
      message('HeyGen Studio render bol prijatý. Stav sa bude obnovovať automaticky.');
      renderJob(); startPolling();
    } catch (error) {
      setPill('CHYBA', 'fail');
      setProgress(0, 'Render sa nespustil.');
      if (error?.code === 'VIDEO_WRITE_PERMISSION_REQUIRED' || /Video.*Zapis|write|permission|scope/i.test(error?.message || '')) {
        message('HeyGen pripojenie funguje, ale API kľúč nemá právo VYTVÁRAŤ videá. V HeyGen pri API kľúči treba nastaviť: „Wideo → Zapis“. Ostatné oprávnenia nemusíte rozširovať.', true);
      } else message(`Render sa nespustil: ${error.message}`, true);
    } finally { $('#heygen-render').disabled = false; }
  }

  function renderJob() {
    const result = $('#heygen-result'); if (!result) return;
    if (!currentJob) { result.innerHTML=''; setProgress(0,'Zatiaľ nie je spustený nový Studio render.'); return; }
    const status = currentJob.status || 'processing';
    const progress = Number(currentJob.progress || 0);
    setProgress(progress, status === 'completed' ? 'Finálne video je hotové.' : status === 'failed' ? 'Render zlyhal.' : `HeyGen Studio renderuje · ${progress}%`);
    if (status === 'completed' && currentJob.video_url) {
      setPill('HOTOVÉ','ok');
      message('Hotové video je pripravené. Pred publikovaním ho celé skontrolujte.');
      result.innerHTML = `<video controls playsinline poster="${esc(currentJob.thumbnail_url || '')}" src="${esc(currentJob.video_url)}"></video><div class="heygen-result-actions"><a class="primary" href="${esc(currentJob.video_url)}" target="_blank" rel="noopener">Otvoriť MP4 ↗</a>${currentJob.subtitle_url?`<a href="${esc(currentJob.subtitle_url)}" target="_blank" rel="noopener">Titulky SRT ↗</a>`:''}${currentJob.video_page_url?`<a href="${esc(currentJob.video_page_url)}" target="_blank" rel="noopener">Otvoriť v HeyGen ↗</a>`:''}</div>`;
    } else if (status === 'failed') {
      setPill('ZLYHAL','fail'); message(currentJob.failure_message || 'HeyGen Studio render zlyhal.', true); result.innerHTML='';
    } else { setPill('RENDERUJE SA','busy'); result.innerHTML=''; }
  }

  async function pollStatus(manual = false) {
    if (!currentJob?.video_id && !currentJob?.session_id) return;
    if (manual) message('Obnovujem stav renderu…');
    try {
      const response = await invoke('status', { videoId:currentJob.video_id || '', sessionId:currentJob.session_id || '' });
      const s = response?.data || {};
      currentJob = { ...currentJob, status:s.status || currentJob.status, progress:Number(s.progress ?? currentJob.progress ?? 0), video_id:s.video_id || currentJob.video_id || null,
        video_url:s.video_url || currentJob.video_url || null, thumbnail_url:s.thumbnail_url || currentJob.thumbnail_url || null, subtitle_url:s.subtitle_url || currentJob.subtitle_url || null,
        video_page_url:s.video_page_url || currentJob.video_page_url || null, failure_message:s.failure_message || null, updated_at:new Date().toISOString() };
      if (currentJob.id) await client.from('video_renders').update({ status:currentJob.status, progress:currentJob.progress, video_id:currentJob.video_id, video_url:currentJob.video_url,
        thumbnail_url:currentJob.thumbnail_url, subtitle_url:currentJob.subtitle_url, video_page_url:currentJob.video_page_url, failure_message:currentJob.failure_message, updated_at:currentJob.updated_at }).eq('id',currentJob.id);
      if (manual) message(currentJob.status === 'completed' ? 'Video je hotové.' : currentJob.status === 'failed' ? (currentJob.failure_message || 'Render zlyhal.') : 'Stav bol obnovený.', currentJob.status === 'failed');
      renderJob(); if (['completed','failed'].includes(currentJob.status)) stopPolling();
    } catch (error) { if (manual) message(`Stav sa nepodarilo obnoviť: ${error.message}`, true); }
  }
  function startPolling(){ stopPolling(); pollStatus(); pollTimer=setInterval(pollStatus,8000); }
  function stopPolling(){ if(pollTimer) clearInterval(pollTimer); pollTimer=null; }

  async function loadLatestRender() {
    stopPolling(); currentJob=null; renderJob();
    const draftId=clean($('#draft-id')?.value); if(!draftId || !currentUser) return;
    const {data,error}=await client.from('video_renders').select('*').eq('draft_id',draftId).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error || !data) return; currentJob=data; renderJob(); if(!['completed','failed'].includes(currentJob.status)) startPolling();
  }
  function wrapDraftNavigation(){
    try{const original=selectDraft; selectDraft=function(id){original(id);setTimeout(loadLatestRender,100);};}catch{}
    try{const original=resetForm; resetForm=function(){original();stopPolling();currentJob=null;renderJob();};}catch{}
    window.addEventListener('beforeunload',stopPolling);
  }
  boot();
})();
