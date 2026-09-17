(() => {
  // Redakcia má zobrazovať iba skutočné návrhy uložené v Supabase.
  // Staré vstavané ukážkové návrhy a statické vydané články už nemiešame do zoznamu návrhov.
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
      list.innerHTML = `
        <div class="draft-empty-state">
          <strong>Zatiaľ žiadne nové návrhy</strong>
          <p>Automaticky pripravené články sa zobrazia tu až po uložení do Supabase.</p>
        </div>`;
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
      if (typeof currentUser !== "undefined" && currentUser) {
        try {
          await refreshDrafts();
          resetForm();
        } catch (error) {
          console.error("Obnova zoznamu návrhov zlyhala:", error);
        }
      }
    }, 250);
  });

  function loadRenderStatusSync(){
    if(document.querySelector('script[data-redakcia-render-status]')) return;
    const statusModule=document.createElement('script');
    statusModule.src='redakcia-render-status.js?v=20260917-1';
    statusModule.async=false;
    statusModule.dataset.redakciaRenderStatus='1';
    document.head.appendChild(statusModule);
  }

  function loadLatestRenderHelper(){
    if(document.querySelector('script[data-redakcia-render-latest]')) { loadRenderStatusSync(); return; }
    const latestModule=document.createElement('script');
    latestModule.src='redakcia-render-latest.js?v=20260917-1';
    latestModule.async=false;
    latestModule.dataset.redakciaRenderLatest='1';
    latestModule.onload=loadRenderStatusSync;
    latestModule.onerror=loadRenderStatusSync;
    document.head.appendChild(latestModule);
  }

  function loadVideoRender(){
    if(document.querySelector('script[data-redakcia-video-render]')) { loadLatestRenderHelper(); return; }
    const renderModule=document.createElement('script');
    renderModule.src='redakcia-video-render.js?v=20260917-1';
    renderModule.async=false;
    renderModule.dataset.redakciaVideoRender='1';
    renderModule.onload=loadLatestRenderHelper;
    renderModule.onerror=loadLatestRenderHelper;
    document.head.appendChild(renderModule);
  }

  function loadVideoPro(){
    if(document.querySelector('script[data-redakcia-video-pro]')) { loadVideoRender(); return; }
    const proModule=document.createElement('script');
    proModule.src='redakcia-video-pro.js?v=20260917-2';
    proModule.async=false;
    proModule.dataset.redakciaVideoPro='1';
    proModule.onload=loadVideoRender;
    proModule.onerror=loadVideoRender;
    document.head.appendChild(proModule);
  }

  function loadVoiceEnhancer(){
    if(document.querySelector('script[data-redakcia-video-voice]')) { loadVideoPro(); return; }
    const voiceModule=document.createElement('script');
    voiceModule.src='redakcia-video-voice.js?v=20260917-2';
    voiceModule.async=false;
    voiceModule.dataset.redakciaVideoVoice='1';
    voiceModule.onload=loadVideoPro;
    voiceModule.onerror=loadVideoPro;
    document.head.appendChild(voiceModule);
  }

  function loadVideoPreviewModule(){
    if(document.querySelector('script[data-redakcia-video-preview]')) { loadVoiceEnhancer(); return; }
    const previewModule=document.createElement('script');
    previewModule.src='redakcia-video-preview.js?v=20260917-2';
    previewModule.async=false;
    previewModule.dataset.redakciaVideoPreview='1';
    previewModule.onload=loadVoiceEnhancer;
    previewModule.onerror=loadVoiceEnhancer;
    document.head.appendChild(previewModule);
  }

  function loadVideoModule(){
    if(document.querySelector('script[data-redakcia-video]')) { loadVideoPreviewModule(); return; }
    const videoModule=document.createElement('script');
    videoModule.src='redakcia-video.js?v=20260917-1';
    videoModule.async=false;
    videoModule.dataset.redakciaVideo='1';
    videoModule.onload=loadVideoPreviewModule;
    videoModule.onerror=loadVideoPreviewModule;
    document.head.appendChild(videoModule);
  }

  const imageModule = document.createElement("script");
  imageModule.src = "redakcia-images.js?v=20260917-1";
  imageModule.async = false;
  imageModule.onload = loadVideoModule;
  imageModule.onerror = loadVideoModule;
  document.head.appendChild(imageModule);
})();