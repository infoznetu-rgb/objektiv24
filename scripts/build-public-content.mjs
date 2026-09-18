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
const latestTimestamp=(...values)=>{
  const valid=values.map(v=>({v,t:Date.parse(v||"")})).filter(x=>Number.isFinite(x.t));
  if(!valid.length)return"";
  valid.sort((a,b)=>b.t-a.t);
  return valid[0].v;
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
  if (a.imageType === "ai" || a.imageType === "ai_illustration" || /\/assets\/ai\//i.test(a.image || "")) return "Ilustračný obrázok · AI";
  if (/\/assets\/fallback\//i.test(a.image || "")) return "Ilustračný obrázok";
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
    modifiedAt: latestTimestamp(r.updated_at,r.verified_at,r.published_at),
    archived: false,
    legacySourceUrl: ""
  };
}
const normalizeText=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
function topicForArticle(a){
  const s=normalizeText([a?.category,a?.title,a?.summary].join(" "));
  if(/sport|basket|hokej|futbal|tenis|lyz|cyklist/.test(s))return"Šport";
  if(/doprava|tunel|dialnic|cest|uzaver|vlak|autobus|premav|region|kraj|obec|mesto|levo|liptov|zilinsk/.test(s))return"Doprava a regióny";
  if(/peniaz|praca|zamest|socialn|davk|poist|dan|eur|solidarit|dlznik|vyplat/.test(s))return"Peniaze a práca";
  if(/rodin|skol|skolk|zdrav|matersk|lekar|vakcin|besnot|diet|pacient/.test(s))return"Rodina a zdravie";
  if(/urad|posta|slovensko\.sk|sluzb|doklad|pobock|sipo/.test(s))return"Úrady a služby";
  if(/spotrebit|podvod|sms|internet|bezpec|nakup|reklamac|phishing|cestovn/.test(s))return"Spotrebiteľ a bezpečnosť";
  return"Slovensko";
}
const relatedStop=new Set(["ktory","ktora","ktore","tento","tato","dnes","zajtra","slovensko","objektiv24","uz","sa","si","na","do","od","pri","pre","a","v","vo","z","zo","je","su","o","aj","ako","co"]);
function relatedTokens(a){
  return [...new Set(normalizeText([a?.title,a?.category].join(" ")).replace(/[^a-z0-9 ]+/g," ").split(/\s+/).filter(x=>x.length>3&&!relatedStop.has(x)))];
}
function relatedFor(a,all){
  const own=new Set(relatedTokens(a)),group=topicForArticle(a);
  return all.filter(b=>b.slug!==a.slug&&!b.archived).map(b=>{
    let score=0;
    if(topicForArticle(b)===group)score+=6;
    if(normalizeText(b.category)===normalizeText(a.category))score+=5;
    for(const t of relatedTokens(b))if(own.has(t))score+=2;
    const age=Math.abs(Date.parse(a.publishedAt||0)-Date.parse(b.publishedAt||0));
    if(Number.isFinite(age)&&age<7*864e5)score+=1;
    return{b,score};
  }).sort((x,y)=>y.score-x.score||Date.parse(y.b.publishedAt||0)-Date.parse(x.b.publishedAt||0)).slice(0,3).map(x=>x.b);
}
function relatedHtml(items){
  if(!items.length)return"";
  return `<section class="article-related" aria-labelledby="related-heading"><div class="article-related-head"><span class="section-kicker">POKRAČUJTE V ČÍTANÍ</span><h2 id="related-heading">Súvisiace články</h2></div><div class="article-related-grid">${items.map(b=>`<article class="article-related-card"><a href="/clanky/${encodeURIComponent(b.slug)}/">${b.image?`<img src="${esc(b.image)}" alt="${esc(b.imageAlt||b.title)}" loading="lazy" decoding="async">`:""}<span class="eyebrow">${esc(topicForArticle(b))}</span><h3>${esc(b.title)}</h3><p>${esc(b.summary)}</p><strong>Čítať ďalej →</strong></a></article>`).join("")}</div></section>`;
}
function firstSentence(value,fallback=""){
  const text=String(value||fallback||"").replace(/\s+/g," ").trim();
  if(!text)return"";
  const match=text.match(/^(.+?[.!?])(?:\s|$)/);
  const sentence=(match?.[1]||text).trim();
  return sentence.length>185?sentence.slice(0,182).replace(/\s+\S*$/,"")+"…":sentence;
}
function briefHtml(a){
  const happened=firstSentence(a.facts,a.summary);
  const affected=firstSentence(a.meaning,a.summary);
  const action=firstSentence(a.steps?.[0]||a.contact||"",a.summary);
  if(!happened&&!affected&&!action)return"";
  return `<section class="article-brief" aria-labelledby="brief-heading"><div class="article-brief-head"><span class="section-kicker">V SKRATKE</span><h2 id="brief-heading">To najdôležitejšie za pár sekúnd</h2></div><div class="article-brief-grid"><div><strong>Čo sa stalo</strong><p>${esc(happened||a.summary)}</p></div><div><strong>Koho sa to týka</strong><p>${esc(affected||a.summary)}</p></div><div><strong>Čo urobiť</strong><p>${esc(action||"Skontrolujte aktuálne podmienky a zdroje uvedené v článku.")}</p></div></div></section>`;
}
function readingMinutes(a){
  const text=[a.summary,a.facts,a.meaning,a.watch,a.contact,...(a.steps||[])].filter(Boolean).join(" ");
  const words=(text.match(/[A-Za-zÀ-ž0-9]+/g)||[]).length;
  return Math.max(1,Math.ceil(words/220));
}
function nextFor(a,all,related=[]){
  const blocked=new Set([a.slug,...related.map(x=>x.slug)]);
  const active=all.filter(x=>!x.archived&&x.slug);
  const index=active.findIndex(x=>x.slug===a.slug);
  if(index>=0){
    for(let step=1;step<active.length;step++){
      const candidate=active[(index+step)%active.length];
      if(!blocked.has(candidate.slug))return candidate;
    }
  }
  return active.find(x=>x.slug!==a.slug)||null;
}
function nextArticleHtml(b){
  if(!b)return"";
  return `<section class="article-next" aria-label="Ďalší článok"><a href="/clanky/${encodeURIComponent(b.slug)}/">${b.image?`<img src="${esc(b.image)}" alt="${esc(b.imageAlt||b.title)}" loading="lazy" decoding="async">`:""}<div><span class="section-kicker">ĎALŠÍ ČLÁNOK</span><h2>${esc(b.title)}</h2><p>${esc(b.summary)}</p><strong>Pokračovať v čítaní →</strong></div></a></section>`;
}
function schemaFor(a){
  const canonical = canonicalFor(a.slug);
  const author = a.author && a.author !== "Objektív24"
    ? {"@type":"Person","name":a.author}
    : {"@type":"Organization","name":"Objektív24","url":SITE+"/","logo":{"@type":"ImageObject","url":SITE+"/assets/app-icon.svg"}};
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
function articleHtml(a,related=[],nextArticle=null){
  const canonical = canonicalFor(a.slug);
  const published = asDate(a.publishedAt || a.verifiedAt);
  const modified = asDate(a.modifiedAt || a.publishedAt || a.verifiedAt);
  const verified = dateOnly(a.verifiedAt || a.modifiedAt || a.publishedAt);
  const imageMeta = [imageLabel(a),a.imageCredit,a.imageLicense].filter(Boolean).join(" · ");
  const steps = a.steps.length ? `<section><p class="overline">ČO UROBIŤ AKO PRVÉ</p><ol class="article-steps">${a.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></section>` : "";
  const watch = a.watch ? `<section class="watch-section"><p class="overline">NA ČO SI DAŤ POZOR</p><p>${esc(a.watch)}</p></section>` : "";
  const contact = a.contact ? `<section><p class="overline">KAM SA OBRÁTIŤ</p><p>${esc(a.contact)}</p></section>` : "";
  const relatedBlock = relatedHtml(related);
  const briefBlock = briefHtml(a);
  const readMins = readingMinutes(a);
  const nextBlock = nextArticleHtml(nextArticle);
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
  <link rel="icon" href="/assets/app-icon.svg?v=20260918-2" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css?v=20260918-seo1">
  <style>html,body{max-width:100%;overflow-x:hidden}.article-page,.article-detail,.article-detail-header,.article-detail-grid,.article-detail-copy{min-width:0;max-width:100%}.article-detail-header h1{overflow-wrap:break-word}.article-detail-image{max-width:100%;overflow:hidden}.article-detail-image img{display:block;width:100%;height:auto;max-height:680px;aspect-ratio:16/9;object-fit:cover}@media(max-width:800px){.site-header .topbar{width:calc(100% - 32px);min-width:0;gap:12px}.site-header .help-link{display:none}.site-header .nav-wrap{display:none}.article-page{padding-top:28px}.article-detail.container{width:calc(100% - 32px);margin-inline:auto}.article-detail-header h1{font-size:clamp(2.15rem,9.5vw,3.25rem)!important;line-height:1.02!important;letter-spacing:-.045em!important;margin:18px 0 20px!important}.article-detail-grid{grid-template-columns:minmax(0,1fr)!important;gap:22px!important;margin-top:30px!important}.article-detail-image img{max-height:none;aspect-ratio:16/10}}@media(max-width:480px){.site-header .topbar,.article-detail.container{width:calc(100% - 24px)}.article-detail-header h1{font-size:clamp(2rem,10vw,2.7rem)!important;line-height:1.04!important}.article-detail-image img{aspect-ratio:4/3}}.article-related{margin:64px 0 18px;padding-top:34px;border-top:1px solid var(--line)}.article-related-head h2{font-size:clamp(2rem,4vw,3.4rem);letter-spacing:-.055em;margin:10px 0 24px}.article-related-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.article-related-card{min-width:0;border:1px solid var(--line);border-radius:20px;overflow:hidden;background:linear-gradient(160deg,rgba(13,29,39,.86),rgba(6,16,23,.86))}.article-related-card>a{display:flex;height:100%;flex-direction:column;text-decoration:none;padding-bottom:18px}.article-related-card img{width:100%;aspect-ratio:16/9;object-fit:cover}.article-related-card .eyebrow{align-self:flex-start;margin:16px 18px 0}.article-related-card h3{font-size:1.1rem;line-height:1.15;margin:13px 18px 8px}.article-related-card p{color:var(--muted);font-size:.84rem;margin:0 18px 14px}.article-related-card strong{color:var(--accent);font-size:.82rem;margin:auto 18px 0}@media(max-width:800px){.article-related-grid{grid-template-columns:1fr}.article-related-card>a{display:grid;grid-template-columns:120px 1fr;grid-template-rows:auto auto 1fr auto;padding:0}.article-related-card img{grid-row:1/5;width:120px;height:100%;aspect-ratio:auto}.article-related-card .eyebrow{margin:14px 14px 0}.article-related-card h3{margin:10px 14px 6px}.article-related-card p{margin:0 14px 8px}.article-related-card strong{margin:0 14px 14px}}.article-sharebar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:18px 0 28px}.article-sharebar button{border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.04);color:var(--text);padding:10px 14px;font:800 .82rem/1 Inter,ui-sans-serif,system-ui;cursor:pointer}.article-sharebar button:hover,.article-sharebar button:focus-visible{background:var(--accent);color:#061018;border-color:var(--accent);outline:0}.article-share-status{color:var(--muted);font-size:.78rem;min-height:1em}@media(max-width:520px){.article-sharebar button{flex:1;min-width:130px}}.article-brief{margin:8px 0 30px;padding:22px;border:1px solid rgba(217,255,40,.28);border-radius:22px;background:linear-gradient(145deg,rgba(217,255,40,.07),rgba(9,23,32,.82))}.article-brief-head{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:16px}.article-brief-head h2{font-size:clamp(1.3rem,2.5vw,2rem);letter-spacing:-.035em;margin:0;text-align:right}.article-brief-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.article-brief-grid>div{padding:16px;border:1px solid var(--line);border-radius:16px;background:rgba(3,8,13,.52)}.article-brief-grid strong{display:block;color:var(--accent);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}.article-brief-grid p{margin:0;font-size:.92rem;line-height:1.5}@media(max-width:760px){.article-brief{padding:18px}.article-brief-head{display:block}.article-brief-head h2{text-align:left;margin-top:8px}.article-brief-grid{grid-template-columns:1fr}.article-brief-grid>div{padding:14px}}.reading-progress-track{position:fixed;z-index:9999;top:0;left:0;right:0;height:3px;pointer-events:none;background:rgba(255,255,255,.04)}.reading-progress-bar{display:block;width:100%;height:100%;transform:scaleX(0);transform-origin:left center;background:var(--accent);will-change:transform}.article-next{margin:22px 0 8px}.article-next>a{display:grid;grid-template-columns:minmax(180px,31%) 1fr;gap:20px;align-items:stretch;text-decoration:none;border:1px solid var(--line);border-radius:22px;overflow:hidden;background:rgba(255,255,255,.025)}.article-next img{width:100%;height:100%;min-height:190px;object-fit:cover}.article-next div{padding:22px 22px 22px 0}.article-next h2{font-size:clamp(1.35rem,2.5vw,2.1rem);line-height:1.08;letter-spacing:-.035em;margin:9px 0}.article-next p{color:var(--muted);margin:0 0 14px}.article-next strong{color:var(--accent)}@media(max-width:680px){.article-next>a{grid-template-columns:1fr}.article-next img{max-height:220px;min-height:0}.article-next div{padding:18px}.reading-progress-track{height:2px}}</style>
  <script type="application/ld+json">${schemaFor(a)}</script>
  <script src="/analytics.js?v=4" defer></script>
  <script src="/pwa.js?v=14" defer></script>
  <script src="/back-to-top.js?v=2" defer></script>
  <script src="/article-actions.js?v=2" defer></script>
  <script src="/article-reading.js?v=2" defer></script>
</head>
<body>
  <div class="reading-progress-track" aria-hidden="true"><span class="reading-progress-bar" data-reading-progress></span></div>
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
        <div class="article-detail-meta"><span>${verified ? "Podklady overené "+esc(verified) : "Objektív24"}</span><span>${esc(a.author || "Objektív24")}</span><span>⌛ ${readMins} min čítania</span></div>
      </header>
      <div class="article-sharebar" aria-label="Zdieľanie článku">
        <button type="button" data-article-share>↗ Zdieľať</button>
        <button type="button" data-article-copy>⧉ Kopírovať odkaz</button>
        <span id="article-share-status" class="article-share-status" role="status" aria-live="polite"></span>
      </div>
      ${briefBlock}
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
      ${relatedBlock}
      ${nextBlock}
    </article>
  </main>
  <footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Čo sa deje. Čo to znamená pre vás. Čo ďalej.</p></div><div class="footer-links"><a href="/clanky/">Všetky články</a><a href="/ako-pracujeme.html">Ako pracujeme</a><a href="/kontakt.html">Kontakt</a></div><p class="copyright">© 2026 Objektív24. Nie sme štátny úrad ani jeho oficiálny partner.</p></div></footer>
</body>
</html>`;
}
function archiveHtml(articles){
  const cards=articles.filter(a=>!a.archived).map(a=>`<article class="article-card"><a class="article-image-wrap" href="/clanky/${encodeURIComponent(a.slug)}/">${a.image?`<img class="article-visual" src="${esc(a.image)}" alt="${esc(a.imageAlt||a.title)}" loading="lazy">`:'<div class="article-visual article-visual-placeholder"></div>'}</a><div class="article-body"><span class="eyebrow">${esc(a.category)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><div class="article-meta"><span>${dateOnly(a.verifiedAt||a.publishedAt) ? "Overené "+dateOnly(a.verifiedAt||a.publishedAt) : "Objektív24"}</span><a href="/clanky/${encodeURIComponent(a.slug)}/">Čítať ďalej →</a></div></div></article>`).join("");
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Všetky články a praktické správy | Objektív24</title><meta name="description" content="Prehľad všetkých vydaných článkov Objektív24: praktické správy, termíny, doprava, úrady, peniaze a ďalšie dôležité témy zo Slovenska."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${SITE}/clanky/"><link rel="icon" href="/assets/app-icon.svg?v=20260918-2" type="image/svg+xml"><script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"CollectionPage","name":"Všetky články Objektív24","url":SITE+"/clanky/","isPartOf":{"@type":"WebSite","name":"Objektív24","url":SITE+"/"}})}</script><link rel="stylesheet" href="/styles.css?v=20260918-seo1"><script src="/analytics.js?v=4" defer></script><script src="/pwa.js?v=14" defer></script><script src="/back-to-top.js?v=2" defer></script></head><body><header class="site-header"><div class="topbar container"><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span><small>FAKTY · KONTEXT · ĽUDIA</small></a></div></header><main class="discover container" style="padding-top:56px"><div class="section-row big"><div><span class="section-kicker">ARCHÍV A AKTUÁLNE ČLÁNKY</span><h1 style="font-size:clamp(2.4rem,4vw,4.35rem);letter-spacing:-.06em">Všetky články</h1></div><a href="/">← Domov</a></div><div class="articles-grid" style="margin-top:32px">${cards}</div></main><footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Fakty. Kontext. Ľudia.</p></div><div class="footer-links"><a href="/kontakt.html">Kontakt</a><a href="/ako-pracujeme.html">Ako pracujeme</a></div><p class="copyright">© 2026 Objektív24.</p></div></footer></body></html>`;
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

for(const a of articles){
  const related=relatedFor(a,articles);
  await write(path.join("clanky",a.slug,"index.html"),articleHtml(a,related,nextFor(a,articles,related)));
}
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
