const state={articles:[],filter:"Všetky témy",query:""};
const SUPABASE_PUBLIC_URL="https://bkyappgttwjxakkwycub.supabase.co";
const SUPABASE_PUBLIC_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const FOX_IMAGE="https://commons.wikimedia.org/wiki/Special:Redirect/file/Vulpes%20vulpes%20standing.jpg?width=1600";
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
const normalize=v=>String(v??"").toLocaleLowerCase("sk").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const imageLabel=url=>/\/assets\/ai\//i.test(String(url||""))?"Ilustračný obrázok · AI":/\/assets\/fallback\//i.test(String(url||""))?"Ilustračný obrázok":"Ilustračná fotografia";
function dbRowToArticle(row){const slug=row.slug||"";return{id:row.id,slug,category:row.category||"Slovensko",title:row.title||"Bez názvu",summary:row.intro||"",published:row.published_at?String(row.published_at):"",verified:row.verified_at?String(row.verified_at).slice(0,10):(row.updated_at?String(row.updated_at).slice(0,10):""),url:slug?"/clanky/"+encodeURIComponent(slug)+"/":"clanok.html?id="+encodeURIComponent(row.id),archived:false,image:row.image_url||"",imageAlt:row.image_alt||row.title||""}}
async function loadPublishedDrafts(){try{const r=await fetch(SUPABASE_PUBLIC_URL+"/rest/v1/drafts?state=eq.published&select=*&order=updated_at.desc",{headers:{apikey:SUPABASE_PUBLIC_KEY,Authorization:"Bearer "+SUPABASE_PUBLIC_KEY},cache:"no-store"});if(!r.ok)throw new Error("Supabase "+r.status);const rows=await r.json();return Array.isArray(rows)?rows.map(dbRowToArticle):[]}catch(e){console.warn("Supabase články sa nepodarilo načítať",e);return[]}}
const topicGroups=["Všetky témy","Slovensko","Peniaze a práca","Doprava a regióny","Úrady a služby","Rodina a zdravie","Spotrebiteľ a bezpečnosť","Šport"];
function topicFor(a){
  const s=normalize([a?.category,a?.title,a?.summary].join(" "));
  if(/sport|basket|hokej|futbal|tenis|lyz|cyklist/.test(s))return"Šport";
  if(/doprava|tunel|dialnic|cest|uzaver|vlak|autobus|premav|region|kraj|obec|mesto|levo|liptov|zilinsk/.test(s))return"Doprava a regióny";
  if(/peniaz|praca|zamest|socialn|davk|poist|dan|eur|solidarit|dlznik|vyplat/.test(s))return"Peniaze a práca";
  if(/rodin|skol|skolk|zdrav|matersk|lekar|vakcin|besnot|diet|pacient/.test(s))return"Rodina a zdravie";
  if(/urad|posta|slovensko\.sk|sluzb|doklad|pobock|sipo/.test(s))return"Úrady a služby";
  if(/spotrebit|podvod|sms|internet|bezpec|nakup|reklamac|phishing|cestovn/.test(s))return"Spotrebiteľ a bezpečnosť";
  return"Slovensko";
}
function cardTemplate(a){const label=escapeHtml(a.slug||a.url||"");const image=a.image?`<img class="article-visual" src="${escapeHtml(a.image)}" alt="${escapeHtml(a.imageAlt||a.title)}" loading="lazy" decoding="async"><span class="article-photo-label">${imageLabel(a.image)}</span>`:`<div class="article-visual article-visual-placeholder" aria-hidden="true"></div>`;return`<article class="article-card"><a class="article-image-wrap" href="${escapeHtml(a.url)}" aria-label="${escapeHtml(a.title)}" data-track-event="article_click" data-track-label="${label}">${image}</a><div class="article-body"><span class="eyebrow">${escapeHtml(a.category)}</span><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.summary)}</p><div class="article-meta"><span>${a.verified?"Overené "+escapeHtml(a.verified):"Objektív24"}</span><a href="${escapeHtml(a.url)}" data-track-event="article_click" data-track-label="${label}">Čítať ďalej →</a></div></div></article>`}
function archiveTemplate(a){return`<article class="archive-card"><span class="eyebrow">${escapeHtml(a.category)}</span><h3>${escapeHtml(a.title)}</h3><a href="${escapeHtml(a.url)}">Otvoriť článok →</a></article>`}
function renderFilters(){const root=document.querySelector("#filters");if(!root)return;root.innerHTML=topicGroups.map(c=>`<button class="filter-button ${state.filter===c?"is-active":""}" type="button" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");root.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>selectTopic(b.dataset.filter)))}
function renderArticles(){const grid=document.querySelector("#articles-grid"),archive=document.querySelector("#archive-grid"),empty=document.querySelector("#empty-state");if(!grid||!archive||!empty)return;const q=normalize(state.query.trim()),active=state.articles.filter(a=>!a.archived),filtered=active.filter(a=>(state.filter==="Všetky témy"||topicFor(a)===state.filter)&&(!q||normalize([a.title,a.summary,a.category,topicFor(a)].join(" ")).includes(q)));grid.innerHTML=filtered.map(cardTemplate).join("");empty.hidden=filtered.length!==0;archive.innerHTML=state.articles.filter(a=>a.archived).map(archiveTemplate).join("");document.querySelector("#issued-count")&&(document.querySelector("#issued-count").textContent=state.articles.length);document.querySelector("#active-count")&&(document.querySelector("#active-count").textContent=`Zobrazené: ${filtered.length} · Aktuálne: ${active.length}`)}
function renderLatest(){
  const root=document.querySelector(".latest");if(!root)return;
  root.querySelectorAll(".latest-item").forEach(el=>el.remove());
  const note=root.querySelector(".latest-note");
  const items=state.articles.filter(a=>!a.archived&&a.url).map((a,i)=>({a,i,time:Date.parse(a.published||a.verified||"")||0})).sort((x,y)=>y.time-x.time||x.i-y.i).slice(0,3).map(x=>x.a);
  const frag=document.createDocumentFragment();
  items.forEach(a=>{
    const link=document.createElement("a");link.className="latest-item";link.href=a.url;link.dataset.trackEvent="latest_click";link.dataset.trackLabel=a.slug||a.url||"";
    link.innerHTML=(a.image?'<img src="'+escapeHtml(a.image)+'" alt="'+escapeHtml(a.imageAlt||a.title)+'" loading="lazy" decoding="async">':'')+'<span><b>'+escapeHtml(a.title)+'</b><small>'+escapeHtml(topicFor(a))+((a.published||a.verified)?' · '+escapeHtml(heroDate(a.published||a.verified)):'')+'</small></span>';
    frag.appendChild(link);
  });
  root.insertBefore(frag,note||null);
}
function renderBreaking(){
  const root=document.querySelector(".breaking");if(!root)return;
  const latest=state.articles.filter(a=>!a.archived&&a.url).map((a,i)=>({a,i,time:Date.parse(a.published||a.verified||"")||0})).sort((x,y)=>y.time-x.time||x.i-y.i)[0]?.a;
  if(!latest)return;
  const strong=root.querySelector("strong"),text=root.querySelector("span"),link=root.querySelector("a");
  if(strong)strong.textContent="● NAJNOVŠIE";
  if(text)text.textContent=latest.title;
  if(link){link.href=latest.url;link.textContent="Čítať →";link.dataset.trackEvent="latest_click";link.dataset.trackLabel=latest.slug||latest.url||"";link.setAttribute("aria-label","Otvoriť najnovší článok: "+latest.title)}
}
function selectTopic(topic,scroll=true){
  state.filter=topicGroups.includes(topic)?topic:"Všetky témy";
  window.objektiv24Track?.("topic_click",state.filter);
  document.querySelectorAll(".nav-primary [data-topic]").forEach(link=>{
    const active=link.dataset.topic===state.filter;
    link.classList.toggle("is-active",active);
    if(active)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");
  });
  renderFilters();renderArticles();
  const nav=document.querySelector("#site-nav"),button=document.querySelector(".menu-button");
  if(nav?.classList.contains("is-open")){
    nav.classList.remove("is-open");
    button?.setAttribute("aria-expanded","false");
    button?.setAttribute("aria-label","Otvoriť hlavné menu");
  }
  if(scroll)document.querySelector("#clanky")?.scrollIntoView({behavior:"smooth",block:"start"});
}
function runSearch(value,scroll=true){
  state.query=String(value||"").trim();
  const lower=document.querySelector("#search-input"),upper=document.querySelector("#header-search-input");
  if(lower&&lower.value!==state.query)lower.value=state.query;
  if(upper&&upper.value!==state.query)upper.value=state.query;
  renderArticles();
  if(scroll)document.querySelector("#clanky")?.scrollIntoView({behavior:"smooth",block:"start"});
}
function bindTopicLinks(){
  document.querySelectorAll("[data-topic]").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();selectTopic(el.dataset.topic||"Všetky témy")}));
}
function heroDate(value){if(!value)return"";const d=new Date(String(value).slice(0,10)+"T12:00:00");return Number.isNaN(d.getTime())?String(value):new Intl.DateTimeFormat("sk-SK",{day:"numeric",month:"long"}).format(d)}
function ensureHeroStyles(){
  if(document.querySelector("#hero-rotator-styles"))return;
  const s=document.createElement("style");
  s.id="hero-rotator-styles";
  s.textContent=`
.hero-main .hero-content{transition:opacity .28s ease,transform .28s ease}
.hero-main.hero-switching .hero-content{opacity:.28}
.hero-main.hero-rotating .hero-photo{overflow:hidden;background:#08131a}
.hero-main.hero-rotating .hero-photo:before{
  content:"";position:absolute;z-index:0;inset:-34px;
  background-image:var(--hero-bg-image);background-size:cover;background-position:center;
  filter:blur(28px) brightness(.42) saturate(.88);transform:scale(1.08);opacity:.78
}
.hero-main.hero-rotating .hero-photo:after{
  content:"";position:absolute;z-index:1;inset:0;
  background:linear-gradient(90deg,rgba(3,8,13,.34) 0%,rgba(3,8,13,.10) 48%,rgba(3,8,13,.03) 100%)
}
.hero-main.hero-rotating .hero-photo img{
  position:absolute;z-index:2;top:0;right:0;width:58%;height:100%;
  object-fit:cover!important;object-position:center center!important;
  transform:none!important;transition:opacity .28s ease
}
.hero-main.hero-switching .hero-photo img{opacity:.28}
.hero-main.hero-rotating .hero-photo figcaption{z-index:7}
.hero-main.hero-rotating .hero-shade{
  z-index:3;
  background:
    linear-gradient(90deg,rgba(2,8,12,.98) 0%,rgba(2,8,12,.93) 32%,rgba(2,8,12,.72) 47%,rgba(2,8,12,.16) 67%,rgba(2,8,12,.04) 100%),
    linear-gradient(180deg,rgba(2,8,12,.03) 46%,rgba(2,8,12,.46) 100%)
}
.hero-main.hero-rotating .hero-content{
  z-index:5;left:0;right:auto;bottom:0;
  width:min(57%,660px);max-width:660px;
  padding:42px 0 42px 46px
}
.hero-main.hero-rotating:hover .hero-photo img{transform:none!important}
.hero-main.hero-rotating .meta-row{max-width:100%}
.hero-main.hero-rotating .hero-content h1{
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;
  max-width:100%;font-size:clamp(2.15rem,3.65vw,4.25rem)!important;
  line-height:.99!important;letter-spacing:-.055em!important;margin:16px 0 15px
}
.hero-main.hero-title-long .hero-content h1{
  font-size:clamp(2rem,3.2vw,3.7rem)!important;line-height:1!important
}
.hero-main.hero-title-xlong .hero-content h1{
  font-size:clamp(1.85rem,2.85vw,3.25rem)!important;line-height:1.02!important
}
.hero-main.hero-rotating .hero-content p{
  display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;
  max-width:570px;font-size:1rem!important;line-height:1.48!important;
  color:#d7dfe3;margin:0 0 14px
}
.hero-main.hero-rotating .primary-cta{margin-top:4px}
.hero-rotator{
  position:absolute;right:18px;bottom:18px;z-index:8;display:flex;align-items:center;gap:8px;
  padding:7px 9px;border:1px solid rgba(255,255,255,.16);border-radius:999px;
  background:rgba(3,10,15,.72);backdrop-filter:blur(12px);box-shadow:0 8px 30px rgba(0,0,0,.22)
}
.hero-rotator button{display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font:900 18px/1 system-ui;cursor:pointer}
.hero-rotator button:hover,.hero-rotator button:focus-visible{background:#d9ff28;color:#061018;outline:0}
.hero-dots{display:flex;gap:6px;align-items:center}
.hero-dots button{width:8px;height:8px;padding:0;background:rgba(255,255,255,.38)}
.hero-dots button.is-active{width:22px;background:#d9ff28}
@media(max-width:980px) and (min-width:681px){
  .hero-main.hero-rotating .hero-photo img{width:62%;object-position:62% center!important}
  .hero-main.hero-rotating .hero-content{width:61%;padding:36px 0 36px 34px}
  .hero-main.hero-rotating .hero-content h1{font-size:clamp(2rem,4vw,3.3rem)!important}
}
@media(max-width:680px){
  .hero-main.hero-rotating .hero-photo:before{inset:-22px;filter:blur(18px) brightness(.52)}
  .hero-main.hero-rotating .hero-photo img{
    position:relative;right:auto;width:100%;height:100%;
    object-fit:cover!important;object-position:center center!important
  }
  .hero-main.hero-rotating .hero-photo:after{background:rgba(3,8,13,.08)}
  .hero-main.hero-rotating .hero-shade{
    background:linear-gradient(180deg,rgba(2,8,12,.08) 0%,rgba(2,8,12,.18) 34%,rgba(2,8,12,.82) 68%,rgba(2,8,12,.98) 100%)!important
  }
  .hero-main.hero-rotating .hero-content{
    width:100%;max-width:100%;padding:20px 18px 22px
  }
  .hero-main.hero-rotating .hero-content h1,
  .hero-main.hero-title-long .hero-content h1,
  .hero-main.hero-title-xlong .hero-content h1{
    -webkit-line-clamp:4;max-width:100%;
    font-size:clamp(1.48rem,6.8vw,1.98rem)!important;line-height:1.04!important
  }
  .hero-main.hero-rotating .hero-content p{
    -webkit-line-clamp:3;max-width:92%!important;padding-right:82px;
    font-size:.8rem!important;line-height:1.48!important
  }
  .hero-rotator{right:12px;bottom:12px;padding:6px 7px;gap:6px}
  .hero-rotator button{width:27px;height:27px;font-size:16px}
  .hero-dots{gap:5px}
  .hero-main.hero-rotating .primary-cta{margin-bottom:3px}
}
@media(prefers-reduced-motion:reduce){
  .hero-main .hero-photo img,.hero-main .hero-content{transition:none!important}
}`;
  document.head.appendChild(s)
}
function setupHero(){const hero=document.querySelector(".hero-main");if(!hero)return;const items=state.articles.map((a,i)=>({a,i,time:Date.parse(a.published||a.verified||"")||0})).filter(x=>!x.a.archived&&x.a.image&&x.a.url).sort((x,y)=>y.time-x.time||x.i-y.i).slice(0,5).map(x=>x.a);if(!items.length)return;ensureHeroStyles();hero.classList.add("hero-rotating");const img=hero.querySelector(".hero-photo img"),caption=hero.querySelector(".hero-photo figcaption"),eyebrow=hero.querySelector(".hero-content .eyebrow"),meta=hero.querySelector(".hero-content .meta-row span:not(.eyebrow)"),title=hero.querySelector(".hero-content h1"),summary=hero.querySelector(".hero-content p"),cta=hero.querySelector(".hero-content .primary-cta");if(!img||!eyebrow||!title||!summary||!cta)return;let current=0,timer=null,swapTimer=null;const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;let controls=hero.querySelector(".hero-rotator");if(!controls){controls=document.createElement("div");controls.className="hero-rotator";controls.setAttribute("aria-label","Prepínanie hlavných článkov");controls.innerHTML='<button type="button" class="hero-prev" aria-label="Predchádzajúci článok">‹</button><div class="hero-dots" aria-label="Hlavné články"></div><button type="button" class="hero-next" aria-label="Nasledujúci článok">›</button>';hero.appendChild(controls)}const dots=controls.querySelector(".hero-dots");dots.innerHTML=items.map((_,i)=>`<button type="button" data-hero-index="${i}" aria-label="Zobraziť článok ${i+1}"></button>`).join("");function apply(){const a=items[current],titleText=String(a.title||"");img.src=a.image;img.alt=a.imageAlt||titleText;hero.style.setProperty("--hero-bg-image",`url(${JSON.stringify(String(a.image||""))})`);hero.classList.remove("hero-title-long","hero-title-xlong");if(titleText.length>92)hero.classList.add("hero-title-xlong");else if(titleText.length>68)hero.classList.add("hero-title-long");if(caption)caption.textContent=imageLabel(a.image)+(a.imageLicense?" · "+a.imageLicense:"");eyebrow.textContent=a.category||"Objektív24";if(meta)meta.textContent=a.verified?"Overené "+heroDate(a.verified):"Najnovšie";title.textContent=titleText;summary.textContent=a.summary||"";cta.href=a.url;cta.dataset.trackEvent="hero_click";cta.dataset.trackLabel=a.slug||a.url||"";controls.querySelectorAll("[data-hero-index]").forEach((b,i)=>{b.classList.toggle("is-active",i===current);b.setAttribute("aria-current",i===current?"true":"false")})}function show(index,animate=true){current=(index+items.length)%items.length;clearTimeout(swapTimer);if(animate&&!reduce){hero.classList.add("hero-switching");swapTimer=setTimeout(()=>{apply();requestAnimationFrame(()=>hero.classList.remove("hero-switching"))},140)}else{apply();hero.classList.remove("hero-switching")}}function stop(){clearInterval(timer);timer=null}function start(){stop();if(!reduce&&items.length>1)timer=setInterval(()=>show(current+1),7000)}function manual(index){show(index);start()}controls.querySelector(".hero-prev").addEventListener("click",()=>manual(current-1));controls.querySelector(".hero-next").addEventListener("click",()=>manual(current+1));controls.querySelectorAll("[data-hero-index]").forEach(b=>b.addEventListener("click",()=>manual(Number(b.dataset.heroIndex))));hero.addEventListener("mouseenter",stop);hero.addEventListener("mouseleave",start);hero.addEventListener("focusin",stop);hero.addEventListener("focusout",e=>{if(!hero.contains(e.relatedTarget))start()});apply();start()}
async function loadArticles(){try{const r=await fetch("data/articles.json",{cache:"no-store"});if(!r.ok)throw new Error("articles.json");const staticArticles=await r.json();staticArticles.forEach(a=>{a.published=a.publishedAt||a.verified||"";if(a.slug)a.url="/clanky/"+encodeURIComponent(a.slug)+"/";if(a.slug==="vakcinacia-lisok"){a.image=FOX_IMAGE;a.imageAlt="Celá líška hrdzavá stojaca vo voľnej prírode";a.imageLicense="Wikimedia Commons · Public domain · U.S. Fish and Wildlife Service"}});const live=await loadPublishedDrafts(),titles=new Set(live.map(x=>normalize(x.title)));state.articles=[...live,...staticArticles.filter(x=>!titles.has(normalize(x.title)))];renderFilters();renderArticles();renderLatest();renderBreaking();setupHero()}catch(e){console.error(e);document.querySelector("#articles-grid").innerHTML="<p>Články sa nepodarilo načítať. Skúste stránku obnoviť.</p>"}}
document.querySelector(".menu-button")?.addEventListener("click",e=>{
  const nav=document.querySelector("#site-nav"),open=nav.classList.toggle("is-open");
  e.currentTarget.setAttribute("aria-expanded",String(open));
  e.currentTarget.setAttribute("aria-label",open?"Zavrieť hlavné menu":"Otvoriť hlavné menu");
});
document.querySelector("#site-nav")?.addEventListener("click",e=>{
  const link=e.target.closest("a:not([data-topic])");
  if(!link)return;
  document.querySelector("#site-nav")?.classList.remove("is-open");
  const button=document.querySelector(".menu-button");
  button?.setAttribute("aria-expanded","false");
  button?.setAttribute("aria-label","Otvoriť hlavné menu");
});
addEventListener("resize",()=>{
  if(innerWidth>980){
    document.querySelector("#site-nav")?.classList.remove("is-open");
    const button=document.querySelector(".menu-button");
    button?.setAttribute("aria-expanded","false");
    button?.setAttribute("aria-label","Otvoriť hlavné menu");
  }
});
let searchTracked=false;
function markSearchUsed(value){
  if(searchTracked||String(value||"").trim().length<2)return;
  searchTracked=true;
  window.objektiv24Track?.("search_used");
}
document.querySelector("#search-form")?.addEventListener("submit",e=>{e.preventDefault();const value=document.querySelector("#search-input")?.value||"";markSearchUsed(value);runSearch(value,false)});
document.querySelector("#search-input")?.addEventListener("input",e=>{markSearchUsed(e.currentTarget.value);runSearch(e.currentTarget.value,false)});
document.querySelector("#header-search-form")?.addEventListener("submit",e=>{e.preventDefault();const value=document.querySelector("#header-search-input")?.value||"";markSearchUsed(value);runSearch(value,true)});
document.querySelector("#header-search-input")?.addEventListener("input",e=>markSearchUsed(e.currentTarget.value));
document.querySelector("#reset-search")?.addEventListener("click",()=>{state.filter="Všetky témy";runSearch("",false);renderFilters();renderArticles()});
document.addEventListener("click",e=>{
  const target=e.target.closest("[data-track-event]");
  if(target)window.objektiv24Track?.(target.dataset.trackEvent,target.dataset.trackLabel||null);
});
bindTopicLinks();
const revealEls=[...document.querySelectorAll(".reveal")];if(window.matchMedia("(max-width: 680px)").matches){revealEls.forEach(el=>el.classList.add("is-visible"))}else{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target)}}),{threshold:.05,rootMargin:"0px 0px 120px 0px"});revealEls.forEach(el=>observer.observe(el))}
loadArticles();
(()=>{if(document.querySelector('script[src*="analytics.js"]'))return;let a=document.createElement('script');a.src='analytics.js?v=4';document.head.appendChild(a)})();
