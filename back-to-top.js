(() => {
  if (document.querySelector('[data-back-to-top]')) return;

  const style = document.createElement('style');
  style.textContent = `
    .back-to-top{
      position:fixed;
      right:max(18px,env(safe-area-inset-right));
      bottom:max(18px,calc(env(safe-area-inset-bottom) + 12px));
      z-index:9999;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:7px;
      min-width:58px;
      height:46px;
      padding:0 15px;
      border:1px solid rgba(206,239,38,.55);
      border-radius:999px;
      background:#111820;
      color:#d9ff28;
      box-shadow:0 10px 30px rgba(0,0,0,.22);
      font:800 .78rem/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      cursor:pointer;
      opacity:0;
      visibility:hidden;
      transform:translateY(10px);
      transition:opacity .18s ease,transform .18s ease,visibility .18s ease,background .18s ease;
    }
    .back-to-top.is-visible{opacity:1;visibility:visible;transform:translateY(0)}
    .back-to-top:hover{background:#1a242d}
    .back-to-top:focus-visible{outline:3px solid rgba(217,255,40,.35);outline-offset:3px}
    .back-to-top .arrow{font-size:1rem;line-height:1}
    @media(max-width:600px){
      .back-to-top{right:12px;bottom:max(12px,calc(env(safe-area-inset-bottom) + 8px));height:44px;min-width:50px;padding:0 12px}
      .back-to-top .label{display:none}
      .back-to-top .arrow{font-size:1.15rem}
    }
    @media(prefers-reduced-motion:reduce){.back-to-top{transition:none}}
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'back-to-top';
  button.dataset.backToTop = '1';
  button.setAttribute('aria-label', 'Späť na začiatok stránky');
  button.title = 'Späť hore';
  button.innerHTML = '<span class="arrow" aria-hidden="true">↑</span><span class="label">Hore</span>';
  document.body.appendChild(button);

  const update = () => button.classList.toggle('is-visible', window.scrollY > 650);
  button.addEventListener('click', () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });
  window.addEventListener('scroll', update, { passive: true });
  update();
})();
