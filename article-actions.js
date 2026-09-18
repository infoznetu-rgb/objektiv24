(() => {
  const shareButton=document.querySelector("[data-article-share]");
  const copyButton=document.querySelector("[data-article-copy]");
  const status=document.querySelector("#article-share-status");
  if(!shareButton&&!copyButton)return;

  const canonical=()=>document.querySelector('link[rel="canonical"]')?.href||location.href;
  const title=()=>document.querySelector("h1")?.textContent?.trim()||document.title.replace(/\s*\|\s*Objektív24\s*$/,"");
  const description=()=>document.querySelector('meta[name="description"]')?.content||"";

  function announce(message){
    if(!status)return;
    status.textContent=message;
    clearTimeout(announce.timer);
    announce.timer=setTimeout(()=>{status.textContent=""},2500);
  }

  async function copyUrl(){
    const url=canonical();
    try{
      if(navigator.clipboard&&window.isSecureContext){
        await navigator.clipboard.writeText(url);
      }else{
        const area=document.createElement("textarea");
        area.value=url;
        area.setAttribute("readonly","");
        area.style.position="fixed";
        area.style.opacity="0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      announce("Odkaz bol skopírovaný.");
      if(copyButton){
        const old=copyButton.textContent;
        copyButton.textContent="✓ Skopírované";
        setTimeout(()=>{copyButton.textContent=old},1800);
      }
      return true;
    }catch{
      announce("Odkaz sa nepodarilo skopírovať.");
      return false;
    }
  }

  shareButton?.addEventListener("click",async()=>{
    if(navigator.share){
      try{
        await navigator.share({title:title(),text:description(),url:canonical()});
        announce("Zdieľanie otvorené.");
      }catch(error){
        if(error?.name!=="AbortError")await copyUrl();
      }
    }else{
      await copyUrl();
    }
  });

  copyButton?.addEventListener("click",copyUrl);
})();