const params=new URLSearchParams(location.search);
const slug=params.get("slug");
const root=document.querySelector("#article-detail");

const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]));

function renderNotFound(){
  document.title="Článok sa nenašiel | Objektív24";
  root.innerHTML=`
    <div class="article-not-found">
      <p class="overline">OBJEKTÍV24</p>
      <h1>Článok sa nenašiel.</h1>
      <p>Odkaz môže byť neaktuálny alebo článok ešte nebol prenesený.</p>
      <a class="text-link" href="index.html#clanky">Späť na vydané články ↗</a>
    </div>`;
}

function sourceLink(article){
  if(!article.sourceUrl)return "";
  return `<a class="source-button" href="${escapeHtml(article.sourceUrl)}" rel="noopener">Pôvodná verzia / zdroj ↗</a>`;
}

async function load(){
  if(!slug){renderNotFound();return}
  try{
    const response=await fetch("data/articles.json",{cache:"no-store"});
    if(!response.ok)throw new Error("load");
    const articles=await response.json();
    const article=articles.find(item=>item.slug===slug);
    if(!article){renderNotFound();return}

    document.title=article.title+" | Objektív24";
    document.querySelector("#meta-description").setAttribute("content",article.summary||"Objektív24");

    const archiveBanner=article.archived
      ? `<div class="article-archive-banner"><strong>Archív:</strong> táto informácia bola viazaná na už uplynutý termín. Overte si aktuálny stav.</div>`
      : "";

    root.innerHTML=`
      <a class="article-back" href="index.html#clanky">← Všetky články</a>
      ${archiveBanner}
      <header class="article-detail-header">
        <span class="eyebrow">${escapeHtml(article.category)}</span>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="article-lead">${escapeHtml(article.summary)}</p>
        <div class="article-detail-meta">
          <span>Podklady overené ${escapeHtml(article.verified)}</span>
          <span>Objektív24</span>
        </div>
      </header>

      <figure class="article-detail-image">
        <img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.imageAlt||"")}">
        <figcaption>Ilustračná fotografia · ${escapeHtml(article.imageLicense||"")}</figcaption>
      </figure>

      <div class="article-detail-grid">
        <div class="article-detail-copy">
          <section>
            <p class="overline">ČO SA DEJE</p>
            <p>${escapeHtml(article.summary)}</p>
          </section>
          <section>
            <p class="overline">ČO TO ZNAMENÁ PRE VÁS</p>
            <p>Pri praktických informáciách si vždy skontrolujte dátum overenia podkladov. Ak sa vaša situácia líši, použite oficiálny kontakt príslušnej inštitúcie.</p>
          </section>
          <section>
            <p class="overline">ČO ĎALEJ</p>
            <p>Tento text je zatiaľ migrovaná stručná verzia článku. Plné redakčné znenie budeme postupne prenášať zo starej verzie webu do nového systému.</p>
          </section>
        </div>

        <aside class="article-detail-side">
          <div class="article-side-card">
            <span class="eyebrow">OVERENIE</span>
            <strong>${escapeHtml(article.verified)}</strong>
            <p>Dátum poslednej kontroly podkladov evidovaný pri článku.</p>
          </div>
          <div class="article-side-card">
            <span class="eyebrow">PÔVODNÝ OBSAH</span>
            <p>Počas migrácie ponechávame odkaz na pôvodnú verziu, ak je dostupná.</p>
            ${sourceLink(article)}
          </div>
        </aside>
      </div>`;
  }catch(error){
    console.error(error);renderNotFound();
  }
}
load();