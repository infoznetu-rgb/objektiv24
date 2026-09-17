(() => {
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let timer = null;
  let busy = false;
  let capabilityChecked = false;

  async function invoke(action, body = {}) {
    const { data, error } = await client.functions.invoke('heygen-render', { body: { action, ...body } });
    if (error) throw error;
    return data || {};
  }

  async function syncOne(row) {
    if ((!row?.session_id && !row?.video_id) || ['completed','failed'].includes(row.status)) return row;
    const response = await invoke('status', { sessionId: row.session_id || '', videoId: row.video_id || '' });
    const s = response?.data || {};
    const next = {
      status: s.status || row.status || 'processing',
      progress: Number(s.progress ?? row.progress ?? 0),
      video_id: s.video_id || row.video_id || null,
      video_url: s.video_url || row.video_url || null,
      thumbnail_url: s.thumbnail_url || row.thumbnail_url || null,
      subtitle_url: s.subtitle_url || row.subtitle_url || null,
      video_page_url: s.video_page_url || row.video_page_url || null,
      failure_message: s.failure_message || null,
      updated_at: new Date().toISOString()
    };
    await client.from('video_renders').update(next).eq('id', row.id);
    return { ...row, ...next };
  }

  function updateVisiblePanel(row) {
    const draftId = String($('#draft-id')?.value || '').trim();
    if (!draftId || draftId !== String(row?.draft_id || '')) return;
    const pct = Math.round(Number(row.progress || 0));
    const pill = $('#heygen-pill'), status = $('#heygen-status'), percent = $('#heygen-percent'), bar = $('#heygen-progress-bar'), msg = $('#heygen-message'), result = $('#heygen-result');
    if (percent) percent.textContent = `${pct} %`;
    if (bar) bar.style.width = `${pct}%`;
    if (row.status === 'completed' && row.video_url) {
      if (pill) { pill.textContent = 'HOTOVÉ'; pill.className = 'heygen-pill ok'; }
      if (status) status.textContent = 'Finálne video je hotové.';
      if (msg) { msg.hidden = false; msg.className = 'heygen-message'; msg.textContent = 'Hotové MP4 je pripravené. Pred zverejnením ho ešte raz celé skontrolujte.'; }
      if (result) result.innerHTML = `<video controls playsinline poster="${esc(row.thumbnail_url || '')}" src="${esc(row.video_url)}"></video><div class="heygen-result-actions"><a class="primary" href="${esc(row.video_url)}" target="_blank" rel="noopener">Otvoriť MP4 ↗</a>${row.subtitle_url ? `<a href="${esc(row.subtitle_url)}" target="_blank" rel="noopener">Titulky SRT ↗</a>` : ''}${row.video_page_url ? `<a href="${esc(row.video_page_url)}" target="_blank" rel="noopener">Otvoriť v HeyGen ↗</a>` : ''}</div>`;
    } else if (row.status === 'failed') {
      if (pill) { pill.textContent = 'ZLYHAL'; pill.className = 'heygen-pill fail'; }
      if (status) status.textContent = 'Predchádzajúci render zlyhal.';
      if (msg) { msg.hidden = false; msg.className = 'heygen-message fail'; msg.textContent = row.failure_message || 'Predchádzajúci HeyGen render zlyhal.'; }
      if (result) result.innerHTML = '';
    } else {
      if (pill) { pill.textContent = 'RENDERUJE SA'; pill.className = 'heygen-pill busy'; }
      if (status) status.textContent = `HeyGen Studio renderuje · ${pct}%`;
    }
  }

  async function checkCapability() {
    if (capabilityChecked || !$('#heygen-render-panel')) return;
    capabilityChecked = true;
    try {
      const data = await invoke('capability');
      const button = $('#heygen-render');
      if (data?.writable === false) {
        if (button) { button.disabled = true; button.title = 'Chýba oprávnenie Wideo → Zapis'; }
        const pill = $('#heygen-pill'), msg = $('#heygen-message');
        if (pill) { pill.textContent = 'CHÝBA VIDEO WRITE'; pill.className = 'heygen-pill fail'; }
        if (msg) { msg.hidden = false; msg.className = 'heygen-message fail'; msg.textContent = 'HeyGen API kľúč je pripojený, ale nemá oprávnenie vytvárať Studio videá. V HeyGen API kľúči nastavte iba: Wideo → Zapis (Video → Write). Potom obnovte Redakciu.'; }
      } else if (data?.writable === true) {
        if (button) { button.disabled = false; button.title = ''; }
      }
    } catch (error) {
      console.warn('HeyGen capability check:', error);
    }
  }

  async function tick() {
    if (busy || typeof client === 'undefined' || typeof currentUser === 'undefined' || !currentUser) return;
    busy = true;
    try {
      await checkCapability();
      const { data, error } = await client.from('video_renders').select('*').in('status', ['generating','processing']).order('created_at', { ascending:false }).limit(5);
      if (error || !Array.isArray(data)) return;
      for (const row of data) {
        try { const synced = await syncOne(row); updateVisiblePanel(synced); }
        catch (error) { console.warn('HeyGen status sync:', error); }
      }
    } finally { busy = false; }
  }

  function boot(tries = 0) {
    if (typeof client === 'undefined') { if (tries < 120) setTimeout(() => boot(tries + 1), 180); return; }
    tick(); timer = setInterval(tick, 4000); window.addEventListener('beforeunload', () => timer && clearInterval(timer));
  }
  boot();
})();