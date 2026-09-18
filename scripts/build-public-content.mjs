import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SITE = "https://objektiv24.sk";

const esc = (v="") => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const xml = (v="") => String(v ?? "").replace(/[<>&'"]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]));
const asDate = v => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};
const dateOnly = v => asDate(v).slice(0,10);
const splitLines = v => String(v || "").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const splitSteps = v => String(v || "").split(/\n\s*\n|\r?\n/).map(x=>x.trim()).filter(Boolean);
const cleanSlug = v => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,110) || "clanok";
const canonicalFor = slug => `${SITE}/clanky/${encodeURIComponent(slug)}/`;

async function publicSupabaseConfig(){
  const app=await fs.readFile(path.join(ROOT,"app.js"),"utf8");
  const url=app.match(/const SUPABASE_PUBLIC_URL="([^"]+)"/)?.[1];
  const key=app.match(/const SUPABASE_PUBLIC_KEY="([^"]+)"/)?.[1];
  if(!url||!key)throw new Error("Chýba verejná Supabase konfigurácia v app.js");
  return {url,key};
}
function imageLabel(a){
  if (a.imageType === "ai" || /\/assets\/ai\//i.test(a.image || "")) return "Ilustračný obrázok · AI";
  if (a.imageType === "own") return "Vlastná fotografia";
  if (a.imageType === "official") return "Oficiálny obrázok";
  return "Ilustračná fotografia";
}
function hostLabel(url){
  try { return new URL(url).hostname.replace(/^www\./,""); } catch { return url; }
}
function articleFromStatic(a){
  return {
    slug: a.slug,
    category: a.category || "Slovensko",
    title: a.title || "Bez názvu",
    summary: a.summary || "",
    facts: a.facts || a.summary || "",
    meaning: a.meaning || "",
    steps: Array.isArray(a.steps) ? a.steps : [],
    contact: a.contact || "",
    watch: a.watch || "",
    sources: Array.isArray(a.sources) ? a.sources : [],
    image: a.image || "",
    imageAlt: a.imageAlt || a.title || "",
    imageType: /\/assets\/ai\//i.test(a.image || "") ? "ai" : "",
    imageCredit: "",
    imageLicense: a.imageLicense || "",
    imageSource: a.imageSourceUrl || "",
    author: a.author || "Objektív24",
    publishedAt: a.publishedAt || a.verified || "",
    verifiedAt: a.verified || "",
    modifiedAt: a.verified || "",
    archived: !!a.archived,
    legacySourceUrl: a.sourceUrl || ""
  };
}
function articleFromDb(r){
  return {
    slug: r.slug || cleanSlug(r.title),
    category: r.category || "Slovensko",
    title: r.title || "Bez názvu",
    summary: r.intro || "",
    facts: r.what_happened || r.intro || "",
    meaning: r.what_it_means || "",
    steps: splitSteps(r.next_step),
    contact: "",
    watch: "",
    sources: splitLines(r.sources),
    image: r.image_url || "",
    imageAlt: r.image_alt || r.title || "",
    imageType: r.image_type || "",
    imageCredit: r.image_credit || "",
    imageLicense: r.image_license || "",
    imageSource: r.image_source_url || "",
    author: "Objektív24",
    publishedAt: r.published_at || r.updated_at || "",
    verifiedAt: r.verified_at || r.updated_at || "",
    modifiedAt: r.updated_at || r.published_at || "",
    archived: false,
    legacySourceUrl: ""
  };
}
function schemaFor(a){
  const canonical = canonicalFor(a.slug);
  const author = a.author && a.author !== "Objektív24"
    ? {"@type":"Person","name":a.author}
    : {"@type":"Organization","name":"Objektív24","url":SITE+"/"};
  const data = {
    "@context":"https://schema.org",
    "@type":"NewsArticle",
    mainEntityOfPage: {"@type":"WebPage","@id":canonical},
    headline:a.title,
    description:a.summary,
    datePublished:asDate(a.publishedAt || a.verifiedAt),
    dateModified:asDate(a.modifiedAt || a.publishedAt || a.verifiedAt),
    author,
    publisher:{
      "@type":"Organization",
      name:"Objektív24",
      url:SITE+"/",
      logo:{"@type":"ImageObject","url":SITE+"/assets/app-icon.svg"}
    }
  };
  if (a.image) data.image=[a.image];
  return JSON.stringify(data).replace(/</g,"\\u003c");
}
function sourcesHtml(sources){
  if (!sources.length) return "";
  return `<section><p class="overline">ZDROJE A PODKLADY</p><ul class="article-sources">${sources.map(u=>`<li><a href="${esc(u)}" rel="noopener noreferrer">${esc(hostLabel(u))} ↗</a></li>`).join("")}</ul></section>`;
}
function articleHtml(a){
  const canonical = canonicalFor(a.slug);
  const published = asDate(a.publishedAt || a.verifiedAt);
  const modified = asDate(a.modifiedAt || a.publishedAt || a.verifiedAt);
  const verified = dateOnly(a.verifiedAt || a.modifiedAt || a.publishedAt);
  const imageMeta = [imageLabel(a),a.imageCredit,a.imageLicense].filter(Boolean).join(" · ");
  const steps = a.steps.length ? `<section><p class="overline">ČO UROBIŤ AKO PRVÉ</p><ol class="article-steps">${a.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></section>` : "";
  const watch = a.watch ? `<section class="watch-section"><p class="overline">NA ČO SI DAŤ POZOR</p><p>${esc(a.watch)}</p></section>` : "";
  const contact = a.contact ? `<section><p class="overline">KAM SA OBRÁTIŤ</p><p>${esc(a.contact)}</p></section>` : "";
  const archive = a.archived ? '<div class="article-archive-banner"><strong>Archív:</strong> táto informácia bola viazaná na už uplynutý termín. Pred konaním si overte aktuálny stav.</div>' : "";
  const ogImage = a.image ? `<meta property="og:image" content="${esc(a.image)}"><meta name="twitter:image" content="${esc(a.image)}">` : "";
  return `<!doctype html>
<html lang="sk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,viewport-fit=cover">
  <title>${esc(a.title)} | Objektív24</title>
  <meta name="description" content="${esc(a.summary)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="${canonical}">
  <meta name="theme-color" content="#03080d">
  <meta property="og:site_name" content="Objektív24">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="sk_SK">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${esc(a.title)}">
  <meta property="og:description" content="${esc(a.summary)}">
  ${ogImage}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(a.title)}">
  <meta name="twitter:description" content="${esc(a.summary)}">
  ${published ? `<meta property="article:published_time" content="${published}">` : ""}
  ${modified ? `<meta property="article:modified_time" content="${modified}">` : ""}
  <link rel="alternate" type="application/rss+xml" title="Objektív24 RSS" href="/rss.xml">
  <link rel="icon" href="/assets/app-icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css?v=20260918-seo1">
  <style>html,body{max-width:100%;overflow-x:hidden}.article-page,.article-detail,.article-detail-header,.article-detail-grid,.article-detail-copy{min-width:0;max-width:100%}.article-detail-header h1{overflow-wrap:break-word}.article-detail-image{max-width:100%;overflow:hidden}.article-detail-image img{display:block;width:100%;height:auto;max-height:680px;aspect-ratio:16/9;object-fit:cover}@media(max-width:800px){.site-header .topbar{width:calc(100% - 32px);min-width:0;gap:12px}.site-header .help-link{display:none}.site-header .nav-wrap{display:none}.article-page{padding-top:28px}.article-detail.container{width:calc(100% - 32px);margin-inline:auto}.article-detail-header h1{font-size:clamp(2.15rem,9.5vw,3.25rem)!important;line-height:1.02!important;letter-spacing:-.045em!important;margin:18px 0 20px!important}.article-detail-grid{grid-template-columns:minmax(0,1fr)!important;gap:22px!important;margin-top:30px!important}.article-detail-image img{max-height:none;aspect-ratio:16/10}}@media(max-width:480px){.site-header .topbar,.article-detail.container{width:calc(100% - 24px)}.article-detail-header h1{font-size:clamp(2rem,10vw,2.7rem)!important;line-height:1.04!important}.article-detail-image img{aspect-ratio:4/3}}</style>
  <script type="application/ld+json">${schemaFor(a)}</script>
  <script src="/analytics.js?v=3" defer></script>
  <script src="/pwa.js?v=4" defer></script>
  <script src="/back-to-top.js?v=1" defer></script>
</head>
<body>
  <a class="skip-link" href="#obsah">Preskočiť na obsah</a>
  <header class="site-header">
    <div class="topbar container">
      <a class="brand" href="/" aria-label="Objektív24 domov"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span><small>FAKTY · KONTEXT · ĽUDIA</small></a>
      <a class="help-link" href="/#clanky">Články</a>
      <a class="help-link" href="/ako-pracujeme.html">Ako pracujeme</a>
    </div>
    <nav class="nav-wrap" aria-label="Hlavná navigácia"><div class="container nav-inner">
      <a href="/">Domov</a><a href="/clanky/">Všetky články</a><a href="/ako-pracujeme.html">Ako pracujeme</a><a href="/kontakt.html">Kontakt</a><span class="nav-motto">Slovensko. Zrozumiteľne.</span>
    </div></nav>
  </header>
  <main id="obsah" class="article-page">
    <article class="article-detail container">
      <a class="article-back" href="/clanky/">← Všetky články</a>
      ${archive}
      <header class="article-detail-header">
        <span class="eyebrow">${esc(a.category)}</span>
        <h1>${esc(a.title)}</h1>
        <p class="article-lead">${esc(a.summary)}</p>
        <div class="article-detail-meta"><span>${verified ? "Podklady overené "+esc(verified) : "Objektív24"}</span><span>${esc(a.author || "Objektív24")}</span></div>
      </header>
      ${a.image ? `<figure class="article-detail-image" style="margin-inline:auto;max-width:1100px;overflow:hidden;border-radius:24px"><img src="${esc(a.image)}" alt="${esc(a.imageAlt)}" style="display:block;width:100%;height:clamp(260px,48vw,620px);object-fit:cover;object-position:center"><figcaption>${esc(imageMeta)}${a.imageSource ? ` · <a href="${esc(a.imageSource)}" rel="noopener noreferrer">zdroj ↗</a>` : ""}</figcaption></figure>` : ""}
      <div class="article-detail-grid">
        <div class="article-detail-copy">
          <section><p class="overline">ČO VIEME ZO ZDROJOV</p><p>${esc(a.facts || a.summary)}</p></section>
          <section><p class="overline">ČO TO ZNAMENÁ PRE VÁS</p><p>${esc(a.meaning || "Pri praktických informáciách si skontrolujte dátum overenia podkladov a svoju konkrétnu situáciu.")}</p></section>
          ${watch}${steps}${contact}${sourcesHtml(a.sources)}
        </div>
        <aside class="article-detail-side">
          <div class="article-side-card"><span class="eyebrow">OVERENIE</span><strong>${esc(verified || "—")}</strong><p>Dátum poslednej evidovanej kontroly podkladov.</p></div>
          <div class="article-side-card"><span class="eyebrow">ZDROJE</span><p>Pri praktických a časovo citlivých témach uvádzame použité podklady priamo v článku.</p></div>
        </aside>
      </div>
    </article>
  </main>
  <footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Čo sa deje. Čo to znamená pre vás. Čo ďalej.</p></div><div class="footer-links"><a href="/clanky/">Všetky články</a><a href="/ako-pracujeme.html">Ako pracujeme</a><a href="/kontakt.html">Kontakt</a></div><p class="copyright">© 2026 Objektív24. Nie sme štátny úrad ani jeho oficiálny partner.</p></div></footer>
</body>
</html>`;
}
function archiveHtml(articles){
  const cards=articles.filter(a=>!a.archived).map(a=>`<article class="article-card"><a class="article-image-wrap" href="/clanky/${encodeURIComponent(a.slug)}/">${a.image?`<img class="article-visual" src="${esc(a.image)}" alt="${esc(a.imageAlt||a.title)}" loading="lazy">`:'<div class="article-visual article-visual-placeholder"></div>'}</a><div class="article-body"><span class="eyebrow">${esc(a.category)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><div class="article-meta"><span>${dateOnly(a.verifiedAt||a.publishedAt) ? "Overené "+dateOnly(a.verifiedAt||a.publishedAt) : "Objektív24"}</span><a href="/clanky/${encodeURIComponent(a.slug)}/">Čítať ďalej →</a></div></div></article>`).join("");
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Všetky články | Objektív24</title><meta name="description" content="Všetky vydané články Objektív24 na jednom mieste."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${SITE}/clanky/"><link rel="icon" href="/assets/app-icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css?v=20260918-seo1"><script src="/analytics.js?v=3" defer></script><script src="/pwa.js?v=4" defer></script><script src="/back-to-top.js?v=1" defer></script></head><body><header class="site-header"><div class="topbar container"><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span><small>FAKTY · KONTEXT · ĽUDIA</small></a></div></header><main class="discover container" style="padding-top:56px"><div class="section-row big"><div><span class="section-kicker">ARCHÍV A AKTUÁLNE ČLÁNKY</span><h1 style="font-size:clamp(2.4rem,4vw,4.35rem);letter-spacing:-.06em">Všetky články</h1></div><a href="/">← Domov</a></div><div class="articles-grid" style="margin-top:32px">${cards}</div></main><footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Fakty. Kontext. Ľudia.</p></div><div class="footer-links"><a href="/kontakt.html">Kontakt</a><a href="/ako-pracujeme.html">Ako pracujeme</a></div><p class="copyright">© 2026 Objektív24.</p></div></footer></body></html>`;
}
function redirectHtml(target){
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${esc(target)}"><meta http-equiv="refresh" content="0;url=${esc(target)}"><title>Presmerovanie | Objektív24</title><script>location.replace(${JSON.stringify(target)})</script></head><body><p>Článok má novú adresu. <a href="${esc(target)}">Pokračovať →</a></p></body></html>`;
}
async function write(rel,content){
  const file=path.join(ROOT,rel);
  await fs.mkdir(path.dirname(file),{recursive:true});
  await fs.writeFile(file,content,"utf8");
}
async function fetchDbArticles(){
  const {url:base,key}=await publicSupabaseConfig();
  const select="id,title,category,intro,what_happened,what_it_means,next_step,sources,image_url,image_type,image_alt,image_source_url,image_credit,image_license,image_position,slug,published_at,verified_at,updated_at";
  const url=`${base}/rest/v1/drafts?state=eq.published&select=${encodeURIComponent(select)}&order=published_at.desc.nullslast,updated_at.desc`;
  const r=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
  if(!r.ok) throw new Error(`Supabase public articles: ${r.status}`);
  return (await r.json()).map(articleFromDb);
}

const staticRaw=JSON.parse(await fs.readFile(path.join(ROOT,"data/articles.json"),"utf8"));
const staticArticles=staticRaw.map(articleFromStatic);
const dbArticles=await fetchDbArticles();
const bySlug=new Map();
for(const a of [...dbArticles,...staticArticles]) if(a.slug&&!bySlug.has(a.slug)) bySlug.set(a.slug,a);
const articles=[...bySlug.values()].sort((a,b)=>Date.parse(b.publishedAt||b.verifiedAt||0)-Date.parse(a.publishedAt||a.verifiedAt||0));

for(const a of articles) await write(path.join("clanky",a.slug,"index.html"),articleHtml(a));
await write(path.join("clanky","index.html"),archiveHtml(articles));

for(const a of staticArticles){
  if(!a.legacySourceUrl) continue;
  try{
    const u=new URL(a.legacySourceUrl,SITE);
    if(u.hostname!=="objektiv24.sk" || !u.pathname.startsWith("/clanky/")) continue;
    const legacy=u.pathname.replace(/^\/+|\/+$/g,"");
    const canonicalPath=`clanky/${a.slug}`;
    if(legacy===canonicalPath) continue;
    await write(path.join(legacy,"index.html"),redirectHtml(canonicalFor(a.slug)));
  }catch{}
}

const sitemapUrls=[
  {loc:SITE+"/",lastmod:new Date().toISOString()},
  {loc:SITE+"/clanky/",lastmod:new Date().toISOString()},
  {loc:SITE+"/ako-pracujeme.html"},
  {loc:SITE+"/kontakt.html"},
  ...articles.map(a=>({loc:canonicalFor(a.slug),lastmod:asDate(a.modifiedAt||a.publishedAt||a.verifiedAt)}))
];
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(x=>`  <url><loc>${xml(x.loc)}</loc>${x.lastmod?`<lastmod>${xml(x.lastmod)}</lastmod>`:""}</url>`).join("\n")}\n</urlset>\n`;
await write("sitemap.xml",sitemap);

const rssItems=articles.filter(a=>!a.archived).slice(0,50).map(a=>{
  const link=canonicalFor(a.slug);
  const d=new Date(a.publishedAt||a.verifiedAt||Date.now());
  return `  <item>\n    <title>${xml(a.title)}</title>\n    <link>${xml(link)}</link>\n    <guid isPermaLink="true">${xml(link)}</guid>\n    <pubDate>${d.toUTCString()}</pubDate>\n    <description>${xml(a.summary)}</description>\n  </item>`;
}).join("\n");
const rss=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n  <title>Objektív24</title>\n  <link>${SITE}/</link>\n  <description>Správy v súvislostiach. Čo sa deje, čo to znamená pre vás a čo ďalej.</description>\n  <language>sk</language>\n  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n${rssItems}\n</channel></rss>\n`;
await write("rss.xml",rss);

console.log(`Objektív24 SEO build: ${articles.length} článkov, sitemap a RSS hotové.`);
