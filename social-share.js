(() => {
  if(window.__objektiv24ShareLoaded)return;
  window.__objektiv24ShareLoaded=true;

  const isArticle=/^\/clanky\/[^/]+\/?$/i.test(location.pathname)||/\/clanok\.html$/i.test(location.pathname);
  const isHome=/^\/(?:index\.html)?$/i.test(location.pathname);

  const icons={
    share:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16a3 3 0 0 0-2.4 1.2L8.9 13.8a3.3 3.3 0 0 0 0-3.6l6.7-3.4A3 3 0 1 0 15 5a3 3 0 0 0 .1.7L8.4 9.1A3 3 0 1 0 8.4 15l6.7 3.4A3 3 0 1 0 18 16Z"/></svg>',
    facebook:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.95.93-1.95 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"/></svg>',
    x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.24 2H21l-6.03 6.9L22 22h-5.5l-4.3-5.62L7.28 22H4.5l6.4-7.32L4.16 2h5.64l3.89 5.14L18.24 2Zm-.97 17.7h1.53L8.97 4.18H7.33L17.27 19.7Z"/></svg>',
    whatsapp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2A9.84 9.84 0 0 0 3.6 16.9L2 22l5.23-1.54A9.96 9.96 0 1 0 12.04 2Zm0 17.92a8.1 8.1 0 0 1-4.12-1.13l-.3-.18-3.1.91.93-3.02-.2-.31A8.04 8.04 0 1 1 12.04 19.92Zm4.44-6.05c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.09 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"/></svg>',
    telegram:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.65 2.35a1.1 1.1 0 0 0-1.13-.18L2.91 8.96c-.7.27-.68 1.26.03 1.5l4.48 1.49 1.74 5.42c.2.63 1.02.8 1.45.3l2.5-2.88 4.59 3.38c.53.39 1.28.1 1.42-.54l3.05-14.18a1.1 1.1 0 0 0-.52-1.1ZM9.25 11.23l8.77-5.5-6.95 6.58-.52 2.86-1.3-3.94Z"/></svg>',
    linkedin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.49 2.49 0 1 1 0 4.98 2.49 2.49 0 0 1 0-4.98ZM2.84 9.98h4.28V23H2.84V9.98Zm6.95 0h4.1v1.78h.06c.57-1.08 1.97-2.22 4.05-2.22 4.33 0 5.13 2.85 5.13 6.56V23h-4.27v-6.12c0-1.46-.03-3.34-2.04-3.34-2.04 0-2.35 1.59-2.35 3.23V23H9.79V9.98Z"/></svg>',
    reddit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3.2 13.7 7c2.1.18 3.98.8 5.34 1.73a2.3 2.3 0 1 1 1.06 4.35c.03.2.05.4.05.62 0 3.72-3.65 6.74-8.15 6.74s-8.15-3.02-8.15-6.74c0-.2.01-.4.04-.6A2.3 2.3 0 1 1 5 8.74C6.54 7.7 8.72 7.05 11.1 7l1.1-5.1 4.2.9a1.85 1.85 0 1 1-.3 1.36l-1.6-.96ZM8.75 12.1a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm6.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm-6.2 4.05c.73.72 1.76 1.08 2.95 1.08 1.2 0 2.22-.36 2.95-1.08l-.88-.88c-.48.47-1.18.72-2.07.72-.88 0-1.59-.25-2.07-.72l-.88.88Z"/></svg>',
    bluesky:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 10.8c-.72-1.4-2.7-4.03-4.54-5.32C5.7 4.25 5.03 4.46 4.6 4.65 4.1 4.87 4 5.64 4 6.08c0 .45.25 3.64.41 4.18.55 1.83 2.5 2.45 4.3 2.25-3.13.47-5.9 1.63-2.26 5.68 4 4.14 5.48-.89 5.55-1.18.07.29 1.55 5.32 5.55 1.18 3.64-4.05.87-5.21-2.26-5.68 1.8.2 3.75-.42 4.3-2.25.16-.54.41-3.73.41-4.18 0-.44-.1-1.21-.6-1.43-.43-.19-1.1-.4-2.86.83C14.7 6.77 12.72 9.4 12 10.8Z"/></svg>',
    email:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 3.1V18h18V7.1l-8.4 6.03a1 1 0 0 1-1.2 0L3 7.1Zm1.52-1.1L12 11.36 19.48 6H4.52Z"/></svg>',
    copy:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2h11a3 3 0 0 1 3 3v11h-2V5a1 1 0 0 0-1-1H8V2Zm-3 4h11a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5Z"/></svg>'
  };

  const track=name=>{try{window.objektiv24Track?.('share_'+name)}catch{}};
  const currentUrl=()=>document.querySelector('link[rel="canonical"]')?.href||location.href;
  const currentTitle=()=>{
    if(isArticle)return document.querySelector('.article-detail-header h1')?.textContent?.trim()||document.title.replace(/\s*\|\s*Objektív24.*$/,'');
    return 'Objektív24 — Fakty. Kontext. Ľudia.';
  };
  const shareText=()=>isArticle?currentTitle():'Objektív24 — aktuálne správy v súvislostiach.';

  function openShare(url,name){
    track(name);
    window.open(url,'_blank','noopener,noreferrer,width=760,height=680');
  }
  async function copyLink(button){
    const url=currentUrl();
    try{
      await navigator.clipboard.writeText(url);
    }catch{
      const ta=document.createElement('textarea');
      ta.value=url;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
    }
    track('copy');
    const label=button.querySelector('span:last-child');
    const old=label.textContent;
    label.textContent='Skopírované';
    button.classList.add('is-done');
    setTimeout(()=>{label.textContent=old;button.classList.remove('is-done')},1800);
  }
  async function nativeShare(){
    const data={title:currentTitle(),text:shareText(),url:currentUrl()};
    track('native');
    if(navigator.share){
      try{await navigator.share(data);return}catch(e){if(e?.name==='AbortError')return}
    }
    await copyLink(document.querySelector('.share-native'));
  }

  function panel(kind){
    const home=kind==='home';
    const el=document.createElement('section');
    el.className='social-share '+(home?'social-share-home':'social-share-article');
    el.setAttribute('aria-label',home?'Zdieľajte Objektív24':'Zdieľajte článok');
    el.innerHTML=`
      <div class="social-share-copy">
        <span class="social-share-kicker">ZDIEĽAŤ</span>
        <strong>${home?'Zdieľajte Objektív24':'Pošlite článok ďalej'}</strong>
        <small>${home?'Pomôžte dostať užitočné správy k ďalším ľuďom.':'Jedným klikom cez sociálnu sieť alebo správu.'}</small>
      </div>
      <div class="social-share-buttons" role="group" aria-label="Možnosti zdieľania">
        <button type="button" class="share-chip share-native" data-share="native" title="Zdieľať cez aplikácie v zariadení">${icons.share}<span>Zdieľať</span></button>
        <button type="button" class="share-chip" data-share="facebook" title="Facebook">${icons.facebook}<span>Facebook</span></button>
        <button type="button" class="share-chip" data-share="x" title="X">${icons.x}<span>X</span></button>
        <button type="button" class="share-chip" data-share="whatsapp" title="WhatsApp">${icons.whatsapp}<span>WhatsApp</span></button>
        <button type="button" class="share-chip" data-share="telegram" title="Telegram">${icons.telegram}<span>Telegram</span></button>
        <button type="button" class="share-chip" data-share="linkedin" title="LinkedIn">${icons.linkedin}<span>LinkedIn</span></button>
        <button type="button" class="share-chip" data-share="bluesky" title="Bluesky">${icons.bluesky}<span>Bluesky</span></button>
        <button type="button" class="share-chip" data-share="reddit" title="Reddit">${icons.reddit}<span>Reddit</span></button>
        <button type="button" class="share-chip" data-share="email" title="E-mail">${icons.email}<span>E-mail</span></button>
        <button type="button" class="share-chip" data-share="copy" title="Kopírovať odkaz">${icons.copy}<span>Kopírovať</span></button>
      </div>
      <p class="social-share-more">V aplikácii tlačidlo <b>Zdieľať</b> otvorí aj Messenger, Instagram, Viber a ďalšie aplikácie nainštalované v zariadení.</p>
    `;

    el.addEventListener('click',async e=>{
      const b=e.target.closest('[data-share]');
      if(!b)return;
      const type=b.dataset.share,url=encodeURIComponent(currentUrl()),text=encodeURIComponent(shareText()),title=encodeURIComponent(currentTitle());
      if(type==='native'){await nativeShare();return}
      if(type==='copy'){await copyLink(b);return}
      if(type==='email'){track('email');location.href='mailto:?subject='+title+'&body='+text+'%0A%0A'+url;return}
      const targets={
        facebook:'https://www.facebook.com/sharer/sharer.php?u='+url,
        x:'https://twitter.com/intent/tweet?text='+text+'&url='+url,
        whatsapp:'https://wa.me/?text='+text+'%20'+url,
        telegram:'https://t.me/share/url?url='+url+'&text='+text,
        linkedin:'https://www.linkedin.com/sharing/share-offsite/?url='+url,
        bluesky:'https://bsky.app/intent/compose?text='+text+'%20'+url,
        reddit:'https://www.reddit.com/submit?url='+url+'&title='+title
      };
      if(targets[type])openShare(targets[type],type);
    });
    return el;
  }

  const style=document.createElement('style');
  style.textContent=`
    .social-share{
      position:relative;
      overflow:hidden;
      display:grid;
      grid-template-columns:minmax(220px,.75fr) minmax(0,2.1fr);
      gap:22px 30px;
      align-items:center;
      margin:24px auto;
      padding:22px 24px;
      border:1px solid rgba(217,255,40,.28);
      border-radius:22px;
      background:
        radial-gradient(circle at 3% 50%,rgba(217,255,40,.09),transparent 30%),
        linear-gradient(110deg,rgba(10,28,22,.92),rgba(7,18,25,.94));
      box-shadow:inset 0 1px rgba(255,255,255,.035),0 16px 42px rgba(0,0,0,.17);
    }
    .social-share-copy{min-width:0}
    .social-share-kicker{
      display:block;
      margin-bottom:5px;
      color:#d9ff28;
      font-size:.68rem;
      font-weight:950;
      letter-spacing:.14em;
    }
    .social-share-copy strong{
      display:block;
      color:#f7fafb;
      font-size:1.25rem;
      line-height:1.1;
      letter-spacing:-.025em;
    }
    .social-share-copy small{
      display:block;
      margin-top:6px;
      color:#8fa0aa;
      font-size:.76rem;
      line-height:1.4;
    }
    .social-share-buttons{
      min-width:0;
      display:flex;
      align-items:center;
      gap:8px;
      overflow-x:auto;
      padding:3px 2px 7px;
      scrollbar-width:thin;
    }
    .share-chip{
      flex:0 0 auto;
      min-width:68px;
      min-height:66px;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:6px;
      border:1px solid rgba(255,255,255,.09);
      border-radius:14px;
      background:rgba(255,255,255,.028);
      color:#c8d2d7;
      padding:8px 9px;
      font:800 .61rem/1 Inter,ui-sans-serif,system-ui;
      cursor:pointer;
      transition:transform .2s ease,border-color .2s ease,background .2s ease,color .2s ease;
    }
    .share-chip svg{width:23px;height:23px;fill:currentColor}
    .share-chip:hover,.share-chip:focus-visible{
      transform:translateY(-2px);
      border-color:rgba(217,255,40,.45);
      color:#d9ff28;
      background:rgba(217,255,40,.055);
      outline:0;
    }
    .share-chip.is-done{color:#071019;background:#d9ff28;border-color:#d9ff28}
    .share-native{
      min-width:82px;
      color:#071019;
      background:#d9ff28;
      border-color:#d9ff28;
    }
    .share-native:hover,.share-native:focus-visible{color:#071019;background:#e2ff58}
    .social-share-more{
      grid-column:1/-1;
      margin:-8px 0 0;
      color:#71838d;
      font-size:.67rem;
      line-height:1.35;
    }
    .social-share-more b{color:#9eafb7}
    .social-share-home{width:min(var(--max,1380px),calc(100% - 48px));margin-top:22px;margin-bottom:0}
    .social-share-article{margin-top:24px;margin-bottom:28px}
    html.redakcia-app .social-share{display:none!important}
    @media(max-width:850px){
      .social-share{grid-template-columns:1fr;padding:18px;gap:14px}
      .social-share-buttons{margin-inline:-3px}
      .social-share-more{margin-top:-3px}
    }
    @media(max-width:680px){
      .social-share-home{width:calc(100% - 22px);margin-top:14px}
      .social-share{border-radius:18px;padding:15px 14px}
      .social-share-copy strong{font-size:1.05rem}
      .social-share-copy small{font-size:.7rem}
      .share-chip{min-width:62px;min-height:61px;font-size:.57rem}
      .share-chip svg{width:21px;height:21px}
      .share-native{min-width:76px}
      .social-share-more{font-size:.61rem}
    }
    @media(prefers-reduced-motion:reduce){.share-chip{transition:none}}
  `;
  document.head.appendChild(style);

  function installHome(){
    if(!isHome||document.querySelector('.social-share-home'))return;
    const anchor=document.querySelector('.topic-rail')||document.querySelector('.breaking');
    if(anchor)anchor.insertAdjacentElement('afterend',panel('home'));
  }

  function installArticle(){
    if(!isArticle||document.querySelector('.social-share-article'))return true;
    const header=document.querySelector('#article-detail .article-detail-header');
    if(!header)return false;
    header.insertAdjacentElement('afterend',panel('article'));
    return true;
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{installHome();installArticle()},{once:true});
  }else{
    installHome();installArticle();
  }

  if(isArticle&&!document.querySelector('.social-share-article')){
    const root=document.querySelector('#article-detail');
    if(root){
      const observer=new MutationObserver(()=>{if(installArticle())observer.disconnect()});
      observer.observe(root,{childList:true,subtree:true});
      setTimeout(()=>observer.disconnect(),15000);
    }
  }
})();