const STORAGE_KEY="objektiv24-redakcia-drafts-v2";
const $=s=>document.querySelector(s);
let drafts=[],currentImageData="";

function nowDate(){return new Intl.DateTimeFormat("sk-SK",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date())}
function loadLocalDrafts(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return[]}}
function saveLocalDrafts(){localStorage.setItem(STORAGE_KEY,JSON.stringify(drafts.filter(d=>!d.seed)))}

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

async function seedPublishedArticles(){
  try{
    const r=await fetch("data/articles.json",{cache:"no-store"});
    const a=await r.json();
    return a.map(x=>({
      id:"published-"+x.slug,seed:true,title:x.title,category:x.category,intro:x.summary,
      state:x.archived?"archived":"published",updated:x.verified,
      whatHappened:"",whatItMeans:"",nextStep:"",sources:x.url||"",image:x.image||"",imageName:""
    }))
  }catch{return[]}
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
    <button type="button" class="draft-card ${$("#draft-id").value===d.id?"is-active":""}" data-id="${d.id}">
      <span class="badge">${stateLabel(d)} · upraviteľný návrh</span>
      <h3>${escapeHtml(d.title||"Bez názvu")}</h3>
      <time>${escapeHtml(d.updated||"")}</time>
    </button>`).join("");
  document.querySelectorAll(".draft-card").forEach(b=>b.addEventListener("click",()=>selectDraft(b.dataset.id)));
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]));
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
  $("#draft-status").textContent=d.seed?"Otvorená kópia článku":"Uložený návrh";
  currentImageData=d.image||"";
  currentImageData?showPreview(currentImageData):hidePreview();
  $("#delete-draft").hidden=!!d.seed;
  updateLivePreview();
  renderDraftList();
  window.scrollTo({top:0,behavior:"smooth"});
}

function readForm(){
  const id=$("#draft-id").value;
  return{
    id:id||"draft-"+Date.now(),seed:false,title:$("#title").value.trim(),
    category:$("#category").value.trim(),intro:$("#intro").value.trim(),
    whatHappened:$("#what-happened").value.trim(),whatItMeans:$("#what-it-means").value.trim(),
    nextStep:$("#next-step").value.trim(),sources:$("#sources").value.trim(),
    state:$("#state").value,updated:nowDate(),image:currentImageData,imageName:""
  }
}

function showPreview(src){
  const r=$("#image-preview");r.hidden=false;r.querySelector("img").src=src;
}
function hidePreview(){
  const r=$("#image-preview");r.hidden=true;r.querySelector("img").removeAttribute("src");
}

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
  if(currentImageData){
    image.style.backgroundImage=`url("${currentImageData}")`;
    image.querySelector("span").textContent="";
  }else{
    image.style.backgroundImage="";
    image.querySelector("span").textContent="Náhľad obrázka";
  }

  $("#check-title").classList.toggle("ok",title.length>=8);
  $("#check-intro").classList.toggle("ok",intro.length>=30);
  $("#check-source").classList.toggle("ok",sources.length>=8);
  $("#check-body").classList.toggle("ok",body.length>=50);
}

async function resizeImage(file){
  const dataUrl=await new Promise((resolve,reject)=>{
    const r=new FileReader();r.onload=()=>resolve(String(r.result||""));r.onerror=reject;r.readAsDataURL(file);
  });
  const img=await new Promise((resolve,reject)=>{
    const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=dataUrl;
  });
  const maxW=1600,maxH=1200,scale=Math.min(1,maxW/img.width,maxH/img.height);
  const canvas=document.createElement("canvas");
  canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
  canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/jpeg",.82);
}

$("#article-form").addEventListener("submit",e=>{
  e.preventDefault();
  const d=readForm();if(!d.title)return;
  const i=drafts.findIndex(x=>x.id===d.id);
  if(i>=0&&drafts[i].seed){d.id="draft-"+Date.now();drafts.unshift(d)}
  else if(i>=0)drafts[i]=d;
  else drafts.unshift(d);
  saveLocalDrafts();
  $("#draft-id").value=d.id;
  $("#draft-status").textContent="Uložené "+new Date().toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"});
  $("#delete-draft").hidden=false;
  $(".editor-heading").classList.remove("save-flash");void $(".editor-heading").offsetWidth;$(".editor-heading").classList.add("save-flash");
  renderDraftList();
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

$("#remove-image").addEventListener("click",()=>{
  currentImageData="";$("#image-upload").value="";hidePreview();updateLivePreview();
});

$("#delete-draft").addEventListener("click",()=>{
  const id=$("#draft-id").value;
  const d=drafts.find(x=>x.id===id);
  if(!d||d.seed)return;
  if(!confirm("Naozaj chcete tento návrh vymazať?"))return;
  drafts=drafts.filter(x=>x.id!==id);saveLocalDrafts();resetForm();
});

$("#export-draft").addEventListener("click",()=>{
  const d=readForm(),b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"}),
    u=URL.createObjectURL(b),a=document.createElement("a");
  a.href=u;
  a.download=(d.title||"objektiv24-navrh").toLocaleLowerCase("sk").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+".json";
  a.click();URL.revokeObjectURL(u);
});

(async()=>{
  const [published,local]=await Promise.all([seedPublishedArticles(),Promise.resolve(loadLocalDrafts())]);
  drafts=[...local,...builtInDrafts,...published];
  renderDraftList();resetForm();
})();