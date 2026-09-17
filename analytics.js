(() => {
  const URL='https://bkyappgttwjxakkwycub.supabase.co';
  const KEY='sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4';
  const k='objektiv24_visitor_id';
  let id=localStorage.getItem(k);
  if(!id){id=crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem(k,id)}
  const q=new URLSearchParams(location.search);
  let ref='';try{ref=document.referrer?new URL(document.referrer).hostname:''}catch{}
  function send(eventType){return fetch(URL+'/rest/v1/site_events',{method:'POST',keepalive:true,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({path:location.pathname+location.search,article_slug:q.get('slug')||null,referrer:ref,visitor_id:id,event_type:eventType})}).catch(()=>{})}
  window.objektiv24Track=send;
  send('page_view');
})();
