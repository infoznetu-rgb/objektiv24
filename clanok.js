const SUPABASE_PUBLIC_URL="https://bkyappgttwjxakkwycub.supabase.co";
const SUPABASE_PUBLIC_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const FOX_IMAGE="https://commons.wikimedia.org/wiki/Special:Redirect/file/Vulpes%20vulpes%20standing.jpg?width=1600";

const params=new URLSearchParams(location.search);
const pathMatch=location.pathname.match(/^\/clanky\/([^/]+)\/?$/i);
const pathSlug=pathMatch?decodeURIComponent(pathMatch[1]):"";
const slug=params.get("slug")||pathSlug;
const draftId=params.get("id");
const root=document.querySelector("#article-detail");
const isLegacyPage=/\/clanok\.html$/i.test(location.pathname);

const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
const imageLabel=url=>/\/assets\/ai\//i.test(String(url||""))?"Ilustračný obrázok · AI":/\/assets\/fallback\//i.test(String(url||""))?"Ilustračný obrázok":"Ilustračná fotografia";
const canonicalFor=value=>"/clanky/"+encodeURIComponent(String(value||""))+"/";

function renderNotFound(){
  document.title="Článok sa nenašiel | Objektív24";
  if(root)root.innerHTML='<div class="article-not-found"><p class="overline">OBJEKTÍV24</p><h1>Článok sa nenašiel.</h1><p>Odkaz môže byť neaktuálny.</p><a class="text-link" href="/clanky/">Späť na vydané články ↗</a></div>';
}
function paragraph(text){return text?'<p>'+escapeHtml(text)+'</p>':""}
function stepsHtml(items){
  if(!Array.isArray(items)||!items.length)return"";
  return'<section><p class="overline">ČO UROBIŤ AKO PRVÉ</p><ol class="article-steps">'+items.map(item=>'<li>'+escapeHtml(item)+'</li>').join("")+'</ol></section>';
}
function sourcesHtml(items){
  if(!Array.isArray(items)||!items.length)return"";
  return'<section><p class="overline">ZDROJE A PODKLADY</p><ul class="article-sources">'+items.map(url=>{
    let label=url;
    try{label=new URL(url).hostname.replace(/^www\./,"")}catch{}
    return'<li><a href="'+escapeHtml(url)+'" rel="noopener noreferrer">'+escapeHtml(label)+' ↗</a></li>';
  }).join("")+'</ul></section>';
}
function dbRowToArticle(row){
  return{
    slug:row.slug||"",
    category:row.category||"Slovensko v súvislostiach",
    title:row.title||"Bez názvu",
    summary:row.intro||"",
    verified:row.verified_at?String(row.verified_at).slice(0,10):(row.updated_at?String(row.updated_at).slice(0,10):""),
    image:row.image_url||"",
    imageAlt:row.image_alt||row.title||"",
    imageLicense:row.image_license||"",
    author:"Objektív24",
    facts:row.what_happened||"",
    meaning:row.what_it_means||"",
    watch:"",
    steps:String(row.next_step||"").split(/\n\s*\n|\r?\n/).map(x=>x.trim()).filter(Boolean),
    contact:"",
    sources:String(row.sources||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean),
    migrationStatus:"full"
  };
}
async function loadDraftArticle(id){
  const response=await fetch(SUPABASE_PUBLIC_URL+"/rest/v1/drafts?id=eq."+encodeURIComponent(id)+"&state=eq.published&select=*",{headers:{apikey:SUPABASE_PUBLIC_KEY,Authorization:"Bearer "+SUPABASE_PUBLIC_KEY},cache:"no-store"});
  if(!response.ok)throw new Error("Supabase "+response.status);
  const rows=await response.json();
  return Array.isArray(rows)&&rows[0]?dbRowToArticle(rows[0]):null;
}
async function loadDraftBySlug(value){
  const response=await fetch(SUPABASE_PUBLIC_URL+"/rest/v1/drafts?slug=eq."+encodeURIComponent(value)+"&state=eq.published&select=*",{headers:{apikey:SUPABASE_PUBLIC_KEY,Authorization:"Bearer "+SUPABASE_PUBLIC_KEY},cache:"no-store"});
  if(!response.ok)throw new Error("Supabase "+response.status);
  const rows=await response.json();
  return Array.isArray(rows)&&rows[0]?dbRowToArticle(rows[0]):null;
}
async function canonicalExists(value){
  if(!value)return false;
  try{
    const response=await fetch(canonicalFor(value),{method:"HEAD",cache:"no-store"});
    return response.ok;
  }catch{return false}
}
async function maybeRedirectToCanonical(value){
  if(!isLegacyPage||!value)return false;
  if(await canonicalExists(value)){
    location.replace(canonicalFor(value));
    return true;
  }
  return false;
}
function updateDynamicMeta(article){
  document.title=article.title+" | Objektív24";
  document.querySelector("#meta-description")?.setAttribute("content",article.summary||"Objektív24");
}
function renderArticle(article){
  updateDynamicMeta(article);
  const archiveBanner=article.archived?'<div class="article-archive-banner"><strong>Archív:</strong> táto informácia bola viazaná na už uplynutý termín. Pred konaním si overte aktuálny stav.</div>':"";
  const watchSection=article.watch?'<section class="watch-section"><p class="overline">NA ČO SI DAŤ POZOR</p>'+paragraph(article.watch)+'</section>':"";
  const contactSection=article.contact?'<section><p class="overline">KAM SA OBRÁTIŤ</p>'+paragraph(article.contact)+'</section>':"";
  root.innerHTML='<a class="article-back" href="/clanky/">← Všetky články</a>'+archiveBanner+
  '<header class="article-detail-header"><span class="eyebrow">'+escapeHtml(article.category)+'</span><h1>'+escapeHtml(article.title)+'</h1><p class="article-lead">'+escapeHtml(article.summary)+'</p><div class="article-detail-meta"><span>Podklady overené '+escapeHtml(article.verified)+'</span><span>'+escapeHtml(article.author||"Objektív24")+'</span></div></header>'+
  (article.image?'<figure class="article-detail-image" style="margin-inline:auto;max-width:1100px;overflow:hidden;border-radius:24px"><img src="'+escapeHtml(article.image)+'" alt="'+escapeHtml(article.imageAlt||"")+'" style="display:block;width:100%;height:clamp(260px,48vw,620px);object-fit:cover;object-position:center"><figcaption>'+imageLabel(article.image)+(article.imageLicense&&!/\/assets\/(?:ai|fallback)\//i.test(String(article.image||""))?' · '+escapeHtml(article.imageLicense):'')+'</figcaption></figure>':'')+
  '<div class="article-detail-grid"><div class="article-detail-copy"><section><p class="overline">ČO VIEME ZO ZDROJOV</p>'+paragraph(article.facts||article.summary)+'</section><section><p class="overline">ČO TO ZNAMENÁ PRE VÁS</p>'+paragraph(article.meaning||"Pri praktických informáciách si skontrolujte dátum overenia podkladov a svoju konkrétnu situáciu.")+'</section>'+watchSection+stepsHtml(article.steps)+contactSection+sourcesHtml(article.sources)+'</div><aside class="article-detail-side"><div class="article-side-card"><span class="eyebrow">OVERENIE</span><strong>'+escapeHtml(article.verified)+'</strong><p>Dátum poslednej kontroly podkladov evidovaný pri článku.</p></div><div class="article-side-card"><span class="eyebrow">REDAKČNÝ REŽIM</span><p>'+(article.migrationStatus==="full"?"Text je v plnej štruktúre Objektív24 a zdroje sú uvedené priamo nižšie.":"Text je zatiaľ v skrátenej verzii.")+'</p></div></aside></div>';
}
async function load(){
  if(!slug&&!draftId){renderNotFound();return}
  try{
    let article=null;
    if(draftId){
      article=await loadDraftArticle(draftId);
    }else if(pathSlug){
      article=await loadDraftBySlug(pathSlug);
      if(!article){
        const response=await fetch("/data/articles.json",{cache:"no-store"});
        if(!response.ok)throw new Error("load");
        const articles=await response.json();
        article=articles.find(item=>item.slug===pathSlug)||null;
      }
    }else{
      const response=await fetch("/data/articles.json",{cache:"no-store"});
      if(!response.ok)throw new Error("load");
      const articles=await response.json();
      article=articles.find(item=>item.slug===slug)||null;
    }
    if(!article){renderNotFound();return}
    const articleSlug=article.slug||slug||pathSlug;
    if(await maybeRedirectToCanonical(articleSlug))return;
    if(articleSlug==="vakcinacia-lisok"){
      article.image=FOX_IMAGE;
      article.imageAlt="Celá líška hrdzavá stojaca vo voľnej prírode";
      article.imageLicense="Wikimedia Commons · Public domain · U.S. Fish and Wildlife Service";
    }
    renderArticle(article);
  }catch(error){
    console.error(error);
    renderNotFound();
  }
}
load();

(()=>{let a=document.createElement("script");a.src="/analytics.js?v=4";a.onload=()=>{let p=document.createElement("script");p.src="/pwa.js?v=15";p.defer=true;document.head.appendChild(p)};document.head.appendChild(a)})();
