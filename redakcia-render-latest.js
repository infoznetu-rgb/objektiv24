(() => {
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let latest = null;
  let timer = null;

  function boot(tries = 0) {
    const panel = $('#heygen-render-panel');
    if (!panel || typeof client === 'undefined') {
      if (tries < 120) setTimeout(() => boot(tries + 1), 180);
      return;
    }
    if ($('#heygen-latest-render')) return;

    const box = document.createElement('div');
    box.id = 'heygen-latest-render';
    box.hidden = true;
    box.style.cssText = 'margin-top:12px;padding:12px 14px;border:1px solid #dfe5c2;border-radius:10px;background:#f8fbe9;font-size:.73rem;line-height:1.45;color:#4e5734';
    panel.insertBefore(box, panel.querySelector('.heygen-setup'));

    box.addEventListener('click', e => {
      const openArticle = e.target.closest('[data-open-render-article]');
      if (openArticle && latest?.draft_id && typeof selectDraft === 'function') {
        selectDraft(latest.draft_id);
        setTimeout(() => document.querySelector('#heygen-render-panel')?.scrollIntoView({ behavior:'smooth', block:'center' }), 180);
      }
    });

    refresh();
    timer = setInterval(refresh, 5000);
    window.addEventListener('beforeunload', () => timer && clearInterval(timer));
  }

  async function refresh() {
    const box = $('#heygen-latest-render');
    if (!box || !currentUser) return;
    const draftId = String($('#draft-id')?.value || '').trim();
    if (draftId) { box.hidden = true; return; }

    const { data, error } = await client.from('video_renders')
      .select('id,draft_id,title,status,progress,video_url,video_page_url,updated_at')
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle();
    if (error || !data) { box.hidden = true; return; }
    latest = data;
    box.hidden = false;

    const status = data.status === 'completed' ? 'HOTOVÉ' : data.status === 'failed' ? 'CHYBA' : 'RENDERUJE SA';
    const watch = data.video_url ? `<a href="${esc(data.video_url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;margin-right:7px;padding:7px 10px;border-radius:6px;background:#303136;color:#d9ff28;text-decoration:none;font-weight:900">▶ Pozrieť video</a>` : '';
    const heygen = data.video_page_url ? `<a href="${esc(data.video_page_url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;margin-right:7px;padding:7px 10px;border:1px solid #c9cdd1;border-radius:6px;background:white;color:#3d4148;text-decoration:none;font-weight:800">Otvoriť v HeyGen ↗</a>` : '';
    const article = data.draft_id ? `<button type="button" data-open-render-article style="margin-top:8px;padding:7px 10px;border:1px solid #c9cdd1;border-radius:6px;background:white;color:#3d4148;font-weight:800;cursor:pointer">Otvoriť článok</button>` : '';

    box.innerHTML = `<strong style="display:block;color:#333b1e;margin-bottom:3px">Posledné video · ${esc(status)}</strong><span>${esc(data.title || 'Objektív24 video')}${data.status !== 'completed' ? ` · ${Math.round(Number(data.progress || 0))} %` : ''}</span><div>${watch}${heygen}${article}</div>`;
  }

  function loadBrandModule() {
    if (document.querySelector('script[data-redakcia-video-brand]')) return;
    const s = document.createElement('script');
    s.src = 'redakcia-video-brand.js?v=20260917-1';
    s.async = false;
    s.dataset.redakciaVideoBrand = '1';
    document.head.appendChild(s);
  }

  loadBrandModule();
  boot();
})();
