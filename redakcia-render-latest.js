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

    box.addEventListener('click', async e => {
      const openArticle = e.target.closest('[data-open-render-article]');
      if (openArticle && latest?.draft_id && typeof selectDraft === 'function') {
        selectDraft(latest.draft_id);
        setTimeout(() => document.querySelector('#heygen-render-panel')?.scrollIntoView({ behavior:'smooth', block:'center' }), 180);
        return;
      }
      const copy = e.target.closest('[data-copy-render-link]');
      if (copy && latest?.video_url) {
        try {
          await navigator.clipboard.writeText(latest.video_url);
          const old = copy.textContent;
          copy.textContent = 'Odkaz skopírovaný ✓';
          setTimeout(() => copy.textContent = old, 1400);
        } catch {
          window.prompt('Skopírujte odkaz na MP4:', latest.video_url);
        }
      }
    });

    refresh();
    timer = setInterval(refresh, 5000);
    window.addEventListener('beforeunload', () => timer && clearInterval(timer));
  }

  async function getLatestForDraft(draftId) {
    if (!draftId) return null;
    const { data, error } = await client.from('video_renders')
      .select('id,draft_id,title,provider,status,progress,video_url,thumbnail_url,subtitle_url,video_page_url,updated_at,created_at')
      .eq('draft_id', draftId)
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle();
    return error ? null : data;
  }

  async function getLatestOverall() {
    const { data, error } = await client.from('video_renders')
      .select('id,draft_id,title,provider,status,progress,video_url,thumbnail_url,subtitle_url,video_page_url,updated_at,created_at')
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle();
    return error ? null : data;
  }

  async function refresh() {
    const box = $('#heygen-latest-render');
    if (!box || typeof currentUser === 'undefined' || !currentUser) return;

    const draftId = String($('#draft-id')?.value || '').trim();
    let data = await getLatestForDraft(draftId);
    let scope = 'article';
    if (!data) {
      data = await getLatestOverall();
      scope = 'latest';
    }
    if (!data) { box.hidden = true; return; }

    latest = data;
    box.hidden = false;

    const status = data.status === 'completed' ? 'HOTOVÉ' : data.status === 'failed' ? 'CHYBA' : 'RENDERUJE SA';
    const title = scope === 'article' ? `Video k otvorenému článku · ${status}` : `Posledné video · ${status}`;
    const watch = data.video_url ? `<a href="${esc(data.video_url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;margin-right:7px;padding:7px 10px;border-radius:6px;background:#303136;color:#d9ff28;text-decoration:none;font-weight:900">▶ Pozrieť video</a>` : '';
    const download = data.video_url ? `<a href="${esc(data.video_url)}" download="objektiv24-video.mp4" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;margin-right:7px;padding:7px 10px;border:1px solid #303136;border-radius:6px;background:#fff;color:#303136;text-decoration:none;font-weight:900">Stiahnuť MP4</a>` : '';
    const copy = data.video_url ? `<button type="button" data-copy-render-link style="margin-top:8px;margin-right:7px;padding:7px 10px;border:1px solid #c9cdd1;border-radius:6px;background:white;color:#3d4148;font-weight:800;cursor:pointer">Kopírovať odkaz</button>` : '';
    const subtitles = data.subtitle_url ? `<a href="${esc(data.subtitle_url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;margin-right:7px;padding:7px 10px;border:1px solid #c9cdd1;border-radius:6px;background:white;color:#3d4148;text-decoration:none;font-weight:800">Titulky SRT ↗</a>` : '';
    const heygen = data.video_page_url ? `<a href="${esc(data.video_page_url)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;margin-right:7px;padding:7px 10px;border:1px solid #c9cdd1;border-radius:6px;background:white;color:#3d4148;text-decoration:none;font-weight:800">Otvoriť v HeyGen ↗</a>` : '';
    const article = data.draft_id && (!draftId || draftId !== String(data.draft_id)) ? `<button type="button" data-open-render-article style="margin-top:8px;padding:7px 10px;border:1px solid #c9cdd1;border-radius:6px;background:white;color:#3d4148;font-weight:800;cursor:pointer">Otvoriť článok</button>` : '';
    const thumb = data.thumbnail_url && data.status === 'completed' ? `<img src="${esc(data.thumbnail_url)}" alt="Náhľad hotového videa" style="display:block;width:92px;aspect-ratio:9/16;object-fit:cover;border-radius:7px;margin-top:9px;background:#101820">` : '';

    box.innerHTML = `<strong style="display:block;color:#333b1e;margin-bottom:3px">${esc(title)}</strong><span>${esc(data.title || 'Objektív24 video')}${data.status !== 'completed' ? ` · ${Math.round(Number(data.progress || 0))} %` : ''}</span>${thumb}<div>${watch}${download}${copy}${subtitles}${heygen}${article}</div>`;
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
