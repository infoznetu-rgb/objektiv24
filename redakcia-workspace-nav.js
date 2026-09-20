(() => {
  const $ = s => document.querySelector(s);
  const editor = $('#editor-shell');
  const main = $('.editor-main');
  if (!editor || !main) return;

  const style = document.createElement('style');
  style.id = 'editor-quicknav-style';
  style.textContent = `
    .editor-quicknav{position:fixed;right:18px;top:96px;width:190px;z-index:45;border:1px solid #dfe2e6;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);box-shadow:0 12px 36px rgba(20,25,32,.08);border-radius:14px;padding:12px;max-height:calc(100vh - 112px);overflow:auto}
    .editor-focusnav{position:fixed;right:220px;top:96px;width:154px;z-index:44;border:1px solid #dfe2e6;background:rgba(255,255,255,.97);backdrop-filter:blur(12px);box-shadow:0 12px 36px rgba(20,25,32,.07);border-radius:14px;padding:12px}
    .editor-focusnav[hidden]{display:none}.editor-focusnav-title{display:block;margin:0 0 9px;font-size:.66rem;letter-spacing:.12em;font-weight:950;color:#565b63}
    .editor-focusnav-list{display:grid;gap:7px}.editor-focusnav button{width:100%;border:1px solid transparent;border-radius:9px;padding:9px 10px;text-align:left;font-size:.69rem;font-weight:900;line-height:1.25;cursor:pointer;transition:transform .12s ease,filter .12s ease,box-shadow .12s ease}
    .editor-focusnav button:hover{transform:translateY(-1px);filter:brightness(.985)}
    .editor-focusnav button[data-jump="system-health"]{background:#eaf4ff;border-color:#bdd8ef;color:#245d87}
    .editor-focusnav button[data-jump="editor-basics"]{background:#f3f9d9;border-color:#cedd7c;color:#5d6d08}
    .editor-focusnav button[data-jump="editor-publish"]{background:#fff0e3;border-color:#efc39f;color:#985019}
    .editor-focusnav button[data-jump="system-health"].is-active{background:#245d87;border-color:#245d87;color:#fff;box-shadow:0 5px 14px rgba(36,93,135,.18)}
    .editor-focusnav button[data-jump="editor-basics"].is-active{background:#d9ff28;border-color:#c5e91d;color:#262b08;box-shadow:0 5px 14px rgba(167,199,25,.2)}
    .editor-focusnav button[data-jump="editor-publish"].is-active{background:#d9792b;border-color:#d9792b;color:#fff;box-shadow:0 5px 14px rgba(217,121,43,.2)}
    .editor-quicknav[hidden]{display:none}.editor-quicknav-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.editor-quicknav-title{font-size:.71rem;letter-spacing:.12em;font-weight:950;color:#454950}.editor-quicknav-status{font-size:.64rem;line-height:1.35;color:#777c84;margin:0 0 10px}.editor-quicknav-group{display:grid;gap:5px;margin-top:10px}.editor-quicknav-label{font-size:.58rem;letter-spacing:.12em;font-weight:900;color:#90949b;margin:3px 4px}.editor-quicknav button{width:100%;border:1px solid transparent;background:#f5f6f7;color:#3f4349;border-radius:8px;padding:8px 9px;text-align:left;font-size:.7rem;font-weight:800;cursor:pointer}.editor-quicknav button:hover,.editor-quicknav button.is-active{background:#303136;color:#d9ff28}.editor-quicknav button.quick-save{background:#d9ff28;color:#222;border-color:#c9eb22;text-align:center;margin-top:10px}.editor-quicknav button.quick-save:hover{background:#ccef21;color:#222}.editor-quicknav .quick-top{text-align:center;background:#fff;border-color:#d9dce0}
    .editor-anchor-target{scroll-margin-top:90px}
    @media(max-width:1370px){.editor-focusnav{display:none!important}.editor-quicknav{position:sticky;top:72px;right:auto;width:auto;max-height:none;margin:0 0 18px;padding:9px 10px;display:flex;align-items:center;gap:8px;overflow-x:auto;border-radius:10px}.editor-quicknav-head,.editor-quicknav-status,.editor-quicknav-label{display:none}.editor-quicknav-group{display:flex;gap:6px;margin:0;flex:none}.editor-quicknav button{width:auto;white-space:nowrap;padding:8px 10px}.editor-quicknav button.quick-save{margin:0}.editor-quicknav .quick-top{display:none}}
    @media(max-width:900px){.editor-quicknav{top:0;border-radius:0;margin-inline:-20px;padding-inline:20px;border-left:0;border-right:0;z-index:70}}
  `;
  document.head.appendChild(style);

  const nav = document.createElement('aside');
  nav.className = 'editor-quicknav';
  nav.hidden = editor.hidden;
  nav.innerHTML = `
    <div class="editor-quicknav-head"><span class="editor-quicknav-title">RÝCHLE MENU</span></div>
    <p class="editor-quicknav-status">Rozpracovaný text a pozícia sa ukladajú automaticky v tomto prehliadači.</p>
    <div class="editor-quicknav-group" data-group="overview">
      <span class="editor-quicknav-label">PREHĽADY</span>
      <button type="button" data-jump="analytics-dashboard">Návštevnosť</button>
      <button type="button" data-jump="growth-plan">Rastový plán</button>
      <button type="button" data-jump="editorial-qa">Redakčná fronta</button>
      <button type="button" data-jump="evergreen-watch">Evergreen</button>
      <button type="button" data-jump="production-readiness">Produkčná pripravenosť</button>
      <button type="button" data-jump="system-health">Stav systému</button>
    </div>
    <div class="editor-quicknav-group" data-group="article">
      <span class="editor-quicknav-label">ČLÁNOK</span>
      <button type="button" data-jump="editor-image">Obrázok</button>
      <button type="button" data-jump="editor-basics">Titulok a SEO</button>
      <button type="button" data-jump="editor-body">Text článku</button>
      <button type="button" data-jump="editor-sources">Ďalší krok a zdroje</button>
      <button type="button" data-jump="editor-video" data-optional="1">Video / TikTok</button>
      <button type="button" data-jump="editor-publish">Publikovanie</button>
    </div>
    <button type="button" class="quick-save">Uložiť návrh</button>
    <button type="button" class="quick-top">↑ Hore</button>
  `;
  main.prepend(nav);

  const focusNav = document.createElement('aside');
  focusNav.className = 'editor-focusnav';
  focusNav.hidden = editor.hidden;
  focusNav.setAttribute('aria-label','Rýchle skratky');
  focusNav.innerHTML = `
    <span class="editor-focusnav-title">RÝCHLE SKRATKY</span>
    <div class="editor-focusnav-list">
      <button type="button" data-jump="system-health">Stav systému</button>
      <button type="button" data-jump="editor-basics">Titulok a SEO</button>
      <button type="button" data-jump="editor-publish">Publikovanie</button>
    </div>
  `;
  document.body.appendChild(focusNav);

  function assignTargets(){
    const image = $('#image-search-query')?.closest('.form-section') || $('#image-upload')?.closest('.form-section');
    const basics = $('#title')?.closest('.form-section');
    const body = $('#what-happened')?.closest('.form-section');
    const sources = $('#next-step')?.closest('.form-section');
    const publish = $('#publish-draft')?.closest('.form-section');
    const video = $('.short-video-section');
    const targets = [
      [image,'editor-image'],[basics,'editor-basics'],[body,'editor-body'],
      [sources,'editor-sources'],[publish,'editor-publish'],[video,'editor-video']
    ];
    for(const [el,id] of targets){
      if(el){el.id=id;el.classList.add('editor-anchor-target')}
    }
    document.querySelectorAll('[data-jump]').forEach(btn=>{
      const target=document.getElementById(btn.dataset.jump);
      if(btn.dataset.optional)btn.hidden=!target;
    });
  }

  function jump(id){
    assignTargets();
    const target=document.getElementById(id);
    if(!target)return;
    target.scrollIntoView({behavior:'smooth',block:'start'});
    history.replaceState(null,'','#'+id);
    document.querySelectorAll('.editor-quicknav [data-jump],.editor-focusnav [data-jump]').forEach(b=>b.classList.toggle('is-active',b.dataset.jump===id));
  }

  focusNav.addEventListener('click',event=>{
    const jumpButton=event.target.closest('[data-jump]');
    if(jumpButton)jump(jumpButton.dataset.jump);
  });

  nav.addEventListener('click',event=>{
    const jumpButton=event.target.closest('[data-jump]');
    if(jumpButton){jump(jumpButton.dataset.jump);return}
    if(event.target.closest('.quick-top')){window.scrollTo({top:0,behavior:'smooth'});return}
    if(event.target.closest('.quick-save')){
      const form=$('#article-form');
      if(form?.requestSubmit)form.requestSubmit();
      else form?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    }
  });

  const observer=new MutationObserver(()=>assignTargets());
  observer.observe(main,{subtree:true,childList:true});
  assignTargets();

  window.addEventListener('objektiv24-workspace-saved',event=>{
    const p=nav.querySelector('.editor-quicknav-status');
    if(!p)return;
    p.textContent=event.detail?.dirty
      ? 'Rozpracované zmeny sú bezpečne zachované v tomto prehliadači.'
      : 'Otvorený článok a pozícia sú zapamätané.';
  });

  const shellObserver=new MutationObserver(()=>{nav.hidden=editor.hidden;focusNav.hidden=editor.hidden});
  shellObserver.observe(editor,{attributes:true,attributeFilter:['hidden']});

  let activeTimer=null;
  window.addEventListener('scroll',()=>{
    clearTimeout(activeTimer);
    activeTimer=setTimeout(()=>{
      assignTargets();
      const ids=['analytics-dashboard','growth-plan','editorial-qa','evergreen-watch','production-readiness','system-health','editor-image','editor-basics','editor-body','editor-sources','editor-video','editor-publish'];
      let active='';
      let best=Infinity;
      for(const id of ids){
        const el=document.getElementById(id);
        if(!el)continue;
        const d=Math.abs(el.getBoundingClientRect().top-115);
        if(d<best){best=d;active=id}
      }
      document.querySelectorAll('.editor-quicknav [data-jump],.editor-focusnav [data-jump]').forEach(b=>b.classList.toggle('is-active',b.dataset.jump===active));
    },90);
  },{passive:true});
})();