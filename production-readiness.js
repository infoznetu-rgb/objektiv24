(() => {
  const $=s=>document.querySelector(s);
  function start(){
    const shell=$('#editor-shell');
    if(!shell)return;
    const obs=new MutationObserver(()=>{if(!shell.hidden){obs.disconnect();mount()}});
    obs.observe(shell,{attributes:true,attributeFilter:['hidden']});
    if(!shell.hidden)mount();
  }
  function mount(){
    if($('#production-readiness'))return;
    const main=$('.editor-main');
    const section=document.createElement('section');
    section.id='production-readiness';
    section.className='production-readiness';
    const items=[
      ['ok','Prevádzkovateľ','Identita a poštová adresa sú zverejnené na Kontakt / Ako pracujeme.'],
      ['ok','Dátumy komunikátov','Články zobrazujú publikovanie, aktualizáciu a kontrolu podkladov.'],
      ['ok','Zodpovednosť','Pri článku je uvedená redakčná zodpovednosť Objektív24.sk.'],
      ['ok','Reklama','AdSense nie je na verejnom webe aktívny.'],
      ['todo','Samostatný e-mail na opravy','Treba zriadiť funkčnú samostatnú e-mailovú adresu pre formálne žiadosti o uverejnenie opravy a až potom ju zverejniť.'],
      ['todo','Evidenčný údaj','Treba overiť zápis spravodajského webového portálu a doplniť pridelený evidenčný údaj; číslo sa nesmie vymyslieť.'],
      ['todo','AdSense CMP','Pred prípadným zapnutím Google reklamy nastaviť Google-certifikovanú CMP / TCF pre relevantnú návštevnosť.']
    ];
    const done=items.filter(x=>x[0]==='ok').length;
    section.innerHTML='<div class="production-head"><div><p class="analytics-kicker">PRODUKČNÁ PRIPRAVENOSŤ</p><h2>Dôveryhodnosť a povinné údaje</h2><p>Technické veci sú nasadené. Položky označené „treba doplniť“ vyžadujú reálny údaj alebo externé nastavenie.</p></div><strong>'+done+'/'+items.length+'</strong></div><div class="production-list">'+items.map(([state,title,detail])=>'<article data-state="'+state+'"><span>'+(state==='ok'?'✓':'!')+'</span><div><b>'+title+'</b><p>'+detail+'</p></div></article>').join('')+'</div>';
    const health=$('#system-health');
    if(health)health.insertAdjacentElement('beforebegin',section); else main.prepend(section);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();