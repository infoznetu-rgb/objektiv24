(() => {
  const URL='https://bkyappgttwjxakkwycub.supabase.co';
  const KEY='sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4';
  let byUrl=new Map(),byId=new Map(),scheduled=false;

  function absolute(url){try{return new URL(String(url||''),location.href).href}catch{return String(url||'')}}
  function host(url){try{return new URL(url).hostname.replace(/^www\./,'')}catch{return''}}
  function sourceName(row){
    const h=host(row.image_source_url||row.image_url||'');
    if(/wikimedia\.org$|wikimedia\.org\b|wikimedia\.org/.test(h)||/wikimedia/.test(h))return'Wikimedia Commons';
    if(h)return h;
    return'';
  }
  function shortLabel(row){
    let base='Ilustračná fotografia';
    if(row.image_type==='ai')base='Ilustračný obrázok · AI';
    else if(row.image_type==='own')base='Vlastná fotografia';
    else if(row.image_type==='official')base='Oficiálny obrázok';
    const src=sourceName(row);
    if(src&&row.image_type!=='ai'&&row.image_type!=='own')base+=' · '+src;
    return base;
  }
  function fullLabel(row){
    const parts=[shortLabel(row)];
    if(row.image_credit&&row.image_credit!=='Objektív24')parts.push(row.image_credit);
    if(row.image_license&&row.image_license!=='AI ilustrácia'&&row.image_license!=='Vlastná fotografia')parts.push(row.image_license);
    return parts.filter(Boolean).join(' · ');
  }
  function rowForImg(img){return byUrl.get(absolute(img.currentSrc||img.src||''))||null}
  function applyImg(img,row){
    if(!row)return;
    if(row.image_alt)img.alt=row.image_alt;
    if(row.image_position)img.style.objectPosition=row.image_position;
  }
  function setCaption(cap,row,detail=false){
    if(!cap||!row)return;
    cap.textContent=detail?fullLabel(row):shortLabel(row);
    if(detail&&row.image_source_url){
      cap.append(document.createTextNode(' · '));
      const a=document.createElement('a');a.href=row.image_source_url;a.target='_blank';a.rel='noopener';a.textContent='zdroj ↗';a.style.color='inherit';cap.appendChild(a);
    }
  }
  function apply(){
    scheduled=false;
    document.querySelectorAll('img').forEach(img=>{
      const row=rowForImg(img);if(!row)return;applyImg(img,row);
      const card=img.closest('.article-image-wrap');if(card)setCaption(card.querySelector('.article-photo-label'),row,false);
      const hero=img.closest('.hero-photo');if(hero)setCaption(hero.querySelector('figcaption'),row,false);
    });
    const id=new URLSearchParams(location.search).get('id');
    const row=id?byId.get(id):null;
    if(row){
      const figure=document.querySelector('.article-detail-image');
      if(figure){const img=figure.querySelector('img');if(img)applyImg(img,row);setCaption(figure.querySelector('figcaption'),row,true)}
    }
  }
  function schedule(){if(scheduled)return;scheduled=true;setTimeout(apply,40)}
  async function load(){
    try{
      const select='id,image_url,image_type,image_alt,image_source_url,image_credit,image_license,image_position';
      const r=await fetch(`${URL}/rest/v1/drafts?state=eq.published&select=${encodeURIComponent(select)}`,{headers:{apikey:KEY,Authorization:'Bearer '+KEY},cache:'no-store'});
      if(!r.ok)return;
      const rows=await r.json();
      (Array.isArray(rows)?rows:[]).forEach(row=>{if(row.image_url)byUrl.set(absolute(row.image_url),row);if(row.id)byId.set(String(row.id),row)});
      apply();
      new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','style']});
    }catch(error){console.warn('Metadáta obrázkov sa nepodarilo načítať',error)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
