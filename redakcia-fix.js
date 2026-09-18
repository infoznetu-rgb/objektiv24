(() => {
  try { if (typeof builtInDrafts !== "undefined") builtInDrafts.length = 0; } catch {}
  try { if (typeof publishedDrafts !== "undefined") publishedDrafts.length = 0; } catch {}

  const originalRenderDraftList = renderDraftList;
  renderDraftList = function () {
    originalRenderDraftList();
    const realDrafts = drafts.filter(d => !d.seed);
    const count = document.querySelector("#draft-count");
    const list = document.querySelector("#draft-list");
    if (count) count.textContent = String(realDrafts.length);
    if (list && realDrafts.length === 0) {
      list.innerHTML = `<div class="draft-empty-state"><strong>Zatiaľ žiadne nové návrhy</strong><p>Automaticky pripravené články sa zobrazia tu až po uložení do Supabase.</p></div>`;
    }
  };

  refreshDrafts = async function () {
    const status = document.querySelector("#draft-status");
    if (status) status.textContent = "Synchronizujem…";
    let serverDrafts = await loadServerDrafts();
    serverDrafts = await migrateLegacyDraftsIfNeeded(serverDrafts);
    drafts = [...serverDrafts];
    renderDraftList();
    if (status) status.textContent = serverDrafts.length ? "Synchronizované" : "Žiadne nové návrhy";
  };

  function articleQualityProblems() {
    const d = readForm();
    const problems = [];
    if ((d.title || "").trim().length < 25) problems.push("titulok má mať aspoň 25 znakov");
    if (!(d.category || "").trim()) problems.push("chýba rubrika");
    if ((d.intro || "").trim().length < 80) problems.push("krátky úvod má mať aspoň 80 znakov");
    if ((d.whatHappened || "").trim().length < 250) problems.push("časť „Čo sa stalo“ je príliš krátka");
    if ((d.whatItMeans || "").trim().length < 180) problems.push("časť „Čo to znamená“ je príliš krátka");
    if ((d.nextStep || "").trim().length < 100) problems.push("časť „Čo ďalej“ je príliš krátka");
    if (!/https?:\/\/\S+/i.test(d.sources || "")) problems.push("chýba priamy zdroj s URL");
    if (!(d.image || "").trim()) problems.push("chýba relevantný obrázok alebo AI ilustrácia");
    return problems;
  }

  function ensureImageChecklist() {
    const checklist = document.querySelector(".checklist");
    if (!checklist || document.querySelector("#check-image")) return;
    const li = document.createElement("li");
    li.id = "check-image";
    li.textContent = "Relevantný obrázok";
    checklist.appendChild(li);
  }

  function ensureVideoDivider() {
    const videoSection = document.querySelector('.short-video-section');
    if (!videoSection || document.querySelector('#tiktok-video-divider')) return;
    if (!document.querySelector('#tiktok-video-divider-style')) {
      const style = document.createElement('style');
      style.id = 'tiktok-video-divider-style';
      style.textContent = `
        .tiktok-video-divider{display:flex;align-items:center;gap:12px;margin:34px 0 18px;color:#626a12;font-size:.7rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase}
        .tiktok-video-divider:before,.tiktok-video-divider:after{content:'';height:2px;background:#d9ff28;flex:1;border-radius:2px}
        .tiktok-video-divider span{white-space:nowrap;background:#f5f9df;border:1px solid #dbe99a;border-radius:999px;padding:6px 10px}
      `;
      document.head.appendChild(style);
    }
    const divider = document.createElement('div');
    divider.id = 'tiktok-video-divider';
    divider.className = 'tiktok-video-divider';
    divider.innerHTML = '<span>VIDEO / TIKTOK</span>';
    videoSection.before(divider);
  }

  try {
    const originalUpdateLivePreview = updateLivePreview;
    updateLivePreview = function () {
      originalUpdateLivePreview();
      ensureImageChecklist();
      document.querySelector("#check-image")?.classList.toggle("ok", Boolean((currentImageData || "").trim()));
    };
  } catch {}

  ensureImageChecklist();
  document.querySelector("#publish-draft")?.addEventListener("click", event => {
    const problems = articleQualityProblems();
    if (!problems.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const status = document.querySelector("#draft-status");
    if (status) status.textContent = "Doplňte článok pred publikovaním";
    alert("Článok ešte nie je pripravený na publikovanie:\n\n• " + problems.join("\n• "));
  }, { capture: true });

  window.addEventListener("load", () => {
    setTimeout(async () => {
      ensureImageChecklist();
      ensureVideoDivider();
      if (typeof currentUser !== "undefined" && currentUser) {
        try { await refreshDrafts(); resetForm(); }
        catch (error) { console.error("Obnova zoznamu návrhov zlyhala:", error); }
      }
    }, 250);
  });

  function loadRenderStatusSync(){
    if(document.querySelector('script[data-redakcia-render-status]')) return;
    const s=document.createElement('script');s.src='redakcia-render-status.js?v=20260917-1';s.async=false;s.dataset.redakciaRenderStatus='1';document.head.appendChild(s);
  }
  function loadLatestRenderHelper(){
    if(document.querySelector('script[data-redakcia-render-latest]')) { loadRenderStatusSync(); return; }
    const s=document.createElement('script');s.src='redakcia-render-latest.js?v=20260917-2';s.async=false;s.dataset.redakciaRenderLatest='1';s.onload=loadRenderStatusSync;s.onerror=loadRenderStatusSync;document.head.appendChild(s);
  }
  function loadVideoRender(){
    if(document.querySelector('script[data-redakcia-video-render]')) { loadLatestRenderHelper(); return; }
    const s=document.createElement('script');s.src='redakcia-video-render-studio.js?v=20260917-motion2';s.async=false;s.dataset.redakciaVideoRender='1';s.onload=loadLatestRenderHelper;s.onerror=loadLatestRenderHelper;document.head.appendChild(s);
  }
  function loadVideoLibrary(){
    if(document.querySelector('script[data-redakcia-video-library]')) { loadVideoRender(); return; }
    const s=document.createElement('script');s.src='redakcia-video-library.js?v=20260917-1';s.async=false;s.dataset.redakciaVideoLibrary='1';s.onload=loadVideoRender;s.onerror=loadVideoRender;document.head.appendChild(s);
  }
  function loadVideoSaveQueue(){
    if(document.querySelector('script[data-redakcia-video-save-queue]')) { loadVideoLibrary(); return; }
    const s=document.createElement('script');s.src='redakcia-video-save-queue.js?v=20260917-1';s.async=false;s.dataset.redakciaVideoSaveQueue='1';s.onload=loadVideoLibrary;s.onerror=loadVideoLibrary;document.head.appendChild(s);
  }
  function loadMotionBroll(){
    if(document.querySelector('script[data-redakcia-video-motion]')) { loadVideoSaveQueue(); return; }
    const s=document.createElement('script');s.src='redakcia-video-motion.js?v=20260917-2';s.async=false;s.dataset.redakciaVideoMotion='1';s.onload=loadVideoSaveQueue;s.onerror=loadVideoSaveQueue;document.head.appendChild(s);
  }
  function loadBroll(){
    if(document.querySelector('script[data-redakcia-video-broll]')) { loadMotionBroll(); return; }
    const s=document.createElement('script');s.src='redakcia-video-broll.js?v=20260917-1';s.async=false;s.dataset.redakciaVideoBroll='1';s.onload=loadMotionBroll;s.onerror=loadMotionBroll;document.head.appendChild(s);
  }
  function loadVideoPro(){
    if(document.querySelector('script[data-redakcia-video-pro]')) { loadBroll(); return; }
    const s=document.createElement('script');s.src='redakcia-video-pro.js?v=20260917-2';s.async=false;s.dataset.redakciaVideoPro='1';s.onload=loadBroll;s.onerror=loadBroll;document.head.appendChild(s);
  }
  function loadVoiceEnhancer(){
    if(document.querySelector('script[data-redakcia-video-voice]')) { loadVideoPro(); return; }
    const s=document.createElement('script');s.src='redakcia-video-voice.js?v=20260917-2';s.async=false;s.dataset.redakciaVideoVoice='1';s.onload=loadVideoPro;s.onerror=loadVideoPro;document.head.appendChild(s);
  }
  function loadVideoPreviewModule(){
    ensureVideoDivider();
    if(document.querySelector('script[data-redakcia-video-preview]')) { loadVoiceEnhancer(); return; }
    const s=document.createElement('script');s.src='redakcia-video-preview.js?v=20260917-2';s.async=false;s.dataset.redakciaVideoPreview='1';s.onload=loadVoiceEnhancer;s.onerror=loadVoiceEnhancer;document.head.appendChild(s);
  }
  function loadVideoModule(){
    if(document.querySelector('script[data-redakcia-video]')) { ensureVideoDivider(); loadVideoPreviewModule(); return; }
    const s=document.createElement('script');s.src='redakcia-video.js?v=20260917-1';s.async=false;s.dataset.redakciaVideo='1';s.onload=()=>{ensureVideoDivider();loadVideoPreviewModule();};s.onerror=loadVideoPreviewModule;document.head.appendChild(s);
  }

  const imageModule = document.createElement("script");
  imageModule.src = "redakcia-images.js?v=20260918-photo1";
  imageModule.async = false;
  imageModule.onload = loadVideoModule;
  imageModule.onerror = loadVideoModule;
  document.head.appendChild(imageModule);

  const backToTopModule = document.createElement("script");
  backToTopModule.src = "back-to-top.js?v=2";
  backToTopModule.defer = true;
  document.head.appendChild(backToTopModule);
})();