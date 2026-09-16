const state = { articles: [], filter: "Všetky témy", query: "" };

const categoryOrder = [
  "Všetky témy",
  "Peniaze domácností",
  "Spotrebiteľ a peniaze",
  "Život v regiónoch",
  "Úrady a služby",
  "Šport",
  "Práca a peniaze",
  "Bezpečne na internete",
  "Rodina a dávky"
];

const normalize = value =>
  value.toLocaleLowerCase("sk").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function cardTemplate(article) {
  return `
    <article class="article-card">
      <div class="article-image-wrap">
        <img class="article-visual" src="${article.image}" alt="${article.imageAlt || ""}" loading="lazy">
        <span class="article-photo-label">Ilustračná fotografia</span>
      </div>
      <div class="article-body">
        <span class="eyebrow">${article.category}</span>
        <h3>${article.title}</h3>
        <p>${article.summary}</p>
        <div class="article-meta">
          <span>Overené ${article.verified}</span>
          <a href="${article.url}">Čítať ↗</a>
        </div>
      </div>
    </article>`;
}

function archiveTemplate(article) {
  return `
    <article class="archive-card">
      <span class="eyebrow">${article.category}</span>
      <h3>${article.title}</h3>
      <p>${article.archiveNote || "Časovo viazaná informácia je už po termíne a zostáva dostupná iba v archíve."}</p>
      <a class="archive-link" href="${article.url}">Otvoriť článok ↗</a>
    </article>`;
}

function renderFilters() {
  const root = document.querySelector("#filters");
  if (!root) return;
  root.innerHTML = categoryOrder.map(category =>
    `<button class="filter-button ${state.filter === category ? "is-active" : ""}" type="button" data-filter="${category}">${category}</button>`
  ).join("");

  root.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      renderFilters();
      renderArticles();
    });
  });
}

function renderArticles() {
  const grid = document.querySelector("#articles-grid");
  const archive = document.querySelector("#archive-grid");
  const empty = document.querySelector("#empty-state");
  if (!grid || !archive || !empty) return;

  const query = normalize(state.query.trim());
  const active = state.articles.filter(article => !article.archived);
  const filtered = active.filter(article => {
    const categoryMatch = state.filter === "Všetky témy" || article.category === state.filter;
    const haystack = normalize([article.title, article.summary, article.category].join(" "));
    const queryMatch = !query || haystack.includes(query);
    return categoryMatch && queryMatch;
  });

  grid.innerHTML = filtered.map(cardTemplate).join("");
  empty.hidden = filtered.length !== 0;
  archive.innerHTML = state.articles.filter(article => article.archived).map(archiveTemplate).join("");

  const issued = document.querySelector("#issued-count");
  const activeCount = document.querySelector("#active-count");
  if (issued) issued.textContent = state.articles.length;
  if (activeCount) activeCount.textContent = `Aktuálne na titulke: ${active.length}`;
}

async function loadArticles() {
  try {
    const response = await fetch("data/articles.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Nepodarilo sa načítať články.");
    state.articles = await response.json();
    renderFilters();
    renderArticles();
  } catch (error) {
    console.error(error);
    const grid = document.querySelector("#articles-grid");
    if (grid) grid.innerHTML = '<p>Články sa nepodarilo načítať. Skúste stránku obnoviť.</p>';
  }
}

document.querySelector(".menu-button")?.addEventListener("click", event => {
  const nav = document.querySelector("#site-nav");
  const open = nav.classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

document.querySelector("#search-form")?.addEventListener("submit", event => {
  event.preventDefault();
  state.query = document.querySelector("#search-input")?.value || "";
  renderArticles();
});

document.querySelector("#search-input")?.addEventListener("input", event => {
  state.query = event.currentTarget.value;
  renderArticles();
});

document.querySelector("#reset-search")?.addEventListener("click", () => {
  state.filter = "Všetky témy";
  state.query = "";
  const input = document.querySelector("#search-input");
  if (input) input.value = "";
  renderFilters();
  renderArticles();
});

loadArticles();
