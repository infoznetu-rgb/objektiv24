(() => {
  const bar=document.querySelector("[data-reading-progress]");
  const article=document.querySelector(".article-detail");
  if(!bar||!article)return;

  const reached=new Set();
  let ticking=false;
  let interacted=false;

  function trackMilestones(progress){
    if(!interacted)return;
    const checks=[
      [0.25,"read_25"],
      [0.50,"read_50"],
      [0.75,"read_75"],
      [0.98,"read_100"]
    ];
    for(const [limit,event] of checks){
      if(progress>=limit&&!reached.has(event)){
        reached.add(event);
        window.objektiv24Track?.(event);
      }
    }
  }

  function update(){
    const rect=article.getBoundingClientRect();
    const articleTop=window.scrollY+rect.top;
    const articleHeight=article.offsetHeight;
    const viewport=window.innerHeight||document.documentElement.clientHeight;
    const max=Math.max(1,articleHeight-viewport*0.35);
    const current=Math.min(max,Math.max(0,window.scrollY-articleTop+viewport*0.12));
    const progress=Math.min(1,Math.max(0,current/max));
    bar.style.transform="scaleX("+progress.toFixed(4)+")";
    trackMilestones(progress);
    ticking=false;
  }

  function request(){
    if(!ticking){
      requestAnimationFrame(update);
      ticking=true;
    }
  }

  addEventListener("scroll",()=>{
    interacted=true;
    request();
  },{passive:true});
  addEventListener("resize",request,{passive:true});

  document.addEventListener("click",event=>{
    const related=event.target.closest(".article-related a");
    if(related){
      const match=related.getAttribute("href")?.match(/\/clanky\/([^/]+)\/?/i);
      window.objektiv24Track?.("related_click",match?decodeURIComponent(match[1]):null);
      return;
    }
    const next=event.target.closest(".article-next a");
    if(next){
      const match=next.getAttribute("href")?.match(/\/clanky\/([^/]+)\/?/i);
      window.objektiv24Track?.("next_article_click",match?decodeURIComponent(match[1]):null);
    }
  });

  request();
})();