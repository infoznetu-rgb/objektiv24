const SUPABASE_URL="https://bkyappgttwjxakkwycub.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const LEGACY_STORAGE_KEY="objektiv24-redakcia-drafts-v2";
const $=s=>document.querySelector(s);
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    flowType:"implicit"
  }
});

let drafts=[];
let publishedDrafts=[];
let currentImageData="";
let currentUser=null;

const WORKSPACE_STORAGE_KEY="objektiv24-redakcia-workspace-v1";
const WORKSPACE_MAX_AGE=7*24*60*60*1000;
const WORKSPACE_FIELD_IDS=["title","seo-title","meta-description","category","intro","what-happened","what-it-means","next-step","sources","state"];
let workspaceDirty=false;
let workspaceSaveTimer=null;
let workspaceRestoring=false;
let preserveEditorScroll=false;
let serverAutosaveTimer=null;
let serverAutosaveRunning=false;
let serverAutosaveQueued=false;
let serverAutosaveBlocked=false;

function workspaceSnapshot(){
  const fields={};
  for(const id of WORKSPACE_FIELD_IDS){
    const el=document.getElementById(id);
    if(el)fields[id]=el.value;
  }
  return {
    version:1,
    savedAt:Date.now(),
    draftId:$("#draft-id")?.value||"",
    dirty:workspaceDirty,
    fields,
    image:currentImageData||"",
    scrollY:Math.max(0,window.scrollY||0)
  };
}
function saveEditorWorkspace(){
  if(workspaceRestoring||$("#editor-shell")?.hidden)return;
  try{
    localStorage.setItem(WORKSPACE_STORAGE_KEY,JSON.stringify(workspaceSnapshot()));
    window.dispatchEvent(new CustomEvent("objektiv24-workspace-saved",{detail:{dirty:workspaceDirty}}));
  }catch(error){console.warn("Workspace save failed",error)}
}
function scheduleWorkspaceSave(delay=450){
  clearTimeout(workspaceSaveTimer);
  workspaceSaveTimer=setTimeout(saveEditorWorkspace,delay);
}
function hasMeaningfulDraftContent(d){
  return Boolean(
    (d.title||"").trim() ||
    (d.seoTitle||"").trim() ||
    (d.metaDescription||"").trim() ||
    (d.intro||"").trim() ||
    (d.whatHappened||"").trim() ||
    (d.whatItMeans||"").trim() ||
    (d.nextStep||"").trim() ||
    (d.sources||"").trim() ||
    (d.image||"").trim()
  );
}
function scheduleServerAutosave(delay=1400){
  if(workspaceRestoring||serverAutosaveBlocked||!currentUser)return;
  clearTimeout(serverAutosaveTimer);
  serverAutosaveTimer=setTimeout(()=>{void autosaveDraftToServer()},delay);
}
async function autosaveDraftToServer(){
  if(workspaceRestoring||serverAutosaveBlocked||!currentUser)return null;
  if(serverAutosaveRunning){
    serverAutosaveQueued=true;
    return null;
  }

  const draft=readForm();
  if(!hasMeaningfulDraftContent(draft))return null;

  const selected=drafts.find(x=>x.id===draft.id);
  const mayForkPublished=Boolean(selected&&(selected.seed||selected.state==="published"));
  if(draft.state!=="draft"&&!mayForkPublished)return null;

  serverAutosaveRunning=true;
  serverAutosaveQueued=false;
  const status=$("#draft-status");
  const mustFork=mayForkPublished;
  const payload=draftToDb({...draft,state:"draft"});

  try{
    if(status)status.textContent="Automaticky ukladám…";

    let result;
    if(selected&&!selected.seed&&selected.state!=="published"){
      result=await client.from("drafts").update(payload).eq("id",selected.id).select("*").single();
    }else{
      result=await client.from("drafts").insert(payload).select("*").single();
    }
    if(result.error)throw result.error;

    const saved=dbToDraft(result.data);
    $("#draft-id").value=saved.id;
    $("#state").value="draft";
    $("#delete-draft").hidden=false;

    const existingIndex=drafts.findIndex(x=>x.id===saved.id);
    if(existingIndex>=0)drafts[existingIndex]=saved;
    else drafts.unshift(saved);

    if(mustFork&&selected){
      const oldIndex=drafts.findIndex(x=>x.id===selected.id);
      if(oldIndex>=0&&selected.seed) drafts[oldIndex]=selected;
    }

    workspaceDirty=false;
    renderDraftList();
    saveEditorWorkspace();
    if(status)status.textContent="Automaticky uložené "+new Date().toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"});
    return saved;
  }catch(error){
    console.error("Automatické uloženie zlyhalo:",error);
    if(status)status.textContent="Autosave zlyhal – zmeny ostali v prehliadači";
    return null;
  }finally{
    serverAutosaveRunning=false;
    if(serverAutosaveQueued){
      serverAutosaveQueued=false;
      scheduleServerAutosave(400);
    }
  }
}
function restoreEditorWorkspace(){
  let snapshot=null;
  try{snapshot=JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY)||"null")}catch{}
  if(!snapshot||snapshot.version!==1||Date.now()-Number(snapshot.savedAt||0)>WORKSPACE_MAX_AGE)return false;

  workspaceRestoring=true;
  try{
    const id=String(snapshot.draftId||"");
    const existing=id?drafts.find(d=>d.id===id):null;
    if(existing)selectDraft(id);
    else resetForm();

    if(snapshot.dirty&&snapshot.fields&&(!id||existing)){
      for(const fieldId of WORKSPACE_FIELD_IDS){
        const el=document.getElementById(fieldId);
        if(el&&Object.prototype.hasOwnProperty.call(snapshot.fields,fieldId))el.value=String(snapshot.fields[fieldId]??"");
      }
      if(snapshot.image){
        currentImageData=String(snapshot.image);
        showPreview(currentImageData);
      }
      workspaceDirty=true;
      updateLivePreview();
      $("#draft-status").textContent="Rozpracované zmeny obnovené";
    }else{
      workspaceDirty=false;
    }

    const y=Math.max(0,Number(snapshot.scrollY||0));
    requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:y,left:0,behavior:"auto"})));
    return true;
  }finally{
    workspaceRestoring=false;
  }
}

const builtInDrafts=[
  {
    id:"working-road-rules",seed:true,state:"draft",updated:"16. 09. 2026",
    title:"Nové pravidlá na cestách už platia. Čo sa od septembra zmenilo pre vodičov, chodcov a kolobežky",
    category:"Slovensko v súvislostiach",
    intro:"Pracovný návrh k zmenám pravidiel cestnej premávky.",
    whatHappened:"",whatItMeans:"",nextStep:"",sources:"",image:""
  },
  {
    id:"working-slovensko-sk",seed:true,state:"draft",updated:"16. 09. 2026",
    title:"Nové Slovensko.sk už funguje. Starý portál zatiaľ nekončí, občania si môžu vybrať",
    category:"Slovensko v súvislostiach",
    intro:"Pracovný návrh k prechodu na nové prostredie portálu Slovensko.sk.",
    whatHappened:"",whatItMeans:"",nextStep:"",sources:"",image:""
  }
];

function nowDate(){return new Intl.DateTimeFormat("sk-SK",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date())}
function authMessage(text,type=""){const el=$("#auth-message");el.textContent=text;el.className="auth-message"+(type?" "+type:"")}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]))}
const EDITOR_CATEGORIES=["Slovensko","Peniaze a práca","Doprava a regióny","Úrady a služby","Rodina a zdravie","Spotrebiteľ a bezpečnosť","Šport"];
function normalizeCategory(value){
  const raw=String(value||"").trim();
  if(EDITOR_CATEGORIES.includes(raw))return raw;
  const s=raw.toLocaleLowerCase("sk").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  if(/sport|basket|hokej|futbal|tenis|lyz|cyklist/.test(s))return"Šport";
  if(/doprava|tunel|dialnic|cest|uzaver|vlak|autobus|premav|region/.test(s))return"Doprava a regióny";
  if(/peniaz|praca|zamest|socialn|davk|poist|dan|eur/.test(s))return"Peniaze a práca";
  if(/rodin|skol|zdrav|matersk|lekar|vakcin|diet/.test(s))return"Rodina a zdravie";
  if(/urad|posta|slovensko\.sk|sluzb|doklad|pobock|sipo/.test(s))return"Úrady a služby";
  if(/spotrebit|podvod|sms|internet|bezpec|nakup|reklamac|phishing/.test(s))return"Spotrebiteľ a bezpečnosť";
  return"Slovensko";
}
function formatVerifiedAt(value){
  if(!value)return"Zdroje zatiaľ nemajú samostatne zaznamenané overenie.";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return"Zdroje overené: "+value;
  return"Zdroje overené "+new Intl.DateTimeFormat("sk-SK",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);
}
function updateVerificationUI(value){
  const label=$("#verified-at-label");
  if(label)label.textContent=formatVerifiedAt(value);
}


async function seedPublishedArticles(){
  try{
    const r=await fetch("data/articles.json",{cache:"no-store"});
    const a=await r.json();
    return a.map(x=>({
      id:"published-"+x.slug,seed:true,title:x.title,seoTitle:x.seoTitle||"",metaDescription:x.metaDescription||"",category:normalizeCategory(x.category),intro:x.summary,
      state:x.archived?"archived":"published",updated:x.verified,verifiedAt:x.verified||"",
      whatHappened:x.facts||"",
      whatItMeans:x.meaning||"",
      nextStep:[...(Array.isArray(x.steps)?x.steps:[]),x.contact||""].filter(Boolean).join("\n\n"),
      sources:Array.isArray(x.sources)?x.sources.join("\n"):(x.sourceUrl||x.url||""),
      image:x.image||"",imageName:""
    }));
  }catch{return[]}
}

function dbToDraft(row){
  return {
    id:row.id,
    seed:false,
    state:row.state||"draft",
    updated:(row.state==="published"&&row.published_at?row.published_at:row.updated_at)
      ?new Intl.DateTimeFormat("sk-SK",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(row.state==="published"&&row.published_at?row.published_at:row.updated_at))
      :"",
    title:row.title||"",
    seoTitle:row.seo_title||"",
    metaDescription:row.meta_description||"",
    category:normalizeCategory(row.category),
    verifiedAt:row.verified_at||"",
    intro:row.intro||"",
    whatHappened:row.what_happened||"",
    whatItMeans:row.what_it_means||"",
    nextStep:row.next_step||"",
    sources:row.sources||"",
    image:row.image_url||""
  };
}

function draftToDb(draft){
  return {
    user_id:currentUser.id,
    title:draft.title||"",
    seo_title:draft.seoTitle||"",
    meta_description:draft.metaDescription||"",
    category:normalizeCategory(draft.category),
    intro:draft.intro||"",
    what_happened:draft.whatHappened||"",
    what_it_means:draft.whatItMeans||"",
    next_step:draft.nextStep||"",
    sources:draft.sources||"",
    state:draft.state||"draft",
    image_url:draft.image||"",
    updated_at:new Date().toISOString()
  };
}

async function loadServerDrafts(){
  const {data,error}=await client.from("drafts").select("*").order("updated_at",{ascending:false});
  if(error)throw error;
  return (data||[]).map(dbToDraft);
}

function loadLegacyDrafts(){
  try{return JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)||"[]")}catch{return[]}
}

async function migrateLegacyDraftsIfNeeded(serverDrafts){
  const legacy=loadLegacyDrafts().filter(d=>!d.seed&&d.title);
  if(!legacy.length||serverDrafts.length)return serverDrafts;

  const rows=legacy.map(d=>draftToDb({
    ...d,
    id:undefined,
    image:d.image||""
  }));
  const {data,error}=await client.from("drafts").insert(rows).select("*");
  if(error)throw error;
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  return (data||[]).map(dbToDraft);
}

async function refreshDrafts(){
  $("#draft-status").textContent="Synchronizujem…";
  let serverDrafts=await loadServerDrafts();
  serverDrafts=await migrateLegacyDraftsIfNeeded(serverDrafts);
  publishedDrafts=await seedPublishedArticles();
  drafts=[...serverDrafts,...builtInDrafts,...publishedDrafts];
  renderDraftList();
  $("#draft-status").textContent="Synchronizované";
}

function stateLabel(d){
  if(d.state==="published")return "VYDANÝ";
  if(d.state==="archived")return "ARCHÍV";
  return "NÁVRH";
}

function renderDraftList(){
  const q=($("#draft-search").value||"").toLocaleLowerCase("sk");
  const v=drafts.filter(d=>(d.title||"Bez názvu").toLocaleLowerCase("sk").includes(q));
  $("#draft-count").textContent=drafts.length;
  $("#draft-list").innerHTML=v.map(d=>`
    <button type="button" class="draft-card ${$("#draft-id").value===d.id?"is-active":""}" data-id="${escapeHtml(d.id)}">
      <span class="badge">${stateLabel(d)} · ${d.seed?"zdrojový článok":"uložené v databáze"}</span>
      <h3>${escapeHtml(d.title||"Bez názvu")}</h3>
      <time>${escapeHtml(d.updated||"")}</time>
    </button>`).join("");
  document.querySelectorAll(".draft-card").forEach(b=>b.addEventListener("click",()=>selectDraft(b.dataset.id)));
}

function resetForm(){
  clearTimeout(serverAutosaveTimer);
  serverAutosaveBlocked=false;
  workspaceDirty=false;
  $("#article-form").reset();
  $("#draft-id").value="";
  $("#category").value="Slovensko";
  updateVerificationUI("");
  $("#draft-status").textContent="Nový návrh";
  currentImageData="";
  hidePreview();
  $("#delete-draft").hidden=true;
  updateLivePreview();
  renderDraftList();
  scheduleWorkspaceSave(0);
}

function selectDraft(id){
  clearTimeout(serverAutosaveTimer);
  serverAutosaveBlocked=true;
  const d=drafts.find(x=>x.id===id);if(!d){serverAutosaveBlocked=false;return;}
  $("#draft-id").value=d.id;
  $("#title").value=d.title||"";
  $("#seo-title").value=d.seoTitle||"";
  $("#meta-description").value=d.metaDescription||"";
  $("#category").value=normalizeCategory(d.category);
  updateVerificationUI(d.verifiedAt||"");
  $("#intro").value=d.intro||"";
  $("#what-happened").value=d.whatHappened||"";
  $("#what-it-means").value=d.whatItMeans||"";
  $("#next-step").value=d.nextStep||"";
  $("#sources").value=d.sources||"";
  $("#state").value=d.state||"draft";
  $("#draft-status").textContent=d.seed?"Zdrojový článok · uloženie vytvorí nový návrh":"Uložené v Supabase";
  currentImageData=d.image||"";
  currentImageData?showPreview(currentImageData):hidePreview();
  $("#delete-draft").hidden=!!d.seed;
  updateLivePreview();
  renderDraftList();
  workspaceDirty=false;
  scheduleWorkspaceSave(0);
  serverAutosaveBlocked=false;
  if(!preserveEditorScroll)window.scrollTo({top:0,behavior:"smooth"});
}

function readForm(){
  return {
    id:$("#draft-id").value||"",
    seed:false,
    title:$("#title").value.trim(),
    seoTitle:$("#seo-title").value.trim(),
    metaDescription:$("#meta-description").value.trim(),
    category:normalizeCategory($("#category").value),
    intro:$("#intro").value.trim(),
    whatHappened:$("#what-happened").value.trim(),
    whatItMeans:$("#what-it-means").value.trim(),
    nextStep:$("#next-step").value.trim(),
    sources:$("#sources").value.trim(),
    state:$("#state").value,
    updated:nowDate(),
    image:currentImageData
  };
}

function showPreview(src){const r=$("#image-preview");r.hidden=false;r.querySelector("img").src=src}
function hidePreview(){const r=$("#image-preview");r.hidden=true;r.querySelector("img").removeAttribute("src")}

function updateLivePreview(){
  const title=$("#title").value.trim();
  const intro=$("#intro").value.trim();
  const category=$("#category").value.trim();
  const sources=$("#sources").value.trim();
  const body=$("#what-happened").value.trim()+$("#what-it-means").value.trim()+$("#next-step").value.trim();

  $("#live-title").textContent=title||"Titulok článku sa zobrazí tu";
  $("#live-intro").textContent=intro||"Krátky úvod sa zobrazí tu.";
  $("#live-category").textContent=category||"Bez rubriky";

  const image=$("#live-image");
  if(currentImageData){image.style.backgroundImage=`url("${currentImageData}")`;image.querySelector("span").textContent=""}
  else{image.style.backgroundImage="";image.querySelector("span").textContent="Náhľad obrázka"}

  $("#check-title").classList.toggle("ok",title.length>=8);
  $("#check-intro").classList.toggle("ok",intro.length>=30);
  $("#check-source").classList.toggle("ok",sources.length>=8);
  $("#check-body").classList.toggle("ok",body.length>=50);
}

async function resizeImage(file){
  const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=reject;r.readAsDataURL(file)});
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=dataUrl});
  const maxW=1200,maxH=900,scale=Math.min(1,maxW/img.width,maxH/img.height);
  const canvas=document.createElement("canvas");
  canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
  canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/jpeg",.76);
}

async function saveDraft(){
  const d=readForm();
  if(!d.title)return;

  $("#draft-status").textContent="Ukladám…";
  const selected=drafts.find(x=>x.id===d.id);
  const payload=draftToDb(d);

  let result;
  if(selected&&!selected.seed){
    result=await client.from("drafts").update(payload).eq("id",selected.id).select("*").single();
  }else{
    result=await client.from("drafts").insert(payload).select("*").single();
  }

  if(result.error)throw result.error;
  const saved=dbToDraft(result.data);
  const savedScrollY=window.scrollY||0;
  await refreshDrafts();
  preserveEditorScroll=true;
  try{selectDraft(saved.id)}finally{preserveEditorScroll=false}
  requestAnimationFrame(()=>window.scrollTo({top:savedScrollY,left:0,behavior:"auto"}));
  workspaceDirty=false;
  saveEditorWorkspace();
  $("#draft-status").textContent="Uložené "+new Date().toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"});
  $(".editor-heading").classList.remove("save-flash");void $(".editor-heading").offsetWidth;$(".editor-heading").classList.add("save-flash");
  return saved;
}

async function verifySourcesNow(){
  const sources=$("#sources").value.trim();
  if(!/https?:\/\/\S+/i.test(sources)){
    alert("Najprv doplňte aspoň jeden priamy zdroj s URL.");
    $("#sources").focus();
    return;
  }
  const button=$("#verify-sources");
  if(button)button.disabled=true;
  try{
    $("#draft-status").textContent="Ukladám článok pred overením…";
    const saved=await saveDraft();
    if(!saved?.id)return;
    const verifiedAt=new Date().toISOString();
    $("#draft-status").textContent="Zaznamenávam overenie zdrojov…";
    const {data,error}=await client.from("drafts")
      .update({verified_at:verifiedAt})
      .eq("id",saved.id)
      .select("*")
      .single();
    if(error)throw error;
    const verified=dbToDraft(data);
    await refreshDrafts();
    selectDraft(verified.id);
    updateVerificationUI(verified.verifiedAt);
    $("#draft-status").textContent="Zdroje overené dnes";
  }finally{
    if(button)button.disabled=false;
  }
}

async function deleteDraft(){
  const id=$("#draft-id").value;
  const d=drafts.find(x=>x.id===id);
  if(!d||d.seed)return;
  if(!confirm("Naozaj chcete tento návrh vymazať?"))return;
  $("#draft-status").textContent="Mažem…";
  const {error}=await client.from("drafts").delete().eq("id",id);
  if(error)throw error;
  await refreshDrafts();
  if(!restoreEditorWorkspace())resetForm();
}

async function showEditor(user){
  currentUser=user;
  $("#auth-gate").hidden=true;
  $("#editor-shell").hidden=false;
  $("#session-user").hidden=false;
  $("#session-user").textContent=user.email||"Prihlásený používateľ";
  $("#logout-button").hidden=false;
  await refreshDrafts();
  if(!restoreEditorWorkspace())resetForm();
}

function showLogin(){
  currentUser=null;
  $("#auth-gate").hidden=false;
  $("#editor-shell").hidden=true;
  $("#session-user").hidden=true;
  $("#logout-button").hidden=true;
}

let magicLinkCooldownUntil=0;

function friendlyAuthError(error){
  const message=String(error?.message||"").toLowerCase();
  if(message.includes("rate limit")||message.includes("too many")){
    return "Supabase dočasne vyčerpal limit odosielania e-mailov. Počkajte približne hodinu a skúste poslať jeden nový prihlasovací odkaz.";
  }
  if(message.includes("invalid login credentials")){
    return "E-mail alebo heslo nie sú správne. Ak heslo ešte nemáte, použite prihlasovací odkaz.";
  }
  return error?.message||"Pri prihlásení nastala chyba.";
}

$("#login-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("#login-email").value.trim();
  const button=$("#magic-link-button");
  if(!email){authMessage("Najprv zadajte e-mail.","error");return}

  const now=Date.now();
  if(now<magicLinkCooldownUntil){
    const seconds=Math.ceil((magicLinkCooldownUntil-now)/1000);
    authMessage("Nový odkaz môžete skúsiť poslať o "+seconds+" sekúnd.","error");
    return;
  }

  button.disabled=true;
  authMessage("Odosielam prihlasovací odkaz…");

  const {error}=await client.auth.signInWithOtp({
    email,
    options:{
      emailRedirectTo:"https://objektiv24.sk/redakcia.html",
      shouldCreateUser:false
    }
  });

  magicLinkCooldownUntil=Date.now()+60000;
  setTimeout(()=>{button.disabled=false},60000);

  if(error){
    authMessage(friendlyAuthError(error),"error");
  }else{
    authMessage("Prihlasovací odkaz bol odoslaný. Skontrolujte e-mail. Ďalší odkaz bude možné vyžiadať najskôr o minútu.","success");
  }
});

$("#logout-button").addEventListener("click",async()=>{await client.auth.signOut()});

$("#article-form").addEventListener("submit",async e=>{
  e.preventDefault();
  try{await saveDraft()}catch(err){console.error(err);alert("Návrh sa nepodarilo uložiť: "+err.message);$("#draft-status").textContent="Chyba pri ukladaní"}
});

$("#new-draft").addEventListener("click",()=>{resetForm();window.scrollTo({top:0,behavior:"smooth"})});
$("#draft-search").addEventListener("input",renderDraftList);
["#title","#category","#intro","#what-happened","#what-it-means","#next-step","#sources","#seo-title","#meta-description"].forEach(id=>{
  $(id)?.addEventListener("input",()=>{
    workspaceDirty=true;
    updateLivePreview();
    scheduleWorkspaceSave();
    scheduleServerAutosave();
  });
});
$("#category")?.addEventListener("change",()=>{
  workspaceDirty=true;
  updateLivePreview();
  scheduleWorkspaceSave();
  scheduleServerAutosave(700);
});
$("#state")?.addEventListener("change",()=>{
  workspaceDirty=true;
  scheduleWorkspaceSave();
});
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden"){
    saveEditorWorkspace();
    scheduleServerAutosave(0);
  }
});
window.addEventListener("pagehide",()=>{
  saveEditorWorkspace();
  scheduleServerAutosave(0);
});
window.addEventListener("scroll",()=>scheduleWorkspaceSave(700),{passive:true});

$("#image-upload").addEventListener("change",async e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(f.size>20*1024*1024){alert("Obrázok je väčší ako 20 MB.");e.target.value="";return}
  $("#draft-status").textContent="Spracúvam obrázok…";
  try{
    currentImageData=await resizeImage(f);
    showPreview(currentImageData);updateLivePreview();
    workspaceDirty=true;
    scheduleWorkspaceSave();
    scheduleServerAutosave(500);
    $("#draft-status").textContent="Obrázok pripravený";
  }catch{
    alert("Obrázok sa nepodarilo načítať.");
    $("#draft-status").textContent="Nový návrh";
  }
});

$("#remove-image").addEventListener("click",()=>{currentImageData="";$("#image-upload").value="";hidePreview();updateLivePreview();workspaceDirty=true;scheduleWorkspaceSave();scheduleServerAutosave(500)});
$("#verify-sources")?.addEventListener("click",async()=>{try{await verifySourcesNow()}catch(err){console.error(err);alert("Overenie zdrojov sa nepodarilo uložiť: "+err.message);$("#draft-status").textContent="Chyba pri overení zdrojov"}});
$("#delete-draft").addEventListener("click",async()=>{try{await deleteDraft()}catch(err){console.error(err);alert("Návrh sa nepodarilo vymazať: "+err.message)}});
$("#export-draft").addEventListener("click",()=>{
  const d=readForm(),b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");
  a.href=u;a.download=(d.title||"objektiv24-navrh").toLocaleLowerCase("sk").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+".json";
  a.click();URL.revokeObjectURL(u);
});


async function isPubliclyVisible(id){
  try{
    const response=await fetch(
      SUPABASE_URL+"/rest/v1/drafts?id=eq."+encodeURIComponent(id)+"&state=eq.published&select=id",
      {
        headers:{
          apikey:SUPABASE_PUBLISHABLE_KEY,
          Authorization:"Bearer "+SUPABASE_PUBLISHABLE_KEY
        },
        cache:"no-store"
      }
    );
    if(!response.ok)return false;
    const rows=await response.json();
    return Array.isArray(rows)&&rows.some(row=>row.id===id);
  }catch{return false}
}

async function sendPublishedPush(saved){
  if(!saved?.id)return;
  const {data:row,error:rowError}=await client.from("drafts").select("id,title,intro,slug,push_sent_at").eq("id",saved.id).single();
  if(rowError)throw rowError;
  if(row.push_sent_at)return;

  const {data:{session}}=await client.auth.getSession();
  if(!session?.access_token)throw new Error("Chýba prihlásenie pre odoslanie upozornenia.");

  const articleUrl=row.slug
    ? "https://objektiv24.sk/clanky/"+encodeURIComponent(row.slug)+"/"
    : "https://objektiv24.sk/clanok.html?id="+encodeURIComponent(row.id);

  const response=await fetch(SUPABASE_URL+"/functions/v1/send-push-notification",{
    method:"POST",
    headers:{
      Authorization:"Bearer "+session.access_token,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      title:row.title,
      body:row.intro||"Na Objektív24 vyšiel nový článok.",
      url:articleUrl
    })
  });
  if(!response.ok)throw new Error("Push upozornenie sa nepodarilo odoslať: "+await response.text());

  const {error:markError}=await client.from("drafts").update({push_sent_at:new Date().toISOString()}).eq("id",row.id).is("push_sent_at",null);
  if(markError)throw markError;
}

async function publishCurrentDraft(){
  const title=$("#title").value.trim();
  const intro=$("#intro").value.trim();
  if(!title){alert("Pred publikovaním doplňte titulok.");return}
  if(!intro){alert("Pred publikovaním doplňte krátky úvod.");return}

  const button=$("#publish-draft");
  button.disabled=true;
  $("#draft-status").textContent="Publikujem…";
  try{
    $("#state").value="published";
    if(window.ensureAutomaticImageFallback) window.ensureAutomaticImageFallback();
    const saved=await saveDraft();
    if(window.requestEditorialImageGeneration){
      window.requestEditorialImageGeneration(saved.id,{mode:"auto",force:false,silent:true})
        .catch(error=>console.error("Automatické AI generovanie obrázka sa nepodarilo spustiť:",error));
    }
    const visible=await isPubliclyVisible(saved.id);
    if(visible){
      try{
        await sendPublishedPush(saved);
        $("#draft-status").textContent="Publikované · upozornenie odoslané";
        alert("Článok je publikovaný a push upozornenie bolo automaticky odoslané.");
      }catch(pushError){
        console.error(pushError);
        $("#draft-status").textContent="Publikované · push sa nepodaril";
        alert("Článok je publikovaný, ale push upozornenie sa nepodarilo odoslať: "+(pushError?.message||pushError));
      }
    }else{
      $("#draft-status").textContent="Vydané v databáze";
      alert("Článok je označený ako vydaný. Ešte treba jednorazovo povoliť verejné čítanie vydaných článkov v Supabase.");
    }
  }catch(err){
    console.error(err);
    alert("Publikovanie sa nepodarilo: "+(err?.message||err));
  }finally{
    button.disabled=false;
  }
}

$("#publish-draft").addEventListener("click",publishCurrentDraft);

async function finishAuthRedirect(){
  const url=new URL(window.location.href);
  const queryError=url.searchParams.get("error_description")||url.searchParams.get("error");
  if(queryError){
    authMessage("Prihlasovací odkaz nebolo možné použiť: "+decodeURIComponent(queryError),"error");
    return false;
  }

  // Implicit magic-link flow: Supabase returns tokens in the URL hash.
  if(location.hash){
    const hash=new URLSearchParams(location.hash.slice(1));
    const hashError=hash.get("error_description")||hash.get("error");
    if(hashError){
      authMessage("Prihlasovací odkaz nebolo možné použiť: "+decodeURIComponent(hashError),"error");
      return false;
    }

    const accessToken=hash.get("access_token");
    const refreshToken=hash.get("refresh_token");
    if(accessToken&&refreshToken){
      const {data,error}=await client.auth.setSession({
        access_token:accessToken,
        refresh_token:refreshToken
      });
      if(error){
        authMessage("Prihlasovací odkaz sa nepodarilo dokončiť: "+friendlyAuthError(error),"error");
        return false;
      }
      history.replaceState({},document.title,url.pathname+url.search);
      if(data?.session?.user){
        await showEditor(data.session.user);
        return true;
      }
    }
  }

  // PKCE/code flow fallback.
  const code=url.searchParams.get("code");
  if(code){
    const {data,error}=await client.auth.exchangeCodeForSession(code);
    if(error){
      authMessage("Prihlasovací odkaz sa nepodarilo dokončiť: "+friendlyAuthError(error),"error");
      return false;
    }
    url.searchParams.delete("code");
    url.searchParams.delete("sb_flow_id");
    history.replaceState({},document.title,url.pathname+url.search);
    if(data?.session?.user){
      await showEditor(data.session.user);
      return true;
    }
  }

  return false;
}

client.auth.onAuthStateChange(async(event,session)=>{
  if(session?.user){
    try{await showEditor(session.user)}catch(err){console.error(err);authMessage("Pri načítaní Redakcie nastala chyba: "+err.message,"error")}
  }else{
    showLogin();
  }
});

(async()=>{
  showLogin();
  const handled=await finishAuthRedirect();
  if(handled)return;
  const {data,error}=await client.auth.getSession();
  if(error){
    authMessage("Nepodarilo sa načítať prihlásenie: "+friendlyAuthError(error),"error");
    return;
  }
  if(data.session?.user)await showEditor(data.session.user);
})();