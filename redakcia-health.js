(() => {
  const GH_API = "https://api.github.com/repos/infoznetu-rgb/objektiv24/actions/workflows";
  const DEPLOY_HEALTH = "https://objektiv24.sk/deploy-health.json";

  const el = id => document.getElementById(id);

  function minutesAgo(value) {
    const t = new Date(value || 0).getTime();
    if (!Number.isFinite(t) || t <= 0) return Infinity;
    return Math.max(0, (Date.now() - t) / 60000);
  }

  function relativeAge(value) {
    const min = minutesAgo(value);
    if (!Number.isFinite(min)) return "čas nie je dostupný";
    if (min < 1) return "pred chvíľou";
    if (min < 60) return "pred " + Math.round(min) + " min";
    const h = min / 60;
    if (h < 48) return "pred " + Math.round(h * 10) / 10 + " h";
    return "pred " + Math.round(h / 24) + " d";
  }

  function setCard(key, state, title, detail) {
    const card = el("health-" + key + "-card");
    const titleEl = el("health-" + key);
    const detailEl = el("health-" + key + "-detail");
    if (card) card.dataset.state = state;
    if (titleEl) titleEl.textContent = title;
    if (detailEl) detailEl.textContent = detail;
  }

  async function getJson(url, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/vnd.github+json, application/json" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function latestWorkflow(file) {
    const data = await getJson(
      GH_API + "/" + encodeURIComponent(file) + "/runs?branch=main&per_page=1"
    );
    return Array.isArray(data?.workflow_runs) ? data.workflow_runs[0] || null : null;
  }

  function workflowHealth(run, warningAfterMinutes, errorAfterMinutes) {
    if (!run) return { state: "warning", title: "Bez údajov", detail: "Posledný beh sa nepodarilo nájsť." };
    if (run.status !== "completed") {
      return {
        state: "ok",
        title: "Kontrola práve beží",
        detail: "Workflow #" + run.run_number + " je momentálne " + run.status + "."
      };
    }
    if (run.conclusion !== "success") {
      return {
        state: "error",
        title: "Posledná kontrola zlyhala",
        detail: "Workflow #" + run.run_number + " skončil: " + (run.conclusion || "failure") + "."
      };
    }
    const age = minutesAgo(run.updated_at || run.created_at);
    const state = age > errorAfterMinutes ? "error" : age > warningAfterMinutes ? "warning" : "ok";
    return {
      state,
      title: state === "ok" ? "Funguje" : state === "warning" ? "Kontrola je staršia" : "Kontrola je príliš stará",
      detail: "Posledný úspech " + relativeAge(run.updated_at || run.created_at) + "."
    };
  }

  function maxState(states) {
    if (states.includes("error")) return "error";
    if (states.includes("warning")) return "warning";
    return "ok";
  }

  async function loadSystemHealth() {
    const panel = el("system-health");
    const button = el("system-health-refresh");
    if (!panel) return;

    button && (button.disabled = true);
    panel.dataset.state = "loading";
    el("system-health-title").textContent = "Kontrolujem systém…";
    el("system-health-summary").textContent = "Overujem web, zálohu, Edge Functions, databázu a push notifikácie.";
    ["deploy","edge","backup","push"].forEach(k => setCard(k, "loading", "Kontrolujem…", "Prebieha kontrola."));

    const states = [];

    let internal = null;
    try {
      const { data, error } = await client.rpc("get_editor_health_status");
      if (error) throw error;
      internal = data || {};
      const unresolved = Boolean(internal.push_has_unresolved_error);
      const pushState = unresolved ? "warning" : "ok";
      states.push(pushState);
      setCard(
        "push",
        pushState,
        unresolved ? "Push vyžaduje kontrolu" : "Databáza funguje",
        unresolved
          ? "Posledná push chyba je novšia než posledné úspešné odoslanie."
          : Number(internal.push_errors_24h || 0) > 0
            ? "Za 24 h boli chyby, ale novší úspešný push ich prekonal."
            : "Interný health check je dostupný; bez nevyriešenej push chyby."
      );
      if (el("health-published")) el("health-published").textContent = "Publikované články: " + Number(internal.published_count || 0);
      if (el("health-qa")) el("health-qa").textContent = "QA zachytenia za 24 h: " + Number(internal.qa_rejections_24h || 0);
    } catch (error) {
      console.error("Internal health check failed", error);
      states.push("error");
      setCard("push", "error", "Interný health check nedostupný", "Redakcia nevie načítať zabezpečený stav databázy.");
    }

    try {
      const marker = await getJson(DEPLOY_HEALTH + "?t=" + Date.now(), 10000);
      const age = minutesAgo(marker?.generated_at);
      const commit = String(marker?.commit || "").slice(0, 7);
      const deployState = !marker || marker.status !== "ok" || !marker.commit
        ? "error"
        : age > 90
          ? "error"
          : age > 45
            ? "warning"
            : "ok";
      states.push(deployState);
      setCard(
        "deploy",
        deployState,
        deployState === "ok" ? "Web je nasadený" : deployState === "warning" ? "Deploy je starší" : "Web/deploy vyžaduje kontrolu",
        marker?.generated_at
          ? "Marker " + relativeAge(marker.generated_at) + (commit ? " · commit " + commit : "")
          : "Živý deployment marker nie je platný."
      );
    } catch (error) {
      console.error("Live deploy health failed", error);
      states.push("error");
      setCard("deploy", "error", "Živý web sa nedá overiť", "Deployment marker nie je dostupný.");
    }

    try {
      const run = await latestWorkflow("edge-watch.yml");
      const s = workflowHealth(run, 150, 360);
      states.push(s.state);
      setCard("edge", s.state, s.title, s.detail);
    } catch (error) {
      console.error("Edge watchdog status failed", error);
      states.push("warning");
      setCard("edge", "warning", "GitHub stav nedostupný", "Edge Functions naďalej stráži hodinový watchdog.");
    }

    try {
      const run = await latestWorkflow("supabase-backup.yml");
      const s = workflowHealth(run, 30 * 60, 48 * 60);
      states.push(s.state);
      setCard("backup", s.state, s.title, s.detail);
    } catch (error) {
      console.error("Backup status failed", error);
      states.push("warning");
      setCard("backup", "warning", "GitHub stav nedostupný", "Denná šifrovaná záloha zostáva naplánovaná.");
    }

    const overall = maxState(states);
    panel.dataset.state = overall;
    const title = el("system-health-title");
    const summary = el("system-health-summary");
    if (overall === "ok") {
      title.textContent = "Všetko funguje";
      summary.textContent = "Publikovanie, Edge Functions, záloha aj interný backend sú v poriadku.";
    } else if (overall === "warning") {
      title.textContent = "Systém funguje s upozornením";
      summary.textContent = "Aspoň jedna kontrola potrebuje pozornosť, ale nevidím úplný výpadok.";
    } else {
      title.textContent = "Systém vyžaduje zásah";
      summary.textContent = "Aspoň jedna kritická kontrola zlyhala alebo je nedostupná.";
    }

    if (el("health-checked")) {
      el("health-checked").textContent = "Posledná kontrola: " + new Intl.DateTimeFormat("sk-SK", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(new Date());
    }
    button && (button.disabled = false);
  }

  el("system-health-refresh")?.addEventListener("click", () => {
    loadSystemHealth().catch(error => console.error("Health refresh failed", error));
  });

  client.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setTimeout(() => loadSystemHealth().catch(error => console.error("Health load failed", error)), 0);
    }
  });

  client.auth.getSession().then(({ data }) => {
    if (data?.session?.user) loadSystemHealth().catch(error => console.error("Health initial load failed", error));
  });
})();
