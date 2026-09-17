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

  // Kvalitatívna brána pred publikovaním. Návrh sa môže uložiť aj rozpracovaný,
  // ale na verejný web nepustíme prázdny, veľmi krátky alebo bez obrázka/zdroja.
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

  // Zachytíme klik ešte pred pôvodným publish handlerom.
  document.querySelector("#publish-draft")?.addEventListener("click", event => {
    const problems = articleQualityProblems();
    if (!problems.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const status = document.querySelector("#draft-status");
    if (status) status.textContent = "Doplňte článok pred publikovaním";
    alert("Článok ešte nie je pripravený na publikovanie:\n\n• " + problems.join("\n• "));
  }, { capture: true });

  // Po načítaní stránky ešte raz zosúladíme zoznam, aby v ňom nezostali staré ukážkové položky.
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

  // Rozšírený obrazový pracovný postup načítame až po základnej Redakcii,
  // aby mohol doplniť metadáta, licenčnú kontrolu a vyhľadávanie fotografií.
  const imageModule = document.createElement("script");
  imageModule.src = "redakcia-images.js?v=20260917-1";
  imageModule.async = false;
  document.head.appendChild(imageModule);
})();
