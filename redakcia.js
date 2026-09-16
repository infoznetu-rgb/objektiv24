const SUPABASE_URL="https://bkyappgttwjxakkwycub.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const LEGACY_STORAGE_KEY="objektiv24-redakcia-drafts-v2";
const $=s=>document.querySelector(s);
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

let drafts=[];
let publishedDrafts=[];
let currentImageData="";
let currentUser=null;

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

async function seedPublishedArticles(){
  try{
    const r=await fetch("data/articles.json",{cache:"no-store"});
    const a=await r.json();
    return a.map(x=>({
      id:"published-"+x.slug,seed:true,title:x.title,category:x.category,intro:x.summary,
      state:x.archived?"archived":"published",updated:x.verified,
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
    updated:row.updated_at?new Intl.DateTimeFormat("sk-SK",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(row.updated_at)):"",
    title:row.title||"",
    category:row.category||"",
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
    category:draft.category||"Slovensko v súvislostiach",
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
  $("#article-form").reset();
  $("#draft-id").value="";
  $("#category").value="Slovensko v súvislostiach";
  $("#draft-status").textContent="Nový návrh";
  currentImageData="";
  hidePreview();
  $("#delete-draft").hidden=true;
  updateLivePreview();
  renderDraftList();
}

function selectDraft(id){
  const d=drafts.find(x=>x.id===id);if(!d)return;
  $("#draft-id").value=d.id;
  $("#title").value=d.title||"";
  $("#category").value=d.category||"";
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
  window.scrollTo({top:0,behavior:"smooth"});
}

function readForm(){
  return {
    id:$("#draft-id").value||"",
    seed:false,
    title:$("#title").value.trim(),
    category:$("#category").value.trim(),
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
  await refreshDrafts();
  selectDraft(saved.id);
  $("#draft-status").textContent="Uložené "+new Date().toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"});
  $(".editor-heading").classList.remove("save-flash");void $(".editor-heading").offsetWidth;$(".editor-heading").classList.add("save-flash");
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
  resetForm();
}

async function showEditor(user){
  currentUser=user;
  $("#auth-gate").hidden=true;
  $("#editor-shell").hidden=false;
  $("#session-user").hidden=false;
  $("#session-user").textContent=user.email||"Prihlásený používateľ";
  $("#logout-button").hidden=false;
  await refreshDrafts();
  resetForm();
}

function showLogin(){
  currentUser=null;
  $("#auth-gate").hidden=false;
  $("#editor-shell").hidden=true;
  $("#session-user").hidden=true;
  $("#logout-button").hidden=true;
}

$("#login-form").addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("#login-email").value.trim();
  const password=$("#login-password").value;
  if(!password){authMessage("Zadajte heslo alebo použite prihlasovací odkaz.","error");return}
  authMessage("Prihlasujem…");
  const {error}=await client.auth.signInWithPassword({email,password});
  if(error)authMessage(friendlyAuthError(error),"error");
});

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

$("#magic-link-button").addEventListener("click",async()=>{
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

$("#new-draft").addEventListener("click",resetForm);
$("#draft-search").addEventListener("input",renderDraftList);
["#title","#category","#intro","#what-happened","#what-it-means","#next-step","#sources"].forEach(id=>$(id).addEventListener("input",updateLivePreview));

$("#image-upload").addEventListener("change",async e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(f.size>20*1024*1024){alert("Obrázok je väčší ako 20 MB.");e.target.value="";return}
  $("#draft-status").textContent="Spracúvam obrázok…";
  try{
    currentImageData=await resizeImage(f);
    showPreview(currentImageData);updateLivePreview();
    $("#draft-status").textContent="Obrázok pripravený";
  }catch{
    alert("Obrázok sa nepodarilo načítať.");
    $("#draft-status").textContent="Nový návrh";
  }
});

$("#remove-image").addEventListener("click",()=>{currentImageData="";$("#image-upload").value="";hidePreview();updateLivePreview()});
$("#delete-draft").addEventListener("click",async()=>{try{await deleteDraft()}catch(err){console.error(err);alert("Návrh sa nepodarilo vymazať: "+err.message)}});
$("#export-draft").addEventListener("click",()=>{
  const d=readForm(),b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");
  a.href=u;a.download=(d.title||"objektiv24-navrh").toLocaleLowerCase("sk").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+".json";
  a.click();URL.revokeObjectURL(u);
});

client.auth.onAuthStateChange(async(event,session)=>{
  if(session?.user){
    try{await showEditor(session.user)}catch(err){console.error(err);authMessage("Pri načítaní Redakcie nastala chyba: "+err.message,"error")}
  }else{
    showLogin();
  }
});

(async()=>{
  const {data}=await client.auth.getSession();
  if(data.session?.user)await showEditor(data.session.user);
  else showLogin();
})();