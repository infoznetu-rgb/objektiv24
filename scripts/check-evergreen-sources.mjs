import crypto from "node:crypto";

const CHECK_URL="https://bkyappgttwjxakkwycub.supabase.co/functions/v1/github-evergreen-check";
const AUDIENCE="objektiv24-evergreen-check";
const USER_AGENT="Objektiv24EvergreenCheck/1.0 (+https://objektiv24.sk/ako-pracujeme.html)";

async function oidcToken(){
  const url=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const token=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!url||!token)throw new Error("GitHub OIDC environment is unavailable");
  const sep=url.includes("?")?"&":"?";
  const r=await fetch(url+sep+"audience="+encodeURIComponent(AUDIENCE),{
    headers:{Authorization:"Bearer "+token}
  });
  if(!r.ok)throw new Error("OIDC token request failed: "+r.status+" "+await r.text());
  const data=await r.json();
  if(!data.value)throw new Error("OIDC response did not contain a token");
  return data.value;
}

async function api(token,payload){
  const r=await fetch(CHECK_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify(payload)
  });
  const text=await r.text();
  let data;
  try{data=JSON.parse(text)}catch{data={error:text}}
  if(!r.ok)throw new Error("Evergreen API HTTP "+r.status+": "+JSON.stringify(data));
  return data;
}

function decodeEntities(s=""){
  return s
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
}

function readableText(html=""){
  let s=String(html).slice(0,3_000_000)
    .replace(/<!--([\s\S]*?)-->/g," ")
    .replace(/<script\b[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[\s\S]*?<\/style>/gi," ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi," ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi," ")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi," ")
    .replace(/<header\b[\s\S]*?<\/header>/gi," ")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi," ")
    .replace(/<aside\b[\s\S]*?<\/aside>/gi," ")
    .replace(/<form\b[\s\S]*?<\/form>/gi," ")
    .replace(/<(br|p|div|section|article|li|h1|h2|h3|h4|tr|td|th)\b[^>]*>/gi,"\n")
    .replace(/<[^>]+>/g," ");
  return decodeEntities(s).replace(/\s+/g," ").trim();
}

function normalizedWords(text=""){
  return text.toLocaleLowerCase("sk")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g," ")
    .trim().split(/\s+/).filter(Boolean);
}

function fnv1a(str){
  let h=0x811c9dc5;
  for(let i=0;i<str.length;i++){
    h^=str.charCodeAt(i);
    h=Math.imul(h,0x01000193)>>>0;
  }
  return h>>>0;
}

function fingerprint(text){
  const words=normalizedWords(text);
  if(words.length<35)throw new Error("too little readable content ("+words.length+" words)");
  const hashes=new Set();
  const width=4;
  for(let i=0;i<=words.length-width;i++){
    hashes.add(fnv1a(words.slice(i,i+width).join(" ")));
  }
  const shingles=[...hashes].sort((a,b)=>a-b).slice(0,2500);
  const normalized=words.join(" ");
  return {
    hash:crypto.createHash("sha256").update(normalized).digest("hex"),
    word_count:words.length,
    shingles
  };
}

function canonical(raw=""){
  try{
    const u=new URL(raw);
    u.hash="";
    u.hostname=u.hostname.toLowerCase().replace(/^www\./,"");
    if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,"");
    return u.toString();
  }catch{return String(raw)}
}

function similarity(a=[],b=[]){
  if(!a.length||!b.length)return 0;
  const small=a.length<=b.length?a:b;
  const large=new Set(a.length<=b.length?b:a);
  let common=0;
  for(const x of small)if(large.has(x))common++;
  return common/Math.max(1,small.length);
}

async function fetchSnapshot(url){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),25000);
  const checkedAt=new Date().toISOString();
  try{
    const r=await fetch(url,{
      redirect:"follow",
      signal:ctrl.signal,
      headers:{
        "User-Agent":USER_AGENT,
        "Accept":"text/html,application/xhtml+xml,text/plain,application/xml;q=0.8,*/*;q=0.5",
        "Accept-Language":"sk,en;q=0.7"
      }
    });
    if(!r.ok)throw new Error("HTTP "+r.status);
    const raw=await r.text();
    const fp=fingerprint(readableText(raw));
    return {
      url,
      final_url:r.url||url,
      status:"ok",
      http_status:r.status,
      hash:fp.hash,
      word_count:fp.word_count,
      shingles:fp.shingles,
      checked_at:checkedAt,
      error:""
    };
  }catch(error){
    return {
      url,
      final_url:url,
      status:"error",
      http_status:null,
      hash:"",
      word_count:0,
      shingles:[],
      checked_at:checkedAt,
      error:String(error?.message||error).slice(0,300)
    };
  }finally{
    clearTimeout(timer);
  }
}

function newer(a,b){
  const aa=Date.parse(String(a||""));
  const bb=Date.parse(String(b||""));
  return Number.isFinite(aa)&&Number.isFinite(bb)&&aa>bb;
}

async function checkReview(token,review){
  const urls=Array.isArray(review.source_urls)?review.source_urls.map(String):[];
  if(!urls.length){
    console.log("SKIP",review.guide_slug,"no source URLs");
    return;
  }

  const baselineRows=Array.isArray(review.source_snapshots)?review.source_snapshots:[];
  const baseline=new Map(baselineRows.map(x=>[canonical(String(x.url||"")),x]));
  const baselineMissing=urls.some(url=>!baseline.has(canonical(url)));
  const resolvedAccepted=review.status==="ok"&&review.detected_at&&review.resolved_at&&newer(review.resolved_at,review.detected_at);

  const snapshots=[];
  for(const url of urls){
    snapshots.push(await fetchSnapshot(url));
  }

  const checked=[];
  const changed=[];
  const errors=[];

  for(const current of snapshots){
    if(current.status!=="ok"){
      errors.push(current);
      checked.push({
        url:current.url,
        status:"error",
        note:"Zdroj sa nepodarilo načítať: "+current.error,
        http_status:current.http_status
      });
      continue;
    }

    const previous=baseline.get(canonical(current.url));
    if(!previous||resolvedAccepted){
      checked.push({
        url:current.url,
        status:"ok",
        note:resolvedAccepted
          ?"Zdroj je dostupný; po redakčnom potvrdení sa prijíma nový kontrolný odtlačok."
          :"Zdroj je dostupný; vytvára sa prvý kontrolný odtlačok.",
        http_status:current.http_status
      });
      continue;
    }

    if(previous.status!=="ok"||!Array.isArray(previous.shingles)||!previous.shingles.length){
      checked.push({
        url:current.url,
        status:"ok",
        note:"Zdroj je dostupný; obnovuje sa chýbajúci kontrolný odtlačok.",
        http_status:current.http_status
      });
      continue;
    }

    const sim=current.hash===previous.hash?1:similarity(current.shingles,previous.shingles);
    const oldWords=Math.max(1,Number(previous.word_count)||1);
    const ratio=current.word_count/oldWords;
    const delta=Math.abs(current.word_count-oldWords);
    const meaningful=current.hash!==previous.hash&&(
      (sim<0.82&&delta>=40)||
      ratio<0.72||
      ratio>1.38
    );

    if(meaningful){
      changed.push({url:current.url,similarity:sim,ratio});
      checked.push({
        url:current.url,
        status:"changed",
        note:"Obsah sa výraznejšie zmenil oproti schválenému stavu (podobnosť "+Math.round(sim*100)+" %).",
        http_status:current.http_status
      });
    }else{
      checked.push({
        url:current.url,
        status:"ok",
        note:current.hash===previous.hash
          ?"Zdroj je dostupný a obsahový odtlačok sa nezmenil."
          :"Zdroj je dostupný; zistená zmena neprekročila prah pre redakčnú kontrolu.",
        http_status:current.http_status
      });
    }
  }

  let status="ok";
  let consecutiveErrors=0;
  let changeSummary="";
  let recommendedAction="";
  let acceptBaseline=false;

  if(errors.length){
    consecutiveErrors=Math.min(100,(Number(review.consecutive_errors)||0)+1);
    status=consecutiveErrors>=2?"error":"checking";
    changeSummary=errors.length+" z "+urls.length+" oficiálnych zdrojov sa nepodarilo načítať.";
    recommendedAction=consecutiveErrors>=2
      ?"Skontrolovať nedostupné oficiálne zdroje. Návod nemeníť bez náhradného oficiálneho potvrdenia."
      :"Počkať na nasledujúcu automatickú kontrolu; môže ísť o dočasný výpadok zdroja.";
  }else if(changed.length){
    status="needs_update";
    consecutiveErrors=0;
    changeSummary=changed.map(x=>{
      let host=x.url;
      try{host=new URL(x.url).hostname.replace(/^www\./,"")}catch{}
      return host+" (podobnosť "+Math.round(x.similarity*100)+" %)";
    }).join(", ");
    recommendedAction="Porovnať zmenený oficiálny zdroj s návodom. Aktualizovať iba fakty, termíny alebo postupy, ktoré sa reálne zmenili.";
  }else{
    status="ok";
    consecutiveErrors=0;
    acceptBaseline=baselineMissing||resolvedAccepted||baselineRows.length!==urls.length;
  }

  const result=await api(token,{
    action:"update",
    guide_slug:review.guide_slug,
    status,
    snapshots,
    checked_sources:checked,
    change_summary:changeSummary,
    recommended_action:recommendedAction,
    consecutive_errors:consecutiveErrors,
    accept_baseline:acceptBaseline
  });

  console.log(
    String(review.guide_slug).padEnd(62),
    "=>",result.review?.status||status,
    "| sources",urls.length,
    "| changed",changed.length,
    "| errors",errors.length,
    acceptBaseline?"| baseline accepted":""
  );
}

const token=await oidcToken();
const state=await api(token,{action:"status"});
const reviews=Array.isArray(state.reviews)?state.reviews:[];
if(!reviews.length)throw new Error("Evergreen review queue is empty");

console.log("Objektív24 evergreen source check:",reviews.length,"guides");
for(const review of reviews){
  await checkReview(token,review);
}
console.log("Evergreen source check completed.");
