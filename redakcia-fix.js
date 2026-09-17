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

  // Po načítaní stránky ešte raz zosúladíme zoznam, aby v ňom nezostali staré ukážkové položky.
  window.addEventListener("load", () => {
    setTimeout(async () => {
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
})();
