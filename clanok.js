const params = new URLSearchParams(location.search);
const slug = params.get("slug");
const root = document.querySelector("#article-detail");

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[ch]));

function renderNotFound() {
  document.title = "Článok sa nenašiel | Objektív24";
  root.innerHTML =
    '<div class="article-not-found">' +
      '<p class="overline">OBJEKTÍV24</p>' +
      '<h1>Článok sa nenašiel.</h1>' +
      '<p>Odkaz môže byť neaktuálny.</p>' +
      '<a class="text-link" href="index.html#clanky">Späť na vydané články ↗</a>' +
    '</div>';
}

function paragraph(text) {
  return text ? '<p>' + escapeHtml(text) + '</p>' : "";
}

function stepsHtml(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return '<section>' +
    '<p class="overline">ČO UROBIŤ AKO PRVÉ</p>' +
    '<ol class="article-steps">' +
      items.map(item => '<li>' + escapeHtml(item) + '</li>').join("") +
    '</ol>' +
  '</section>';
}

function sourcesHtml(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return '<section>' +
    '<p class="overline">ZDROJE A PODKLADY</p>' +
    '<ul class="article-sources">' +
      items.map(url => {
        let label = url;
        try { label = new URL(url).hostname.replace(/^www\./, ""); } catch {}
        return '<li><a href="' + escapeHtml(url) + '" rel="noopener">' + escapeHtml(label) + ' ↗</a></li>';
      }).join("") +
    '</ul>' +
  '</section>';
}

async function load() {
  if (!slug) {
    renderNotFound();
    return;
  }

  try {
    const response = await fetch("data/articles.json", { cache: "no-store" });
    if (!response.ok) throw new Error("load");
    const articles = await response.json();
    const article = articles.find(item => item.slug === slug);

    if (!article) {
      renderNotFound();
      return;
    }

    document.title = article.title + " | Objektív24";
    document.querySelector("#meta-description").setAttribute("content", article.summary || "Objektív24");

    const archiveBanner = article.archived
      ? '<div class="article-archive-banner"><strong>Archív:</strong> táto informácia bola viazaná na už uplynutý termín. Pred konaním si overte aktuálny stav.</div>'
      : "";

    const watchSection = article.watch
      ? '<section class="watch-section"><p class="overline">NA ČO SI DAŤ POZOR</p>' + paragraph(article.watch) + '</section>'
      : "";

    const contactSection = article.contact
      ? '<section><p class="overline">KAM SA OBRÁTIŤ</p>' + paragraph(article.contact) + '</section>'
      : "";

    root.innerHTML =
      '<a class="article-back" href="index.html#clanky">← Všetky články</a>' +
      archiveBanner +
      '<header class="article-detail-header">' +
        '<span class="eyebrow">' + escapeHtml(article.category) + '</span>' +
        '<h1>' + escapeHtml(article.title) + '</h1>' +
        '<p class="article-lead">' + escapeHtml(article.summary) + '</p>' +
        '<div class="article-detail-meta">' +
          '<span>Podklady overené ' + escapeHtml(article.verified) + '</span>' +
          '<span>' + escapeHtml(article.author || "Objektív24") + '</span>' +
        '</div>' +
      '</header>' +

      '<figure class="article-detail-image">' +
        '<img src="' + escapeHtml(article.image) + '" alt="' + escapeHtml(article.imageAlt || "") + '">' +
        '<figcaption>Ilustračná fotografia · ' + escapeHtml(article.imageLicense || "") + '</figcaption>' +
      '</figure>' +

      '<div class="article-detail-grid">' +
        '<div class="article-detail-copy">' +
          '<section><p class="overline">ČO VIEME ZO ZDROJOV</p>' + paragraph(article.facts || article.summary) + '</section>' +
          '<section><p class="overline">ČO TO ZNAMENÁ PRE VÁS</p>' + paragraph(article.meaning || "Pri praktických informáciách si skontrolujte dátum overenia podkladov a svoju konkrétnu situáciu.") + '</section>' +
          watchSection +
          stepsHtml(article.steps) +
          contactSection +
          sourcesHtml(article.sources) +
        '</div>' +

        '<aside class="article-detail-side">' +
          '<div class="article-side-card">' +
            '<span class="eyebrow">OVERENIE</span>' +
            '<strong>' + escapeHtml(article.verified) + '</strong>' +
            '<p>Dátum poslednej kontroly podkladov evidovaný pri článku.</p>' +
          '</div>' +
          '<div class="article-side-card">' +
            '<span class="eyebrow">REDAKČNÝ REŽIM</span>' +
            '<p>' + (article.migrationStatus === "full"
              ? "Text je prenesený do novej štruktúry Objektív24 a zdroje sú uvedené priamo nižšie."
              : "Text je zatiaľ v skrátenej migrovanej verzii.") + '</p>' +
          '</div>' +
        '</aside>' +
      '</div>';

  } catch (error) {
    console.error(error);
    renderNotFound();
  }
}

load();
