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
const displayDate = v => {
  const iso=dateOnly(v);
  if(!iso)return"";
  const [y,m,d]=iso.split("-");
  return `${d}. ${m}. ${y}`;
};
const splitLines = v => String(v || "").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const splitSteps = v => String(v || "").split(/\n\s*\n|\r?\n/).map(x=>x.trim()).filter(Boolean);
const cleanSlug = v => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,110) || "clanok";
const canonicalFor = slug => `${SITE}/clanky/${encodeURIComponent(slug)}/`;
const guideCanonicalFor = slug => `${SITE}/poradna/${encodeURIComponent(slug)}/`;

const absoluteUrl = v => { const s=String(v||""); if(s.startsWith("/")) return SITE+s; if(/^https?:\/\//i.test(s)) return s; try { return new URL(s,SITE+"/").href; } catch { return s; } };
function responsiveImageAttrs(value,sizes="100vw"){
  try{
    const u=new URL(String(value||""),SITE+"/");
    if(u.hostname!=="commons.wikimedia.org"||!u.pathname.includes("/wiki/Special:Redirect/file/"))return"";
    const widths=[480,800,1200,1600];
    const srcset=widths.map(w=>{
      const copy=new URL(u.href);
      copy.searchParams.set("width",String(w));
      return copy.href+" "+w+"w";
    }).join(", ");
    return ` srcset="${esc(srcset)}" sizes="${esc(sizes)}"`;
  }catch{return""}
}
const cutAtWord=(v,limit)=>{
  const s=String(v||"").replace(/\s+/g," ").trim();
  if(s.length<=limit)return s;
  const slice=s.slice(0,limit+1);
  const i=slice.lastIndexOf(" ");
  return (i>=24?slice.slice(0,i):slice.slice(0,limit)).replace(/[\s,:;–—-]+$/,"").trim();
};
const seoTitleFallback=title=>{
  const t=String(title||"").replace(/\s+/g," ").trim().replace(/[.!?]+$/,"");
  if(t.length<=60)return t;
  const first=t.split(/(?<=[.!?])\s+/)[0];
  if(first.length>=25&&first.length<=60)return first;
  return cutAtWord(t,60);
};
const metaDescriptionFallback=summary=>{
  const t=String(summary||"").replace(/\s+/g," ").trim();
  if(t.length<=155)return t;
  const cut=cutAtWord(t,155);
  return /[.!?]$/.test(cut)?cut:cut+".";
};


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
    seoTitle: a.seoTitle || "",
    metaDescription: a.metaDescription || "",
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
  const slug=r.slug || cleanSlug(r.title);
  const rawImage=r.image_url || "";
  const image=/^data:image\/jpeg;base64,/i.test(rawImage) && slug ? `/assets/legacy/${slug}.jpg` : rawImage;
  return {
    slug,
    category: r.category || "Slovensko",
    title: r.title || "Bez názvu",
    seoTitle: r.seo_title || "",
    metaDescription: r.meta_description || "",
    summary: r.intro || "",
    facts: r.what_happened || r.intro || "",
    meaning: r.what_it_means || "",
    steps: splitSteps(r.next_step),
    contact: "",
    watch: "",
    sources: splitLines(r.sources),
    image,
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
const seoTitleFor=a=>{
  const candidate=String(a?.seoTitle||"").replace(/\s+/g," ").trim();
  return candidate.length>=25&&candidate.length<=70?candidate:seoTitleFallback(a?.title||"Objektív24");
};
const metaDescriptionFor=a=>{
  const candidate=String(a?.metaDescription||"").replace(/\s+/g," ").trim();
  return candidate.length>=80&&candidate.length<=180?candidate:metaDescriptionFallback(a?.summary||a?.title||"Objektív24");
};

function topicForArticle(a){
  const category=normalizeText(a?.category||"");
  if(/sport/.test(category))return"Šport";
  if(/doprava|region/.test(category))return"Doprava a regióny";
  if(/peniaz|praca|davk/.test(category))return"Peniaze a práca";
  if(/rodin|zdrav/.test(category))return"Rodina a zdravie";
  if(/urad|sluzb/.test(category))return"Úrady a služby";
  if(/spotrebit|bezpec|internet/.test(category))return"Spotrebiteľ a bezpečnosť";
  const s=normalizeText([a?.title,a?.summary].join(" "));
  if(/sport|basket|hokej|futbal|tenis|lyz|cyklist/.test(s))return"Šport";
  if(/urad|posta|slovensko\.sk|sluzb|doklad|pobock|sipo/.test(s))return"Úrady a služby";
  if(/peniaz|praca|zamest|socialn|davk|poist|dan|eur|solidarit|dlznik|vyplat/.test(s))return"Peniaze a práca";
  if(/rodin|skol|skolk|zdrav|matersk|lekar|vakcin|besnot|diet|pacient/.test(s))return"Rodina a zdravie";
  if(/spotrebit|podvod|sms|internet|bezpec|nakup|reklamac|phishing|cestovn/.test(s))return"Spotrebiteľ a bezpečnosť";
  if(/doprava|tunel|dialnic|cest|uzaver|vlak|autobus|premav|region|kraj|obec|levo|liptov|zilinsk/.test(s))return"Doprava a regióny";
  return"Slovensko";
}
const TOPIC_HUBS=[
  {
    slug:"peniaze-a-davky",topic:"Peniaze a práca",name:"Peniaze a dávky",
    title:"Peniaze a dávky: dôchodky, dane a termíny",
    description:"Praktické informácie o dôchodkoch, dávkach, Sociálnej poisťovni, daniach, SZČO a termínoch, ktoré môžu ovplyvniť vaše peniaze.",
    focus:["termíny Sociálnej poisťovne a Finančnej správy","zmeny dôchodkov, dávok a poistenia SZČO","čo treba podať, zaplatiť alebo si skontrolovať"]
  },
  {
    slug:"urady-a-sluzby",topic:"Úrady a služby",name:"Úrady a služby",
    title:"Úrady a služby: čo vybaviť a dokedy",
    description:"Zmeny na úradoch, poštách a vo verejných službách. Termíny, dostupnosť pobočiek a konkrétne kroky, ktoré si treba skontrolovať.",
    focus:["otváracie režimy a dostupnosť pobočiek","elektronické služby, doklady a formuláre","lehoty a praktické kroky pri vybavovaní"]
  },
  {
    slug:"doprava-a-regiony",topic:"Doprava a regióny",name:"Doprava a regióny",
    title:"Doprava a regióny: uzávery, opravy a zmeny",
    description:"Uzávery, opravy ciest, tunely, verejná doprava a regionálne zmeny s praktickým dopadom na cestovanie.",
    focus:["uzávery ciest, tunelov a diaľnic","výluky a zmeny verejnej dopravy","termíny prác, obmedzenia a možné zdržania"]
  },
  {
    slug:"rodina-a-zdravie",topic:"Rodina a zdravie",name:"Rodina a zdravie",
    title:"Rodina a zdravie: pravidlá, školy a dávky",
    description:"Praktické zmeny pre rodičov a rodiny, školské pravidlá, zdravotné upozornenia a informácie, pri ktorých záleží na termíne.",
    focus:["pravidlá škôl, škôlok a ospravedlňovania","rodinné dávky a elektronické vybavovanie","zdravotné a veterinárne upozornenia s praktickým dopadom"]
  },
  {
    slug:"spotrebitel-a-bezpecnost",topic:"Spotrebiteľ a bezpečnosť",name:"Spotrebiteľ a bezpečnosť",
    title:"Spotrebiteľ a bezpečnosť: podvody a vaše práva",
    description:"Spotrebiteľské upozornenia, podvodné správy, reklamácie, odškodnenia a bezpečnostné informácie s konkrétnym ďalším krokom.",
    focus:["podvodné správy, phishing a falošné vratky","nevyhovujúce výrobky a spotrebiteľské varovania","reklamácie, odškodnenia a bezpečné overenie nároku"]
  },
  {
    slug:"sport",topic:"Šport",name:"Šport",
    title:"Šport: overené správy a súvislosti",
    description:"Overené športové správy Objektív24 s dôrazom na zdroje, kontext a jasné oddelenie faktov od stanovísk.",
    focus:["oficiálne rozhodnutia športových organizácií","dôležitý kontext a presné znenie stanovísk","jasné oddelenie potvrdených faktov od sporných tvrdení"]
  }
];
const HUB_BY_TOPIC=new Map(TOPIC_HUBS.map(h=>[h.topic,h]));
const hubForArticle=a=>HUB_BY_TOPIC.get(topicForArticle(a))||null;
const hubUrl=h=>SITE+"/temy/"+encodeURIComponent(h.slug)+"/";
const hubItems=(h,articles)=>articles.filter(a=>!a.archived&&hubForArticle(a)?.slug===h.slug);
const hubGuides=(h,guides)=>guides.filter(g=>normalizeText(g.topic)===normalizeText(h.topic));
function evergreenTokens(x){
  const raw=[x?.title,x?.summary,x?.category,x?.topic,...(x?.keywords||[])].join(" ");
  return [...new Set(normalizeText(raw).replace(/[^a-z0-9 ]+/g," ").split(/\s+/).filter(v=>v.length>3))];
}
function evergreenForArticle(a,guides,limit=2){
  const articleText=normalizeText([a?.title,a?.summary,a?.category,topicForArticle(a)].join(" "));
  const topic=topicForArticle(a);
  return guides.map(g=>{
    let score=0;
    if(normalizeText(g.topic)===normalizeText(topic))score+=6;
    if(normalizeText(g.category)===normalizeText(a.category))score+=3;
    for(const token of evergreenTokens(g))if(articleText.includes(token))score+=1;
    return{g,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||String(a.g.title).localeCompare(String(b.g.title),"sk")).slice(0,limit).map(x=>x.g);
}
function evergreenLinksHtml(items){
  if(!items.length)return"";
  return `<section class="article-related" aria-labelledby="guide-heading"><div class="article-related-head"><span class="section-kicker">PRAKTICKÁ PORADŇA</span><h2 id="guide-heading">Ako postupovať krok za krokom</h2></div><div class="article-related-grid">${items.map(g=>`<article class="article-related-card"><a href="/poradna/${encodeURIComponent(g.slug)}/"><span class="eyebrow">${esc(g.category||g.topic||"Poradňa")}</span><h3>${esc(g.title)}</h3><p>${esc(g.summary)}</p><strong>Otvoriť poradňu →</strong></a></article>`).join("")}</div></section>`;
}
function evergreenSourcesHtml(sources){
  if(!Array.isArray(sources)||!sources.length)return"";
  return `<section><p class="overline">OFICIÁLNE ZDROJE</p><ul class="article-sources">${sources.map(s=>`<li><a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.title)} ↗</a></li>`).join("")}</ul></section>`;
}
function evergreenSchema(g){
  const canonical=guideCanonicalFor(g.slug),orgId=SITE+"/#organization";
  const article={"@type":"Article","@id":canonical+"#article",url:canonical,mainEntityOfPage:{"@type":"WebPage","@id":canonical},headline:g.title,description:g.metaDescription||g.summary,articleSection:g.category||g.topic,inLanguage:"sk-SK",isAccessibleForFree:true,datePublished:asDate(g.verified),dateModified:asDate(g.verified),author:{"@id":orgId},publisher:{"@id":orgId}};
  if(g.image) article.image=[absoluteUrl(g.image)];
  const publisher={"@type":"Organization","@id":orgId,name:"Objektív24",url:SITE+"/",logo:{"@type":"ImageObject","url":SITE+"/assets/app-icon.svg"}};
  const breadcrumb={"@type":"BreadcrumbList","@id":canonical+"#breadcrumb",itemListElement:[
    {"@type":"ListItem","position":1,"name":"Objektív24","item":SITE+"/"},
    {"@type":"ListItem","position":2,"name":"Poradňa","item":SITE+"/poradna/"},
    {"@type":"ListItem","position":3,"name":g.title,"item":canonical}
  ]};
  return JSON.stringify({"@context":"https://schema.org","@graph":[publisher,article,breadcrumb]}).replace(/</g,"\\u003c");
}
function evergreenPageHtml(g,articles){
  const canonical=guideCanonicalFor(g.slug);
  const topicHub=TOPIC_HUBS.find(h=>normalizeText(h.topic)===normalizeText(g.topic))||null;
  const related=evergreenForArticle({title:g.title,summary:g.summary,category:g.topic},[],0);
  const news=articles.map(a=>{
    const hay=normalizeText([a.title,a.summary,a.category,topicForArticle(a)].join(" "));
    let score=normalizeText(g.topic)===normalizeText(topicForArticle(a))?5:0;
    for(const k of (g.keywords||[]))if(hay.includes(normalizeText(k)))score+=2;
    return{a,score};
  }).filter(x=>x.score>0&&!x.a.archived).sort((x,y)=>y.score-x.score||Date.parse(y.a.publishedAt||0)-Date.parse(x.a.publishedAt||0)).slice(0,3).map(x=>x.a);
  const checklist=(g.checklist||[]).map(x=>`<li>${esc(x)}</li>`).join("");
  const sections=(g.sections||[]).map(s=>`<section><p class="overline">${esc(s.heading)}</p><p>${esc(s.body)}</p></section>`).join("");
  const warnings=(g.warnings||[]).length?`<section class="watch-section"><p class="overline">NA ČO SI DAŤ POZOR</p><ul class="article-steps">${g.warnings.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`:"";
  const relatedNews=news.length?`<section class="article-related" aria-labelledby="guide-news-heading"><div class="article-related-head"><span class="section-kicker">SÚVISIACE AKTUALITY</span><h2 id="guide-news-heading">Čo sa v téme zmenilo</h2></div><div class="article-related-grid">${news.map(a=>`<article class="article-related-card"><a href="/clanky/${encodeURIComponent(a.slug)}/"><span class="eyebrow">${esc(a.category)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><strong>Čítať aktualitu →</strong></a></article>`).join("")}</div></section>`:"";
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5"><title>${esc(g.seoTitle||g.title)}</title><meta name="description" content="${esc(g.metaDescription||g.summary)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${canonical}"><meta property="og:site_name" content="Objektív24"><meta property="og:type" content="article"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${esc(g.seoTitle||g.title)}"><meta property="og:description" content="${esc(g.metaDescription||g.summary)}">${g.image?`<meta property="og:image" content="${esc(absoluteUrl(g.image))}"><meta property="og:image:alt" content="${esc(g.title)}"><meta name="twitter:image" content="${esc(absoluteUrl(g.image))}"><meta name="twitter:image:alt" content="${esc(g.title)}">`:""}<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/assets/app-icon.svg?v=20260918-2" type="image/svg+xml"><script type="application/ld+json">${evergreenSchema(g)}</script><link rel="stylesheet" href="/styles.css?v=20260920-imagefit1"><script src="/analytics.js?v=7" defer></script><script src="/pwa.js?v=21" defer></script><script src="/back-to-top.js?v=2" defer></script></head><body><header class="site-header"><div class="topbar container"><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span><small>FAKTY · KONTEXT · ĽUDIA</small></a></div></header><main class="article-page"><article class="article-detail container"><header class="article-detail-header"><a class="eyebrow" href="/poradna/">PRAKTICKÁ PORADŇA · ${esc(g.category||g.topic)}</a><h1>${esc(g.title)}</h1><p class="article-lead">${esc(g.summary)}</p><div class="article-detail-meta"><span>Zverejnené ${esc(displayDate(g.verified))}</span><span>Aktualizované ${esc(displayDate(g.verified))}</span><span>Podklady overené ${esc(displayDate(g.verified))}</span><span>Zodpovedný za publikovanie: Objektív24.sk</span>${topicHub?`<a href="${hubUrl(topicHub)}">Téma: ${esc(topicHub.name)} →</a>`:""}</div></header>${g.image?`<figure class="article-detail-image" style="margin-inline:auto;max-width:1100px;overflow:hidden;border-radius:24px"><img src="${esc(g.image)}" alt="${esc(g.title)}"${responsiveImageAttrs(g.image,"(max-width:800px) 100vw, 1100px")} loading="lazy" decoding="async" style="display:block;width:100%;height:auto;max-height:none;object-fit:contain;object-position:center;background:#08131a"><figcaption>Ilustračná grafika Objektív24</figcaption></figure>`:""}<section class="article-brief"><div class="article-brief-head"><span class="section-kicker">PRE KOHO JE TENTO NÁVOD</span><h2>Keď potrebujete vedieť, čo urobiť</h2></div><div class="article-brief-grid"><div><strong>Koho sa týka</strong><p>${esc(g.audience)}</p></div><div><strong>Prečo je dôležitý</strong><p>${esc(g.why)}</p></div><div><strong>Stav informácií</strong><p>Podklady sme naposledy overili ${esc(g.verified)}. Pri časovo citlivom kroku si otvorte aj oficiálny zdroj.</p></div></div></section><div class="article-detail-grid"><div class="article-detail-copy"><section><p class="overline">KONTROLNÝ ZOZNAM</p><ol class="article-steps">${checklist}</ol></section>${sections}${warnings}${evergreenSourcesHtml(g.sources)}</div><aside class="article-detail-side"><div class="article-side-card"><span class="eyebrow">OVERENIE</span><strong>${esc(g.verified)}</strong><p>Evergreen návod aktualizujeme pri zmene oficiálnych pravidiel alebo postupu.</p></div><div class="article-side-card"><span class="eyebrow">DÔLEŽITÉ</span><p>Tento prehľad nenahrádza individuálne rozhodnutie alebo potvrdenie príslušnej inštitúcie.</p></div></aside></div>${relatedNews}</article></main><footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Fakty. Kontext. Ľudia.</p></div><div class="footer-links"><a href="/poradna/">Poradňa</a><a href="/terminy/">Termíny</a><a href="/temy/">Témy</a></div><p class="copyright">© 2026 Objektív24.</p></div></footer></body></html>`;
}
function evergreenIndexHtml(guides){
  const canonical=SITE+"/poradna/";
  const cards=guides.map(g=>`<article class="article-card"><div class="article-body"><span class="eyebrow">${esc(g.category||g.topic)}</span><h2 style="margin:10px 0 12px;font-size:1.55rem"><a href="/poradna/${encodeURIComponent(g.slug)}/" style="text-decoration:none">${esc(g.title)}</a></h2><p>${esc(g.summary)}</p><div class="article-meta"><span>Overené ${esc(g.verified)}</span><a href="/poradna/${encodeURIComponent(g.slug)}/">Otvoriť návod →</a></div></div></article>`).join("");
  const schema={"@context":"https://schema.org","@graph":[{"@type":"CollectionPage","@id":canonical+"#page","name":"Praktická poradňa | Objektív24","description":"Trvalejšie návody Objektív24 postavené na oficiálnych zdrojoch.","url":canonical,"isPartOf":{"@id":SITE+"/#website"}},{"@type":"ItemList","itemListElement":guides.map((g,i)=>({"@type":"ListItem","position":i+1,"name":g.title,"url":guideCanonicalFor(g.slug)}))}]};
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Praktická poradňa: čo vybaviť a ako postupovať</title><meta name="description" content="Praktické návody Objektív24 k peniazom, úradom, rodine, doprave a bezpečnosti. Krok za krokom, s dátumom overenia a oficiálnymi zdrojmi."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><link rel="icon" href="/assets/app-icon.svg?v=20260918-2" type="image/svg+xml"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><link rel="stylesheet" href="/styles.css?v=20260920-imagefit1"><script src="/analytics.js?v=7" defer></script><script src="/pwa.js?v=21" defer></script><script src="/back-to-top.js?v=2" defer></script></head><body><header class="site-header"><div class="topbar container"><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span><small>FAKTY · KONTEXT · ĽUDIA</small></a></div></header><main class="discover container" style="padding-top:56px"><div class="section-row big"><div><span class="section-kicker">PRAKTICKÁ PORADŇA</span><h1 style="font-size:clamp(2.5rem,4vw,4.4rem);letter-spacing:-.06em">Návody, ktoré nezostarnú za jeden deň</h1><p style="max-width:850px;color:var(--muted);font-size:1.05rem;line-height:1.7">Poradňa spája trvalejšie postupy postavené na oficiálnych zdrojoch. Každý návod má kontrolný zoznam, dátum posledného overenia a odkazy na inštitúcie, podľa ktorých sme postup overili.</p></div><a href="/terminy/">Termíny →</a></div><section style="margin:30px 0 34px;padding:24px;border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.025)"><span class="section-kicker">AKO PORADŇU POUŽÍVAŤ</span><h2 style="margin:9px 0 12px;font-size:clamp(1.35rem,2.5vw,2rem)">Návod je základ, aktuálna správa je zmena</h2><p style="max-width:900px;color:var(--muted);line-height:1.72">Evergreen návod vysvetľuje stabilný postup: čo si pripraviť, čo overiť a kam sa obrátiť. Keď sa pravidlo, termín alebo služba zmení, nová správa na Objektív24 odkazuje späť na príslušný návod a návod zobrazuje súvisiace aktuality. Vzniká tak jeden dlhodobý vstup do témy namiesto série izolovaných článkov. Pri každom návode uvádzame dátum posledného overenia; ak ide o platbu, dávku, daň alebo individuálne rozhodnutie úradu, rozhodujúci je vždy aktuálny údaj a potvrdenie príslušnej inštitúcie.</p></section><div class="articles-grid" style="margin-top:32px">${cards}</div></main><footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Fakty. Kontext. Ľudia.</p></div><div class="footer-links"><a href="/clanky/">Najnovšie</a><a href="/temy/">Témy</a><a href="/terminy/">Termíny</a></div><p class="copyright">© 2026 Objektív24.</p></div></footer></body></html>`;
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
  return `<section class="article-related" aria-labelledby="related-heading"><div class="article-related-head"><span class="section-kicker">POKRAČUJTE V ČÍTANÍ</span><h2 id="related-heading">Súvisiace články</h2></div><div class="article-related-grid">${items.map(b=>`<article class="article-related-card"><a href="/clanky/${encodeURIComponent(b.slug)}/">${b.image?`<img src="${esc(b.image)}" alt="${esc(b.imageAlt||b.title)}"${responsiveImageAttrs(b.image,"(max-width:800px) 120px, 33vw")} loading="lazy" decoding="async">`:""}<span class="eyebrow">${esc(topicForArticle(b))}</span><h3>${esc(b.title)}</h3><p>${esc(b.summary)}</p><strong>Čítať ďalej →</strong></a></article>`).join("")}</div></section>`;
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
  const canonical=canonicalFor(a.slug);
  const orgId=SITE+"/#organization";
  const publisher={
    "@type":"Organization",
    "@id":orgId,
    name:"Objektív24",
    url:SITE+"/",
    logo:{"@type":"ImageObject","url":SITE+"/assets/app-icon.svg"}
  };
  let author;
  if(a.author && a.author!=="Objektív24"){
    author={"@type":"Person","name":a.author};
    if(a.author==="Jozef Kameník") author.url=SITE+"/ako-pracujeme.html#prevadzkovatel";
  }else{
    author={"@id":orgId};
  }
  const article={
    "@type":"NewsArticle",
    "@id":canonical+"#article",
    url:canonical,
    mainEntityOfPage:{"@type":"WebPage","@id":canonical},
    headline:a.title,
    description:metaDescriptionFor(a),
    articleSection:a.category||topicForArticle(a),
    inLanguage:"sk-SK",
    isAccessibleForFree:true,
    datePublished:asDate(a.publishedAt||a.verifiedAt),
    dateModified:asDate(a.modifiedAt||a.publishedAt||a.verifiedAt),
    author,
    publisher:{"@id":orgId}
  };
  if(a.image) article.image=[absoluteUrl(a.image)];
  const hub=hubForArticle(a);
  const breadcrumb={
    "@type":"BreadcrumbList",
    "@id":canonical+"#breadcrumb",
    itemListElement:[
      {"@type":"ListItem","position":1,"name":"Objektív24","item":SITE+"/"},
      {"@type":"ListItem","position":2,"name":hub?hub.name:"Všetky články","item":hub?hubUrl(hub):SITE+"/clanky/"},
      {"@type":"ListItem","position":3,"name":a.title,"item":canonical}
    ]
  };
  return JSON.stringify({"@context":"https://schema.org","@graph":[publisher,article,breadcrumb]}).replace(/</g,"\\u003c");
}
function sourcesHtml(sources){
  if (!sources.length) return "";
  return `<section><p class="overline">ZDROJE A PODKLADY</p><ul class="article-sources">${sources.map(u=>`<li><a href="${esc(u)}" rel="noopener noreferrer">${esc(hostLabel(u))} ↗</a></li>`).join("")}</ul></section>`;
}
function articleHtml(a,related=[],nextArticle=null,guides=[]){
  const canonical = canonicalFor(a.slug);
  const seoTitle = seoTitleFor(a);
  const metaDescription = metaDescriptionFor(a);
  const published = asDate(a.publishedAt || a.verifiedAt);
  const modified = asDate(a.modifiedAt || a.publishedAt || a.verifiedAt);
  const verified = dateOnly(a.verifiedAt || a.modifiedAt || a.publishedAt);
  const publishedLabel = displayDate(a.publishedAt || a.verifiedAt);
  const modifiedLabel = displayDate(a.modifiedAt || a.publishedAt || a.verifiedAt);
  const imageMeta = [imageLabel(a),a.imageCredit,a.imageLicense].filter(Boolean).join(" · ");
  const steps = a.steps.length ? `<section><p class="overline">ČO UROBIŤ AKO PRVÉ</p><ol class="article-steps">${a.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></section>` : "";
  const watch = a.watch ? `<section class="watch-section"><p class="overline">NA ČO SI DAŤ POZOR</p><p>${esc(a.watch)}</p></section>` : "";
  const contact = a.contact ? `<section><p class="overline">KAM SA OBRÁTIŤ</p><p>${esc(a.contact)}</p></section>` : "";
  const relatedBlock = relatedHtml(related);
  const guideBlock = evergreenLinksHtml(guides);
  const briefBlock = briefHtml(a);
  const readMins = readingMinutes(a);
  const nextBlock = nextArticleHtml(nextArticle);
  const archive = a.archived ? '<div class="article-archive-banner"><strong>Archív:</strong> táto informácia bola viazaná na už uplynutý termín. Pred konaním si overte aktuálny stav.</div>' : "";
  const ogImage = a.image ? `<meta property="og:image" content="${esc(absoluteUrl(a.image))}"><meta property="og:image:alt" content="${esc(a.imageAlt||a.title)}"><meta name="twitter:image" content="${esc(absoluteUrl(a.image))}"><meta name="twitter:image:alt" content="${esc(a.imageAlt||a.title)}">` : "";
  return `<!doctype html>
<html lang="sk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,viewport-fit=cover">
  <title>${esc(seoTitle)}</title>
  <meta name="description" content="${esc(metaDescription)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="${canonical}">
  <meta name="theme-color" content="#03080d">
  <meta property="og:site_name" content="Objektív24">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="sk_SK">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${esc(seoTitle)}">
  <meta property="og:description" content="${esc(metaDescription)}">
  ${ogImage}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(seoTitle)}">
  <meta name="twitter:description" content="${esc(metaDescription)}">
  ${published ? `<meta property="article:published_time" content="${published}">` : ""}
  ${modified ? `<meta property="article:modified_time" content="${modified}">` : ""}
  <link rel="alternate" type="application/rss+xml" title="Objektív24 RSS" href="/rss.xml">
  <link rel="icon" href="/assets/app-icon.svg?v=20260918-2" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css?v=20260920-imagefit1">
  <style>html,body{max-width:100%;overflow-x:hidden}.article-page,.article-detail,.article-detail-header,.article-detail-grid,.article-detail-copy{min-width:0;max-width:100%}.article-detail-header h1{overflow-wrap:break-word}.article-detail-image{max-width:100%;overflow:hidden;background:#08131a}.article-detail-image img{display:block;width:100%;height:auto;max-height:none;aspect-ratio:auto;object-fit:contain;object-position:center;background:#08131a}@media(max-width:800px){.site-header .topbar{width:calc(100% - 32px);min-width:0;gap:12px}.site-header .help-link{display:none}.site-header .nav-wrap{display:none}.article-page{padding-top:28px}.article-detail.container{width:calc(100% - 32px);margin-inline:auto}.article-detail-header h1{font-size:clamp(2.15rem,9.5vw,3.25rem)!important;line-height:1.02!important;letter-spacing:-.045em!important;margin:18px 0 20px!important}.article-detail-grid{grid-template-columns:minmax(0,1fr)!important;gap:22px!important;margin-top:30px!important}.article-detail-image img{max-height:none;aspect-ratio:auto;object-fit:contain}}@media(max-width:480px){.site-header .topbar,.article-detail.container{width:calc(100% - 24px)}.article-detail-header h1{font-size:clamp(2rem,10vw,2.7rem)!important;line-height:1.04!important}.article-detail-image img{aspect-ratio:auto;object-fit:contain}}.article-related{margin:64px 0 18px;padding-top:34px;border-top:1px solid var(--line)}.article-related-head h2{font-size:clamp(2rem,4vw,3.4rem);letter-spacing:-.055em;margin:10px 0 24px}.article-related-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.article-related-card{min-width:0;border:1px solid var(--line);border-radius:20px;overflow:hidden;background:linear-gradient(160deg,rgba(13,29,39,.86),rgba(6,16,23,.86))}.article-related-card>a{display:flex;height:100%;flex-direction:column;text-decoration:none;padding-bottom:18px}.article-related-card img{width:100%;aspect-ratio:3/2;object-fit:contain;object-position:center;background:#08131a}.article-related-card .eyebrow{align-self:flex-start;margin:16px 18px 0}.article-related-card h3{font-size:1.1rem;line-height:1.15;margin:13px 18px 8px}.article-related-card p{color:var(--muted);font-size:.84rem;margin:0 18px 14px}.article-related-card strong{color:var(--accent);font-size:.82rem;margin:auto 18px 0}@media(max-width:800px){.article-related-grid{grid-template-columns:1fr}.article-related-card>a{display:grid;grid-template-columns:120px 1fr;grid-template-rows:auto auto 1fr auto;padding:0}.article-related-card img{grid-row:1/5;width:120px;height:100%;aspect-ratio:auto}.article-related-card .eyebrow{margin:14px 14px 0}.article-related-card h3{margin:10px 14px 6px}.article-related-card p{margin:0 14px 8px}.article-related-card strong{margin:0 14px 14px}}.article-sharebar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:18px 0 28px}.article-sharebar button{border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.04);color:var(--text);padding:10px 14px;font:800 .82rem/1 Inter,ui-sans-serif,system-ui;cursor:pointer}.article-sharebar button:hover,.article-sharebar button:focus-visible{background:var(--accent);color:#061018;border-color:var(--accent);outline:0}.article-share-status{color:var(--muted);font-size:.78rem;min-height:1em}@media(max-width:520px){.article-sharebar button{flex:1;min-width:130px}}.article-brief{margin:8px 0 30px;padding:22px;border:1px solid rgba(217,255,40,.28);border-radius:22px;background:linear-gradient(145deg,rgba(217,255,40,.07),rgba(9,23,32,.82))}.article-brief-head{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:16px}.article-brief-head h2{font-size:clamp(1.3rem,2.5vw,2rem);letter-spacing:-.035em;margin:0;text-align:right}.article-brief-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.article-brief-grid>div{padding:16px;border:1px solid var(--line);border-radius:16px;background:rgba(3,8,13,.52)}.article-brief-grid strong{display:block;color:var(--accent);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}.article-brief-grid p{margin:0;font-size:.92rem;line-height:1.5}@media(max-width:760px){.article-brief{padding:18px}.article-brief-head{display:block}.article-brief-head h2{text-align:left;margin-top:8px}.article-brief-grid{grid-template-columns:1fr}.article-brief-grid>div{padding:14px}}.reading-progress-track{position:fixed;z-index:9999;top:0;left:0;right:0;height:3px;pointer-events:none;background:rgba(255,255,255,.04)}.reading-progress-bar{display:block;width:100%;height:100%;transform:scaleX(0);transform-origin:left center;background:var(--accent);will-change:transform}.article-next{margin:22px 0 8px}.article-next>a{display:grid;grid-template-columns:minmax(180px,31%) 1fr;gap:20px;align-items:stretch;text-decoration:none;border:1px solid var(--line);border-radius:22px;overflow:hidden;background:rgba(255,255,255,.025)}.article-next img{width:100%;height:100%;min-height:190px;object-fit:contain;object-position:center;background:#08131a}.article-next div{padding:22px 22px 22px 0}.article-next h2{font-size:clamp(1.35rem,2.5vw,2.1rem);line-height:1.08;letter-spacing:-.035em;margin:9px 0}.article-next p{color:var(--muted);margin:0 0 14px}.article-next strong{color:var(--accent)}@media(max-width:680px){.article-next>a{grid-template-columns:1fr}.article-next img{max-height:220px;min-height:0}.article-next div{padding:18px}.reading-progress-track{height:2px}}</style>
  <script type="application/ld+json">${schemaFor(a)}</script>
  <script src="/analytics.js?v=7" defer></script>
  <script src="/pwa.js?v=21" defer></script>
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
        ${hubForArticle(a)?`<a class="eyebrow" href="/temy/${encodeURIComponent(hubForArticle(a).slug)}/">${esc(a.category)}</a>`:`<span class="eyebrow">${esc(a.category)}</span>`}
        <h1>${esc(a.title)}</h1>
        <p class="article-lead">${esc(a.summary)}</p>
        <div class="article-detail-meta">${publishedLabel?`<span>Publikované ${esc(publishedLabel)}</span>`:""}${modifiedLabel?`<span>Aktualizované ${esc(modifiedLabel)}</span>`:""}<span>${verified ? "Podklady overené "+esc(displayDate(verified)) : "Objektív24"}</span><span>Zodpovedný za publikovanie: Objektív24.sk</span><span>⌛ ${readMins} min čítania</span></div>
      </header>
      <div class="article-sharebar" aria-label="Zdieľanie článku">
        <button type="button" data-article-share>↗ Zdieľať</button>
        <button type="button" data-article-copy>⧉ Kopírovať odkaz</button>
        <span id="article-share-status" class="article-share-status" role="status" aria-live="polite"></span>
      </div>
      ${briefBlock}
      ${a.image ? `<figure class="article-detail-image" style="margin-inline:auto;max-width:1100px;overflow:hidden;border-radius:24px"><img src="${esc(a.image)}" alt="${esc(a.imageAlt)}"${responsiveImageAttrs(a.image,"(max-width:800px) 100vw, 1100px")} loading="lazy" decoding="async" style="display:block;width:100%;height:clamp(260px,48vw,620px);object-fit:cover;object-position:center"><figcaption>${esc(imageMeta)}${a.imageSource ? ` · <a href="${esc(a.imageSource)}" rel="noopener noreferrer">zdroj ↗</a>` : ""}</figcaption></figure>` : ""}
      <div class="article-detail-grid">
        <div class="article-detail-copy">
          <section><p class="overline">ČO VIEME ZO ZDROJOV</p><p>${esc(a.facts || a.summary)}</p></section>
          <section><p class="overline">ČO TO ZNAMENÁ PRE VÁS</p><p>${esc(a.meaning || "Pri praktických informáciách si skontrolujte dátum overenia podkladov a svoju konkrétnu situáciu.")}</p></section>
          ${watch}${steps}${contact}${sourcesHtml(a.sources)}
        </div>
        <aside class="article-detail-side">
          <div class="article-side-card"><span class="eyebrow">OVERENIE</span><strong>${esc(verified || "—")}</strong><p>Dátum poslednej evidovanej kontroly podkladov.</p></div>
          <div class="article-side-card"><span class="eyebrow">ZODPOVEDNOSŤ</span><strong>Objektív24.sk</strong><p>Redakčná zodpovednosť za zverejnenie. Opravy a podnety posielajte cez stránku <a href="/kontakt.html">Kontakt</a>.</p></div><div class="article-side-card"><span class="eyebrow">ZDROJE</span><p>Pri praktických a časovo citlivých témach uvádzame použité podklady priamo v článku.</p></div>
        </aside>
      </div>
      ${guideBlock}
      ${relatedBlock}
      ${nextBlock}
    </article>
  </main>
  <footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Čo sa deje. Čo to znamená pre vás. Čo ďalej.</p></div><div class="footer-links"><a href="/odber/" data-track-event="audience_hub_click">Odoberať</a><a href="/clanky/">Všetky články</a><a href="/ako-pracujeme.html">Ako pracujeme</a><a href="/kontakt.html">Kontakt</a></div><p class="copyright">© 2026 Objektív24. Nie sme štátny úrad ani jeho oficiálny partner.</p></div></footer>
</body>
</html>`;
}

function replaceBuildBlock(html,name,content){
  const start=`<!-- BUILD:${name}:START -->`;
  const end=`<!-- BUILD:${name}:END -->`;
  const from=html.indexOf(start),to=html.indexOf(end);
  if(from<0||to<0||to<from)throw new Error(`Chýba homepage build blok ${name}`);
  return html.slice(0,from+start.length)+content+html.slice(to);
}
function homepageArticleUrl(a){return `/clanky/${encodeURIComponent(a.slug)}/`;}
function homepageLatestItem(a){
  const image=a.image?`<img src="${esc(a.image)}" alt="${esc(a.imageAlt||a.title)}"${responsiveImageAttrs(a.image,"(max-width:980px) 50vw, 102px")} loading="lazy" decoding="async">`:"";
  const date=dateOnly(a.verifiedAt||a.publishedAt);
  return `<a class="latest-item" href="${homepageArticleUrl(a)}">${image}<span><b>${esc(a.title)}</b><small>${esc(topicForArticle(a))}${date?` · ${esc(date)}`:""}</small></span></a>`;
}
function homepageCard(a){
  const image=a.image
    ? `<img class="article-visual" src="${esc(a.image)}" alt="${esc(a.imageAlt||a.title)}"${responsiveImageAttrs(a.image,"(max-width:680px) 100vw, 33vw")} loading="lazy" decoding="async"><span class="article-photo-label">${esc(imageLabel(a))}</span>`
    : '<div class="article-visual article-visual-placeholder" aria-hidden="true"></div>';
  const date=dateOnly(a.verifiedAt||a.publishedAt);
  const url=homepageArticleUrl(a);
  return `<article class="article-card"><a class="article-image-wrap" href="${url}" aria-label="${esc(a.title)}">${image}</a><div class="article-body"><span class="eyebrow">${esc(a.category)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><div class="article-meta"><span>${date?`Overené ${esc(date)}`:"Objektív24"}</span><a href="${url}">Čítať ďalej →</a></div></div></article>`;
}
async function renderHomepage(articles,strategy){
  const active=articles.filter(a=>!a.archived&&a.slug);
  if(!active.length)return;
  const latest=active[0];
  const hero=active.find(a=>a.image)||latest;
  const side=active.filter(a=>a.slug!==hero.slug).slice(0,3);
  const cards=active.slice(0,12);
  const heroUrl=homepageArticleUrl(hero);
  const heroImage=hero.image
    ? `<figure class="hero-photo"><img src="${esc(hero.image)}" alt="${esc(hero.imageAlt||hero.title)}"${responsiveImageAttrs(hero.image,"(max-width:980px) 100vw, 72vw")} loading="eager" fetchpriority="high" decoding="async"><figcaption>${esc([imageLabel(hero),hero.imageCredit,hero.imageLicense].filter(Boolean).join(" · "))}</figcaption></figure>`
    : '<figure class="hero-photo"><div class="article-visual-placeholder" aria-hidden="true"></div><figcaption>Objektív24</figcaption></figure>';
  const breaking=`<section class="breaking container"><strong>● NAJNOVŠIE</strong><span>${esc(latest.title)}</span><a href="${homepageArticleUrl(latest)}">Čítať →</a></section>`;
  const heroBlock=`<section id="suvislosti" class="hero container"><article class="hero-main">${heroImage}<div class="hero-shade"></div><div class="hero-content"><h1>${esc(hero.title)}</h1><a class="primary-cta" href="${heroUrl}">Čítať ďalej →</a></div></article><aside class="latest"><div class="section-row"><h2>Najnovšie</h2><a href="/clanky/">Všetky →</a></div>${side.map(homepageLatestItem).join("")}<div class="latest-note"><span>Objektív24</span><strong>Správa nestačí. Dávame jej súvislosti.</strong><p>Pri časovo citlivých témach uvádzame dátum overenia a praktický ďalší krok.</p></div></aside></section>`;
  let home=await fs.readFile(path.join(ROOT,"index.html"),"utf8");
  home=replaceBuildBlock(home,"BREAKING",breaking);
  home=replaceBuildBlock(home,"HERO",heroBlock);
  home=replaceBuildBlock(home,"GRID",cards.map(homepageCard).join(""));
  home=replaceBuildBlock(home,"DEADLINES",homepageDeadlinesHtml(strategy,articles));
  home=home.replace(/<strong id="issued-count">[^<]*<\/strong>/,`<strong id="issued-count">${articles.length}</strong>`);
  home=home.replace(/<small id="active-count">[^<]*<\/small>/,`<small id="active-count">Aktuálne: ${active.length}</small>`);
  await write("index.html",home);
}


function strategyDeadlines(strategy,articles){
  const bySlug=new Map(articles.map(a=>[a.slug,a]));
  const now=new Date();
  const today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
  const max=today+120*864e5;
  return (Array.isArray(strategy?.upcoming)?strategy.upcoming:[])
    .map(x=>{
      const t=Date.parse(String(x.date||"")+"T12:00:00Z");
      return {...x,t,article:bySlug.get(x.slug)||null};
    })
    .filter(x=>Number.isFinite(x.t)&&x.t>=today&&x.t<=max)
    .sort((a,b)=>a.t-b.t||String(a.label).localeCompare(String(b.label),"sk"));
}
function skDeadlineDate(iso){
  const d=new Date(String(iso)+"T12:00:00Z");
  return Number.isNaN(d.getTime())?String(iso):new Intl.DateTimeFormat("sk-SK",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(d);
}
function daysUntil(iso){
  const d=Date.parse(String(iso)+"T00:00:00Z");
  const now=new Date(),today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
  return Number.isFinite(d)?Math.round((d-today)/864e5):null;
}
function deadlineStatus(item){
  const n=daysUntil(item.date);
  if(n===0)return"Dnes";
  if(n===1)return"Zajtra";
  if(n!=null&&n>1&&n<=7)return"O "+n+" dní";
  return skDeadlineDate(item.date);
}
function deadlineCard(item){
  const url=item.article?canonicalFor(item.article.slug):(item.slug?canonicalFor(item.slug):"/terminy/");
  return `<article class="article-card"><div class="article-body"><span class="eyebrow">${esc(deadlineStatus(item))}</span><h3>${esc(item.label||item.article?.title||"Dôležitý termín")}</h3><p>${esc(item.article?.summary||"Skontrolujte podmienky, dátum overenia a pôvodný zdroj pred tým, než budete konať.")}</p><div class="article-meta"><span>${esc(skDeadlineDate(item.date))}</span><a href="${esc(url)}">Čo treba vedieť →</a></div></div></article>`;
}
function deadlinesPageHtml(strategy,articles){
  const items=strategyDeadlines(strategy,articles);
  const canonical=SITE+"/terminy/";
  const cards=items.map(deadlineCard).join("");
  const itemList=items.map((x,i)=>({"@type":"ListItem","position":i+1,"name":x.label,"url":x.article?canonicalFor(x.article.slug):canonical}));
  const schema={"@context":"https://schema.org","@graph":[
    {"@type":"CollectionPage","@id":canonical+"#page","name":"Dôležité termíny | Objektív24","description":"Blížiace sa praktické termíny z článkov Objektív24 na jednom mieste.","url":canonical,"isPartOf":{"@id":SITE+"/#website"}},
    {"@type":"ItemList","itemListElement":itemList}
  ]};
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dôležité termíny: čo treba stihnúť a dokedy</title><meta name="description" content="Blížiace sa termíny z praktických správ Objektív24: dane, dávky, úrady, doprava a ďalšie povinnosti s odkazom na overené podrobnosti."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><link rel="icon" href="/assets/app-icon.svg?v=20260918-2" type="image/svg+xml"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><link rel="stylesheet" href="/styles.css?v=20260920-imagefit1"><script src="/analytics.js?v=7" defer></script><script src="/pwa.js?v=21" defer></script><script src="/back-to-top.js?v=2" defer></script></head><body><header class="site-header"><div class="topbar container"><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span><small>FAKTY · KONTEXT · ĽUDIA</small></a></div></header><main class="discover container" style="padding-top:56px"><div class="section-row big"><div><span class="section-kicker">PRAKTICKÝ KALENDÁR</span><h1 style="font-size:clamp(2.4rem,4vw,4.3rem);letter-spacing:-.055em">Dôležité termíny</h1><p style="max-width:820px;color:var(--muted);font-size:1.05rem;line-height:1.7">Na jednom mieste sú termíny, ktoré sa objavili v overených článkoch Objektív24. Pred podaním, platbou alebo návštevou úradu si otvorte príslušný článok a skontrolujte dátum overenia a pôvodný zdroj.</p></div><a href="/temy/">Témy →</a></div><section style="margin:28px 0 34px;padding:22px 24px;border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.025)"><strong>Čo tu patrí:</strong><p style="margin:8px 0 0;color:var(--muted);line-height:1.65">Lehoty na podanie a platbu, začiatok účinnosti praktickej zmeny, koniec časovo obmedzenej služby a ďalšie dátumy, pri ktorých môže zmeškanie ovplyvniť peniaze, vybavenie alebo cestovanie.</p></section><div class="articles-grid">${cards||'<p>Momentálne neevidujeme žiadny blížiaci sa termín.</p>'}</div></main><footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Fakty. Kontext. Ľudia.</p></div><div class="footer-links"><a href="/clanky/">Všetky články</a><a href="/temy/">Témy</a><a href="/ako-pracujeme.html">Ako pracujeme</a></div><p class="copyright">© 2026 Objektív24.</p></div></footer></body></html>`;
}
function homepageDeadlinesHtml(strategy,articles){
  const items=strategyDeadlines(strategy,articles).slice(0,4);
  if(!items.length)return"";
  return `<section class="discover container reveal" aria-labelledby="deadlines-heading" style="padding-top:34px;padding-bottom:14px"><div class="section-row big"><div><span class="section-kicker">TERMÍNY, KTORÉ SA BLÍŽIA</span><h2 id="deadlines-heading">Čo si postrážiť</h2></div><a href="/terminy/">Všetky termíny →</a></div><div class="articles-grid" style="margin-top:22px">${items.map(deadlineCard).join("")}</div></section>`;
}

function archiveHtml(articles){
  const cards=articles.filter(a=>!a.archived).map(a=>`<article class="article-card"><a class="article-image-wrap" href="/clanky/${encodeURIComponent(a.slug)}/">${a.image?`<img class="article-visual" src="${esc(a.image)}" alt="${esc(a.imageAlt||a.title)}" loading="lazy">`:'<div class="article-visual article-visual-placeholder"></div>'}</a><div class="article-body"><span class="eyebrow">${esc(a.category)}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><div class="article-meta"><span>${dateOnly(a.verifiedAt||a.publishedAt) ? "Overené "+dateOnly(a.verifiedAt||a.publishedAt) : "Objektív24"}</span><a href="/clanky/${encodeURIComponent(a.slug)}/">Čítať ďalej →</a></div></div></article>`).join("");
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Všetky články a praktické správy | Objektív24</title><meta name="description" content="Prehľad všetkých vydaných článkov Objektív24: praktické správy, termíny, doprava, úrady, peniaze a ďalšie dôležité témy zo Slovenska."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${SITE}/clanky/"><link rel="icon" href="/assets/app-icon.svg?v=20260918-2" type="image/svg+xml"><script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"CollectionPage","name":"Všetky články Objektív24","url":SITE+"/clanky/","isPartOf":{"@type":"WebSite","name":"Objektív24","url":SITE+"/"}})}</script><link rel="stylesheet" href="/styles.css?v=20260920-imagefit1"><script src="/analytics.js?v=7" defer></script><script src="/pwa.js?v=21" defer></script><script src="/back-to-top.js?v=2" defer></script></head><body><header class="site-header"><div class="topbar container"><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span><small>FAKTY · KONTEXT · ĽUDIA</small></a></div></header><main class="discover container" style="padding-top:56px"><div class="section-row big"><div><span class="section-kicker">ARCHÍV A AKTUÁLNE ČLÁNKY</span><h1 style="font-size:clamp(2.4rem,4vw,4.35rem);letter-spacing:-.06em">Všetky články</h1></div><a href="/">← Domov</a></div><div class="articles-grid" style="margin-top:32px">${cards}</div></main><footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Fakty. Kontext. Ľudia.</p></div><div class="footer-links"><a href="/odber/" data-track-event="audience_hub_click">Odoberať</a><a href="/kontakt.html">Kontakt</a><a href="/ako-pracujeme.html">Ako pracujeme</a></div><p class="copyright">© 2026 Objektív24.</p></div></footer></body></html>`;
}
function collectionCard(a){
  return `<article class="article-card"><a class="article-image-wrap" href="/clanky/${encodeURIComponent(a.slug)}/">${a.image?`<img class="article-visual" src="${esc(a.image)}" alt="${esc(a.imageAlt||a.title)}" loading="lazy" decoding="async">`:'<div class="article-visual article-visual-placeholder"></div>'}</a><div class="article-body"><span class="eyebrow">${esc(topicForArticle(a))}</span><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p><div class="article-meta"><span>${dateOnly(a.verifiedAt||a.publishedAt)?"Overené "+dateOnly(a.verifiedAt||a.publishedAt):"Objektív24"}</span><a href="/clanky/${encodeURIComponent(a.slug)}/">Čítať ďalej →</a></div></div></article>`;
}
function topicHubHtml(hub,items,guides=[]){
  const canonical=hubUrl(hub);
  const cards=items.map(collectionCard).join("");
  const guideItems=hubGuides(hub,guides);
  const guideSection=guideItems.length?`<section style="margin:34px 0 12px"><div class="section-row big"><div><span class="section-kicker">PRAKTICKÁ PORADŇA</span><h2>Návody k tejto téme</h2></div><a href="/poradna/">Celá poradňa →</a></div><div class="articles-grid" style="margin-top:22px">${guideItems.map(g=>`<article class="article-card"><div class="article-body"><span class="eyebrow">${esc(g.category||g.topic)}</span><h3>${esc(g.title)}</h3><p>${esc(g.summary)}</p><div class="article-meta"><span>Overené ${esc(g.verified)}</span><a href="/poradna/${encodeURIComponent(g.slug)}/">Otvoriť návod →</a></div></div></article>`).join("")}</div></section>`:"";
  const itemList=items.slice(0,30).map((a,i)=>({"@type":"ListItem","position":i+1,"url":canonicalFor(a.slug),"name":a.title}));
  const schema={"@context":"https://schema.org","@graph":[
    {"@type":"CollectionPage","@id":canonical+"#page","name":hub.title,"description":hub.description,"url":canonical,"isPartOf":{"@id":SITE+"/#website"}},
    {"@type":"ItemList","itemListElement":itemList}
  ]};
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(hub.title)}</title><meta name="description" content="${esc(hub.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><link rel="icon" href="/assets/app-icon.svg?v=20260918-2" type="image/svg+xml"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><link rel="stylesheet" href="/styles.css?v=20260920-imagefit1"><script src="/analytics.js?v=7" defer></script><script src="/pwa.js?v=21" defer></script><script src="/back-to-top.js?v=2" defer></script></head><body><header class="site-header"><div class="topbar container"><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span><small>FAKTY · KONTEXT · ĽUDIA</small></a></div></header><main class="discover container" style="padding-top:56px"><div class="section-row big"><div><span class="section-kicker">TÉMA</span><h1 style="font-size:clamp(2.35rem,4vw,4.2rem);letter-spacing:-.055em">${esc(hub.name)}</h1><p style="max-width:760px;color:var(--muted);font-size:1.05rem;line-height:1.65">${esc(hub.description)}</p></div><a href="/temy/">Všetky témy →</a></div><section style="margin:30px 0 34px;padding:24px;border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.025)"><span class="section-kicker">ČO TU SLEDUJEME</span><h2 style="margin:9px 0 12px;font-size:clamp(1.35rem,2.5vw,2rem)">Praktický prehľad namiesto nekonečného feedu</h2><p style="max-width:850px;color:var(--muted);line-height:1.7">Do tejto témy zaraďujeme správy, pri ktorých je dôležité vedieť nielen čo sa stalo, ale aj koho sa zmena týka, odkedy platí a aký je najbližší praktický krok. Články priebežne prepájame podľa témy a pri časovo citlivých informáciách uvádzame dátum overenia podkladov.</p><p style="max-width:850px;color:var(--muted);line-height:1.7">Tematický prehľad spája krátkodobé aktuality s trvalejšími návodmi z Poradne. Keď sa rovnaký problém opakuje alebo sa neskôr zmení termín či podmienka, nemusíte začínať od nuly: v jednom clustri nájdete najnovší stav, súvisiace vysvetlenia aj odkazy na oficiálne podklady. Pri rozhodovaní sa riaďte dátumom overenia konkrétnej stránky a pri individuálnej veci potvrdením príslušnej inštitúcie.</p><ul style="margin:16px 0 0;padding-left:22px;line-height:1.75">${(hub.focus||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>${guideSection}<section style="margin-top:36px"><div class="section-row big"><div><span class="section-kicker">AKTUÁLNE</span><h2>Najnovšie z témy</h2></div><a href="/clanky/">Všetky články →</a></div><div class="articles-grid" style="margin-top:22px">${cards}</div></section></main><footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Fakty. Kontext. Ľudia.</p></div><div class="footer-links"><a href="/odber/" data-track-event="audience_hub_click">Odoberať</a><a href="/clanky/">Všetky články</a><a href="/ako-pracujeme.html">Ako pracujeme</a><a href="/kontakt.html">Kontakt</a></div><p class="copyright">© 2026 Objektív24.</p></div></footer></body></html>`;
}
function topicsIndexHtml(articles){
  const hubs=TOPIC_HUBS.map(h=>({h,items:hubItems(h,articles)})).filter(x=>x.items.length);
  const cards=hubs.map(({h,items})=>`<article class="article-card"><div class="article-body"><span class="eyebrow">${items.length} ${items.length===1?"článok":"článkov"}</span><h2 style="margin:10px 0 12px;font-size:1.55rem"><a href="/temy/${encodeURIComponent(h.slug)}/" style="text-decoration:none">${esc(h.name)}</a></h2><p>${esc(h.description)}</p><div class="article-meta"><span>Najnovšie: ${esc(items[0]?.title||"—")}</span><a href="/temy/${encodeURIComponent(h.slug)}/">Otvoriť tému →</a></div></div></article>`).join("");
  const canonical=SITE+"/temy/";
  const schema={"@context":"https://schema.org","@type":"CollectionPage","name":"Témy Objektív24","description":"Tematické prehľady praktických správ Objektív24.","url":canonical,"isPartOf":{"@id":SITE+"/#website"}};
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Témy: praktické správy podľa oblasti</title><meta name="description" content="Prehľady praktických správ Objektív24 podľa tém: peniaze a dávky, úrady, doprava, rodina, spotrebiteľ a šport."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${canonical}"><link rel="icon" href="/assets/app-icon.svg?v=20260918-2" type="image/svg+xml"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,"\\u003c")}</script><link rel="stylesheet" href="/styles.css?v=20260920-imagefit1"><script src="/analytics.js?v=7" defer></script><script src="/pwa.js?v=21" defer></script><script src="/back-to-top.js?v=2" defer></script></head><body><header class="site-header"><div class="topbar container"><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span><small>FAKTY · KONTEXT · ĽUDIA</small></a></div></header><main class="discover container" style="padding-top:56px"><div class="section-row big"><div><span class="section-kicker">PREHĽADY</span><h1 style="font-size:clamp(2.5rem,4vw,4.4rem);letter-spacing:-.06em">Témy</h1><p style="max-width:760px;color:var(--muted);font-size:1.05rem;line-height:1.65">Namiesto nekonečného feedu si vyberte oblasť, ktorú práve potrebujete riešiť.</p></div><a href="/clanky/">Všetky články →</a></div><section style="margin:30px 0 34px;padding:24px;border:1px solid var(--line);border-radius:20px;background:rgba(255,255,255,.025)"><span class="section-kicker">AKO POUŽÍVAŤ TÉMY</span><h2 style="margin:9px 0 12px;font-size:clamp(1.35rem,2.5vw,2rem)">Jedna oblasť, súvisiace články na jednom mieste</h2><p style="max-width:900px;color:var(--muted);line-height:1.72">Tematické prehľady spájajú články, ktoré riešia podobný praktický problém. Peniaze a dávky združujú dôchodky, dane a sociálne poistenie; doprava uzávery a zmeny cestovania; úrady zmeny služieb a pobočiek. Pri každej téme sa najnovšie články zobrazujú spolu so staršími súvisiacimi informáciami, aby ste nemuseli hľadať kontext v chronologickom archíve. Ak sa informácia viaže na konkrétny termín, pred konaním si vždy skontrolujte dátum overenia a pôvodný zdroj uvedený v článku. Témy nenahrádzajú chronologický archív: ten zostáva miestom pre všetky vydané články. Tematický hub je užší vstup, ktorý spája príbuzné správy a uľahčuje návrat k staršiemu vysvetleniu, keď sa rovnaká oblasť neskôr zmení alebo pribudne nový termín.</p></section><div class="articles-grid" style="margin-top:32px">${cards}</div></main><footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Fakty. Kontext. Ľudia.</p></div><div class="footer-links"><a href="/odber/" data-track-event="audience_hub_click">Odoberať</a><a href="/clanky/">Všetky články</a><a href="/ako-pracujeme.html">Ako pracujeme</a><a href="/kontakt.html">Kontakt</a></div><p class="copyright">© 2026 Objektív24.</p></div></footer></body></html>`;
}


function audiencePageHtml(){
  const canonical=SITE+"/odber/";
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Odoberať Objektív24</title><meta name="description" content="Vyberte si, ako chcete sledovať Objektív24: push upozornenia, aplikácia na ploche alebo RSS kanál."><meta name="robots" content="noindex,follow"><link rel="canonical" href="${canonical}"><link rel="icon" href="/assets/app-icon.svg?v=20260918-2" type="image/svg+xml"><link rel="stylesheet" href="/styles.css?v=20260920-imagefit1"><script src="/analytics.js?v=7" defer></script><script src="/pwa.js?v=21" defer></script><script src="/back-to-top.js?v=2" defer></script><style>.audience-wrap{padding:64px 0 86px}.audience-lead{max-width:760px}.audience-lead h1{font-size:clamp(2.5rem,6vw,5rem);letter-spacing:-.06em;margin:.15em 0}.audience-lead p{font-size:1.08rem;line-height:1.7;color:var(--muted)}.audience-options{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:34px}.audience-card{border:1px solid var(--line);border-radius:22px;padding:24px;background:rgba(255,255,255,.025)}.audience-card span{font-size:1.5rem}.audience-card h2{margin:14px 0 8px}.audience-card p{color:var(--muted);line-height:1.6}.audience-card a,.audience-card button{display:inline-flex;margin-top:8px;border:0;border-radius:12px;background:var(--accent);color:#061018;padding:11px 14px;font-weight:850;text-decoration:none;cursor:pointer}.audience-card .secondary{background:transparent;color:inherit;border:1px solid var(--line)}.audience-note{margin-top:26px;padding:18px 20px;border:1px solid var(--line);border-radius:16px;color:var(--muted);line-height:1.6}@media(max-width:760px){.audience-options{grid-template-columns:1fr}.audience-wrap{padding-top:40px}}</style></head><body><header class="site-header"><div class="topbar container"><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span><small>FAKTY · KONTEXT · ĽUDIA</small></a></div></header><main class="container audience-wrap"><div class="audience-lead"><span class="section-kicker">ODBER OBJEKTÍV24</span><h1>Vyberte si, ako sa chcete vracať.</h1><p>Bez povinného účtu a bez plateného newslettera. Môžete si zapnúť upozornenia, pridať Objektív24 ako aplikáciu na plochu alebo použiť otvorený RSS kanál.</p></div><section class="audience-options" aria-label="Možnosti odberu"><article class="audience-card"><span>🔔</span><h2>Push upozornenia</h2><p>Upozornenie dostanete priamo do podporovaného prehliadača. Odber môžete kedykoľvek vypnúť na tom istom zariadení.</p><button type="button" data-subscription-open data-track-event="audience_push_open">Nastaviť upozornenia</button></article><article class="audience-card"><span>📱</span><h2>Aplikácia na ploche</h2><p>Objektív24 sa dá pridať na plochu mobilu alebo počítača ako webová aplikácia bez obchodu s aplikáciami.</p><button type="button" data-subscription-open data-track-event="audience_app_open">Pridať aplikáciu</button></article><article class="audience-card"><span>◉</span><h2>RSS</h2><p>Otvorený kanál pre RSS čítačky. Nevyžaduje účet ani osobné údaje a obsahuje najnovšie články.</p><a href="/rss.xml" data-track-event="rss_click">Otvoriť RSS →</a></article></section><p class="audience-note"><strong>Súkromie:</strong> analytické udalosti meriame iba po súhlase. Push odber obsahuje technické údaje potrebné na doručenie upozornenia a pri vypnutí sa príslušný záznam odstráni zo servera.</p></main><footer class="site-footer"><div class="container footer-grid"><div><a class="brand" href="/"><span class="brand-word">OBJEKTÍV</span><span class="brand-badge">24</span></a><p>Fakty. Kontext. Ľudia.</p></div><div class="footer-links"><a href="/">Domov</a><a href="/ako-pracujeme.html#sukromie">Súkromie</a></div><p class="copyright">© 2026 Objektív24.</p></div></footer><script>document.addEventListener('click',e=>{if(e.target.closest('[data-subscription-open]'))window.objektiv24OpenSubscriptionPanel?.()})</script></body></html>`;
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
  const select="id,title,seo_title,meta_description,category,intro,what_happened,what_it_means,next_step,sources,image_url,image_type,image_alt,image_source_url,image_credit,image_license,image_position,slug,published_at,verified_at,updated_at";
  const url=`${base}/rest/v1/drafts?state=eq.published&select=${encodeURIComponent(select)}&order=published_at.desc.nullslast,updated_at.desc`;
  const r=await fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
  if(!r.ok) throw new Error(`Supabase public articles: ${r.status}`);
  return (await r.json()).map(articleFromDb);
}

const staticRaw=JSON.parse(await fs.readFile(path.join(ROOT,"data/articles.json"),"utf8"));
const strategy=JSON.parse(await fs.readFile(path.join(ROOT,"data/editorial-strategy.json"),"utf8"));
const evergreen=JSON.parse(await fs.readFile(path.join(ROOT,"data/evergreen.json"),"utf8"));
const staticArticles=staticRaw.map(articleFromStatic);
const dbArticles=await fetchDbArticles();
const archivedStaticByTitle=new Map(
  staticArticles.filter(a=>a.archived).map(a=>[normalizeText(a.title),a])
);
const duplicateRedirects=[];
const bySlug=new Map();
for(const a of dbArticles){
  const archivedMatch=archivedStaticByTitle.get(normalizeText(a.title));
  if(archivedMatch){
    if(a.slug && a.slug!==archivedMatch.slug) duplicateRedirects.push({from:a.slug,to:archivedMatch.slug});
    continue;
  }
  if(a.slug&&!bySlug.has(a.slug)) bySlug.set(a.slug,a);
}
for(const a of staticArticles) if(a.slug&&!bySlug.has(a.slug)) bySlug.set(a.slug,a);
const articles=[...bySlug.values()].sort((a,b)=>Date.parse(b.publishedAt||b.verifiedAt||0)-Date.parse(a.publishedAt||a.verifiedAt||0));

await renderHomepage(articles,strategy);

for(const a of articles){
  const related=relatedFor(a,articles);
  const guides=evergreenForArticle(a,evergreen,2);
  await write(path.join("clanky",a.slug,"index.html"),articleHtml(a,related,nextFor(a,articles,related),guides));
}
await write(path.join("poradna","index.html"),evergreenIndexHtml(evergreen));
for(const g of evergreen){
  await write(path.join("poradna",g.slug,"index.html"),evergreenPageHtml(g,articles));
}
await write(path.join("clanky","index.html"),archiveHtml(articles));
await write(path.join("temy","index.html"),topicsIndexHtml(articles));
for(const hub of TOPIC_HUBS){
  const items=hubItems(hub,articles);
  if(items.length) await write(path.join("temy",hub.slug,"index.html"),topicHubHtml(hub,items,evergreen));
}
await write(path.join("terminy","index.html"),deadlinesPageHtml(strategy,articles));
await write(path.join("odber","index.html"),audiencePageHtml());

for(const r of duplicateRedirects){
  await write(path.join("clanky",r.from,"index.html"),redirectHtml(canonicalFor(r.to)));
}

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

const contentLastmod=asDate(latestTimestamp(...articles.map(a=>a.modifiedAt||a.publishedAt||a.verifiedAt)))||new Date().toISOString();
const topicSitemapUrls=TOPIC_HUBS.map(h=>({h,items:hubItems(h,articles)})).filter(x=>x.items.length).map(({h,items})=>({
  loc:hubUrl(h),
  lastmod:asDate(latestTimestamp(...items.map(a=>a.modifiedAt||a.publishedAt||a.verifiedAt)))
}));
const sitemapUrls=[
  {loc:SITE+"/",lastmod:contentLastmod},
  {loc:SITE+"/clanky/",lastmod:contentLastmod},
  {loc:SITE+"/temy/",lastmod:contentLastmod},
  {loc:SITE+"/terminy/",lastmod:strategy.updated?asDate(strategy.updated+"T00:00:00Z"):contentLastmod},
  {loc:SITE+"/poradna/",lastmod:asDate(latestTimestamp(...evergreen.map(g=>g.verified)))},
  ...evergreen.map(g=>({loc:guideCanonicalFor(g.slug),lastmod:asDate(g.verified)})),
  ...topicSitemapUrls,
  {loc:SITE+"/ako-pracujeme.html"},
  {loc:SITE+"/kontakt.html"},
  ...articles.map(a=>({loc:canonicalFor(a.slug),lastmod:asDate(a.modifiedAt||a.publishedAt||a.verifiedAt)}))
];
const pagesSitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(x=>`  <url><loc>${xml(x.loc)}</loc>${x.lastmod?`<lastmod>${xml(x.lastmod)}</lastmod>`:""}</url>`).join("\n")}\n</urlset>\n`;
await write("sitemap-pages.xml",pagesSitemap);

const newsCutoff=Date.now()-48*60*60*1000;
const newsArticles=articles
  .filter(a=>!a.archived)
  .filter(a=>{
    const t=Date.parse(a.publishedAt||a.verifiedAt||"");
    return Number.isFinite(t) && t>=newsCutoff && t<=Date.now()+60*60*1000;
  })
  .slice(0,1000);
const newsSitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${newsArticles.map(a=>`  <url>\n    <loc>${xml(canonicalFor(a.slug))}</loc>\n    <news:news>\n      <news:publication><news:name>Objektív24</news:name><news:language>sk</news:language></news:publication>\n      <news:publication_date>${xml(asDate(a.publishedAt||a.verifiedAt))}</news:publication_date>\n      <news:title>${xml(a.title)}</news:title>\n    </news:news>\n  </url>`).join("\n")}\n</urlset>\n`;
await write("news-sitemap.xml",newsSitemap);

const newsLastmod=asDate(latestTimestamp(...newsArticles.map(a=>a.modifiedAt||a.publishedAt||a.verifiedAt)))||contentLastmod;
const sitemapIndex=`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${xml(SITE+"/sitemap-pages.xml")}</loc><lastmod>${xml(contentLastmod)}</lastmod></sitemap>\n  <sitemap><loc>${xml(SITE+"/news-sitemap.xml")}</loc><lastmod>${xml(newsLastmod)}</lastmod></sitemap>\n</sitemapindex>\n`;
await write("sitemap.xml",sitemapIndex);

const rssItems=articles.filter(a=>!a.archived).slice(0,50).map(a=>{
  const link=canonicalFor(a.slug);
  const d=new Date(a.publishedAt||a.verifiedAt||Date.now());
  return `  <item>\n    <title>${xml(a.title)}</title>\n    <link>${xml(link)}</link>\n    <guid isPermaLink="true">${xml(link)}</guid>\n    <pubDate>${d.toUTCString()}</pubDate>\n    <description>${xml(a.summary)}</description>\n  </item>`;
}).join("\n");
const rss=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n  <title>Objektív24</title>\n  <link>${SITE}/</link>\n  <description>Správy v súvislostiach. Čo sa deje, čo to znamená pre vás a čo ďalej.</description>\n  <language>sk</language>\n  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n${rssItems}\n</channel></rss>\n`;
await write("rss.xml",rss);

console.log(`Objektív24 SEO build: ${articles.length} článkov, sitemap index, page sitemap, news sitemap a RSS hotové.`);
