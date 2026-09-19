(() => {
  const standalone = (() => {
    try {
      return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    } catch {
      return false;
    }
  })();
  if (!standalone) return;

  const root = document.documentElement;
  root.classList.add('objektiv24-app-starting');

  const style = document.createElement('style');
  style.id = 'objektiv24-app-launch-style';
  style.textContent = `
    html.objektiv24-app-starting{
      background:#050d14;
      color-scheme:dark;
    }
    html.objektiv24-app-starting::before{
      content:"";
      position:fixed;
      inset:0;
      z-index:2147483646;
      background:
        linear-gradient(#0d202a 0 0) 50% calc(50% + 104px)/62px 2px no-repeat,
        #050d14 url("/assets/app-mark-modern.svg?v=20260919-1") 50% calc(50% - 30px)/124px 124px no-repeat;
      pointer-events:none;
    }
    html.objektiv24-app-starting::after{
      content:"OBJEKTÍV24   ·   FAKTY · KONTEXT · ĽUDIA";
      position:fixed;
      left:20px;
      right:20px;
      top:calc(50% + 94px);
      z-index:2147483647;
      color:#f7fafb;
      text-align:center;
      font:800 11px/1.4 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
      letter-spacing:.13em;
      pointer-events:none;
      white-space:nowrap;
    }
    @media(max-width:390px){
      html.objektiv24-app-starting::after{
        left:8px;
        right:8px;
        font-size:9px;
        letter-spacing:.09em;
      }
    }
    @media(prefers-reduced-motion:no-preference){
      html.objektiv24-app-starting::before,
      html.objektiv24-app-starting::after{
        animation:objektiv24LaunchIn .24s ease-out both;
      }
      @keyframes objektiv24LaunchIn{
        from{opacity:.72}
        to{opacity:1}
      }
    }
  `;
  document.head.appendChild(style);

  const started = performance.now();
  const finish = () => {
    const elapsed = performance.now() - started;
    const wait = Math.max(0, 620 - elapsed);
    setTimeout(() => root.classList.remove('objektiv24-app-starting'), wait);
  };

  if (document.readyState === 'complete') finish();
  else addEventListener('load', finish, { once:true });

  setTimeout(() => root.classList.remove('objektiv24-app-starting'), 1800);
})();