(() => {
  const bar=document.querySelector("[data-reading-progress]");
  const article=document.querySelector(".article-detail");
  if(!bar||!article)return;

  let ticking=false;
  function update(){
    const rect=article.getBoundingClientRect();
    const articleTop=window.scrollY+rect.top;
    const articleHeight=article.offsetHeight;
    const viewport=window.innerHeight||document.documentElement.clientHeight;
    const max=Math.max(1,articleHeight-viewport*0.35);
    const current=Math.min(max,Math.max(0,window.scrollY-articleTop+viewport*0.12));
    const progress=Math.min(1,Math.max(0,current/max));
    bar.style.transform="scaleX("+progress.toFixed(4)+")";
    ticking=false;
  }
  function request(){
    if(!ticking){
      requestAnimationFrame(update);
      ticking=true;
    }
  }
  addEventListener("scroll",request,{passive:true});
  addEventListener("resize",request,{passive:true});
  request();
})();