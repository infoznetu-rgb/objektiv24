const state={articles:[],filter:"Všetky témy",query:""};
const SUPABASE_PUBLIC_URL="https://bkyappgttwjxakkwycub.supabase.co";
const SUPABASE_PUBLIC_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const FOX_IMAGE="https://commons.wikimedia.org/wiki/Special:Redirect/file/Vulpes%20vulpes%20standing.jpg?width=1600";
const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
const normalize=v=>String(v??"").toLocaleLowerCase("sk").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const imageLabel=url=>/\/assets\/ai\//i.test(String(url||""))?"Ilustračný obrázok · AI":/\/assets\/fallback\//i.test(String(url||""))?"Ilustračný obrázok":"Ilustračná fotografia";
function dbRowToArticle(row){const slug=row.slug||"";const rawImage=row.image_url||"";const image=rawImage.toLowerCase().startsWith("data:image/jpeg;base64,")&&slug?"/assets/legacy/"+encodeURIComponent(slug)+".jpg":rawImage;return{id:row.id,slug,category:row.category||"Slovensko",title:row.title||"Bez názvu",summary:row.intro||"",published:row.published_at?String(row.published_at):"",verified:row.verified_at?String(row.verified_at).slice(0,10):(row.updated_at?String(row.updated_at).slice(0,10):""),url:slug?"/clanky/"+encodeURIComponent(slug)+"/":"clanok.html?id="+encodeURIComponent(row.id),archived:false,image,imageAlt:row.image_alt||row.title||""}}
async function loadPublishedDrafts(){try{const r=await fetch(SUPABASE_PUBLIC_URL+"/rest/v1/drafts?state=eq.published&select=id,slug,category,title,intro,published_at,verified_at,updated_at,image_url,image_alt&order=updated_at.desc",{headers:{apikey:SUPABASE_PUBLIC_KEY,Authorization:"Bearer "+SUPABASE_PUBLIC_KEY},cache:"no-store"});if(!r.ok)throw new Error("Supabase "+r.status);const rows=await r.json();return Array.isArray(rows)?rows.map(dbRowToArticle):[]}catch(e){console.warn("Supabase články sa nepodarilo načítať",e);return[]}}
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
  const heroUrl=document.querySelector(".hero-content .primary-cta")?.getAttribute("href")||"";
  const items=state.articles.filter(a=>!a.archived&&a.url).map((a,i)=>({a,i,time:Date.parse(a.published||a.verified||"")||0})).sort((x,y)=>y.time-x.time||x.i-y.i).map(x=>x.a).filter(a=>a.url!==heroUrl).slice(0,3);
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
.hero-main.hero-rotating .hero-photo:before,
.hero-main.hero-rotating .hero-photo:after{display:none!important}
.hero-main.hero-rotating .hero-photo img{
  position:absolute;z-index:1;inset:0;width:100%;height:100%;
  object-fit:contain!important;object-position:center center!important;
  background:#08131a;
  transform:none!important;transition:opacity .28s ease
}
.hero-main.hero-switching .hero-photo img{opacity:.32}
.hero-main.hero-rotating .hero-photo figcaption{z-index:7}
.hero-main.hero-rotating .hero-shade{
  z-index:3;
  background:linear-gradient(
    180deg,
    rgba(2,8,12,0) 0%,
    rgba(2,8,12,0) 54%,
    rgba(2,8,12,.18) 66%,
    rgba(2,8,12,.72) 84%,
    rgba(2,8,12,.94) 100%
  )!important
}
.hero-main.hero-rotating .hero-content{
  z-index:5;left:0;right:0;bottom:0;
  width:100%;max-width:none;
  padding:30px 40px 34px;
  display:flex;align-items:flex-end;justify-content:space-between;gap:28px
}
.hero-main.hero-rotating:hover .hero-photo img{transform:none!important}
.hero-main.hero-rotating .hero-content h1{
  flex:1 1 auto;display:block;overflow:visible;
  max-width:calc(100% - 190px);
  font-size:clamp(2rem,3.15vw,3.55rem)!important;
  line-height:.99!important;letter-spacing:-.05em!important;
  margin:0!important;text-wrap:balance;
  text-shadow:0 3px 24px rgba(0,0,0,.95)
}
.hero-main.hero-title-long .hero-content h1{
  font-size:clamp(1.85rem,2.75vw,3.15rem)!important
}
.hero-main.hero-title-xlong .hero-content h1{
  font-size:clamp(1.68rem,2.35vw,2.75rem)!important;line-height:1.02!important
}
.hero-main.hero-rotating .primary-cta{
  flex:none;margin:0 0 4px!important
}
.hero-rotator{
  position:absolute;left:18px;top:18px;right:auto;bottom:auto;z-index:8;
  display:flex;align-items:center;gap:8px;
  padding:7px 9px;border:1px solid rgba(255,255,255,.16);border-radius:999px;
  background:rgba(3,10,15,.66);backdrop-filter:blur(12px);
  box-shadow:0 8px 30px rgba(0,0,0,.22)
}
.hero-rotator button{display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font:900 18px/1 system-ui;cursor:pointer}
.hero-rotator button:hover,.hero-rotator button:focus-visible{background:#d9ff28;color:#061018;outline:0}
.hero-dots{display:flex;gap:6px;align-items:center}
.hero-dots button{width:8px;height:8px;padding:0;background:rgba(255,255,255,.38)}
.hero-dots button.is-active{width:22px;background:#d9ff28}
@media(max-width:980px){
  .hero-main.hero-rotating .hero-content{
    padding:28px 30px 30px;gap:20px
  }
  .hero-main.hero-rotating .hero-content h1{
    max-width:calc(100% - 165px);
    font-size:clamp(1.85rem,4.3vw,3rem)!important
  }
}
@media(max-width:680px){
  html.objektiv24-standalone .hero-main.hero-rotating{
    min-height:405px!important;
    height:405px!important;
    aspect-ratio:auto!important;
    background:#061018!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-photo{
    inset:0 0 auto 0!important;
    height:245px!important;
    display:grid!important;
    place-items:center!important;
    overflow:hidden!important;
    background:#08131a!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-photo:before{
    content:""!important;
    display:block!important;
    position:absolute!important;
    inset:-18px!important;
    background:var(--hero-app-image) center/cover no-repeat!important;
    filter:blur(18px) brightness(.48)!important;
    opacity:.72!important;
    transform:scale(1.08)!important;
    z-index:0!important;
    pointer-events:none!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-photo img{
    position:relative!important;
    inset:auto!important;
    z-index:1!important;
    width:100%!important;
    height:100%!important;
    object-fit:contain!important;
    object-position:center center!important;
    margin:auto!important;
    background:transparent!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-photo figcaption{
    z-index:3!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-shade{
    top:245px!important;
    bottom:0!important;
    background:linear-gradient(180deg,#08131a 0%,#061018 100%)!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-content{
    top:245px!important;
    bottom:0!important;
    height:160px!important;
    padding:15px 18px 17px!important;
    gap:10px!important;
    justify-content:center!important;
    align-items:flex-start!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-content h1,
  html.objektiv24-standalone .hero-main.hero-title-long .hero-content h1,
  html.objektiv24-standalone .hero-main.hero-title-xlong .hero-content h1{
    font-size:clamp(1.3rem,5.9vw,1.72rem)!important;
    line-height:1.03!important;
    margin:0!important;
    max-width:100%!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .primary-cta{
    padding:9px 14px!important;
    margin:0!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-rotator{
    left:auto!important;
    right:16px!important;
    top:auto!important;
    bottom:17px!important;
    padding:4px 6px!important;
    gap:4px!important;
    border-color:rgba(255,255,255,.10)!important;
    background:rgba(8,19,26,.92)!important;
    box-shadow:none!important;
    backdrop-filter:blur(10px)!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-rotator>button{
    width:22px!important;
    height:22px!important;
    font-size:14px!important;
    background:rgba(255,255,255,.07)!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-dots{
    gap:4px!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-dots button{
    width:6px!important;
    height:6px!important;
    min-width:6px!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-dots button.is-active{
    width:15px!important;
  }
}
@media(max-width:380px){
  html.objektiv24-standalone .hero-main.hero-rotating{
    min-height:390px!important;
    height:390px!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-photo{
    height:232px!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-shade{
    top:232px!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-content{
    top:232px!important;
    height:158px!important;
  }
  html.objektiv24-standalone .hero-main.hero-rotating .hero-rotator{
    right:13px!important;
    bottom:15px!important;
    padding:4px 5px!important;
  }
}

@media(max-width:680px){
  .hero-main.hero-rotating .hero-shade{
    background:linear-gradient(
      180deg,
      rgba(2,8,12,0) 0%,
      rgba(2,8,12,0) 46%,
      rgba(2,8,12,.24) 60%,
      rgba(2,8,12,.82) 82%,
      rgba(2,8,12,.97) 100%
    )!important
  }
  .hero-main.hero-rotating .hero-content{
    width:100%;max-width:100%;padding:20px 18px 22px;
    flex-direction:column;align-items:flex-start;gap:14px
  }
  .hero-main.hero-rotating .hero-content h1,
  .hero-main.hero-title-long .hero-content h1,
  .hero-main.hero-title-xlong .hero-content h1{
    max-width:100%;
    font-size:clamp(1.48rem,6.5vw,1.95rem)!important;
    line-height:1.04!important
  }
  .hero-main.hero-rotating .primary-cta{margin:0!important}
  .hero-rotator{left:12px;top:12px;padding:6px 7px;gap:6px}
  .hero-rotator button{width:27px;height:27px;font-size:16px}
  .hero-dots{gap:5px}
}
@media(prefers-reduced-motion:reduce){
  .hero-main .hero-photo img,.hero-main .hero-content{transition:none!important}
}`;
  document.head.appendChild(s)
}
function setupHero(){
  const hero=document.querySelector(".hero-main");if(!hero)return;
  const items=state.articles.map((a,i)=>({a,i,time:Date.parse(a.published||a.verified||"")||0}))
    .filter(x=>!x.a.archived&&x.a.image&&x.a.url)
    .sort((x,y)=>y.time-x.time||x.i-y.i)
    .slice(0,5).map(x=>x.a);
  if(!items.length)return;
  ensureHeroStyles();
  hero.classList.add("hero-rotating");

  const img=hero.querySelector(".hero-photo img");
  const caption=hero.querySelector(".hero-photo figcaption");
  const title=hero.querySelector(".hero-content h1");
  const cta=hero.querySelector(".hero-content .primary-cta");
  if(!img||!title||!cta)return;

  let current=0,timer=null,swapTimer=null;
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  let controls=hero.querySelector(".hero-rotator");
  if(!controls){
    controls=document.createElement("div");
    controls.className="hero-rotator";
    controls.setAttribute("aria-label","Prepínanie hlavných článkov");
    controls.innerHTML='<button type="button" class="hero-prev" aria-label="Predchádzajúci článok">‹</button><div class="hero-dots" aria-label="Hlavné články"></div><button type="button" class="hero-next" aria-label="Nasledujúci článok">›</button>';
    hero.appendChild(controls)
  }
  const dots=controls.querySelector(".hero-dots");
  dots.innerHTML=items.map((_,i)=>`<button type="button" data-hero-index="${i}" aria-label="Zobraziť článok ${i+1}"></button>`).join("");

  function apply(){
    const a=items[current],titleText=String(a.title||"");
    img.src=a.image;
    img.alt=a.imageAlt||titleText;
    hero.style.setProperty("--hero-app-image",'url("'+String(a.image||"").replace(/"/g,'%22')+'")');
    hero.classList.remove("hero-title-long","hero-title-xlong");
    if(titleText.length>92)hero.classList.add("hero-title-xlong");
    else if(titleText.length>68)hero.classList.add("hero-title-long");
    if(caption)caption.textContent=imageLabel(a.image)+(a.imageLicense?" · "+a.imageLicense:"");
    title.textContent=titleText;
    cta.href=a.url;
    cta.dataset.trackEvent="hero_click";
    cta.dataset.trackLabel=a.slug||a.url||"";
    controls.querySelectorAll("[data-hero-index]").forEach((b,i)=>{
      b.classList.toggle("is-active",i===current);
      b.setAttribute("aria-current",i===current?"true":"false")
    })
  }
  function show(index,animate=true){
    current=(index+items.length)%items.length;
    clearTimeout(swapTimer);
    if(animate&&!reduce){
      hero.classList.add("hero-switching");
      swapTimer=setTimeout(()=>{apply();requestAnimationFrame(()=>hero.classList.remove("hero-switching"))},140)
    }else{
      apply();hero.classList.remove("hero-switching")
    }
  }
  function stop(){clearInterval(timer);timer=null}
  function start(){stop();if(!reduce&&items.length>1)timer=setInterval(()=>show(current+1),7000)}
  function manual(index){show(index);start()}

  controls.querySelector(".hero-prev").addEventListener("click",()=>manual(current-1));
  controls.querySelector(".hero-next").addEventListener("click",()=>manual(current+1));
  controls.querySelectorAll("[data-hero-index]").forEach(b=>b.addEventListener("click",()=>manual(Number(b.dataset.heroIndex))));
  hero.addEventListener("mouseenter",stop);
  hero.addEventListener("mouseleave",start);
  hero.addEventListener("focusin",stop);
  hero.addEventListener("focusout",e=>{if(!hero.contains(e.relatedTarget))start()});
  apply();start()
}
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
bindTopicLinks();
const revealEls=[...document.querySelectorAll(".reveal")];if(window.matchMedia("(max-width: 680px)").matches){revealEls.forEach(el=>el.classList.add("is-visible"))}else{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target)}}),{threshold:.05,rootMargin:"0px 0px 120px 0px"});revealEls.forEach(el=>observer.observe(el))}
loadArticles();
(()=>{if(document.querySelector('script[src*="analytics.js"]'))return;let a=document.createElement('script');a.src='analytics.js?v=7';document.head.appendChild(a)})();
