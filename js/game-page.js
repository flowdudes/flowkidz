/* Game detail pages: play tracking, back button, game-complete -> vote earned. */
(function(){try{const k='fk-played',p=location.pathname,l=JSON.parse(localStorage.getItem(k)||'[]');if(!l.includes(p)){l.push(p);localStorage.setItem(k,JSON.stringify(l.slice(-50)))}}catch(e){}})();
(function(){
const b=document.querySelector('[data-fk-back]');
if(!b)return;
b.addEventListener('click',e=>{
  let ref='';try{ref=new URL(document.referrer).origin}catch(x){}
  if(ref===location.origin&&history.length>1){e.preventDefault();history.back()}
});
})();
(function(){
const ORIGINS=['https://play.flowkidz.com','https://flowkidz.pages.dev','https://flowdudes.github.io'];
const slug=location.pathname.split('/').filter(Boolean).pop()||'';
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return[]}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const toast=()=>{
  const st=document.createElement('style');
  st.textContent='.fk-earn{position:fixed;left:50%;top:16px;z-index:9999;display:flex;align-items:center;gap:10px;padding:12px 14px 12px 12px;border-radius:999px;background:#17162E;color:#fff;font:700 15px/1.2 "Nunito Sans",sans-serif;box-shadow:0 14px 30px rgba(23,22,46,.35);transform:translateX(-50%);width:max-content;max-width:calc(100vw - 24px);pointer-events:none}.fk-earn a{pointer-events:auto}@media (max-width:767px){.fk-earn{top:62px}}.fk-earn svg{width:26px;flex:none}.fk-earn a{margin-left:4px;padding:8px 14px;border-radius:999px;background:linear-gradient(180deg,#ff8db8,#f0508a);color:#fff;text-decoration:none;white-space:nowrap}';
  document.head.appendChild(st);
  const t=document.createElement('div');
  t.className='fk-earn';
  t.setAttribute('role','status');
  t.innerHTML='<svg viewBox="0 0 22 20" aria-hidden="true"><path d="M11 18.5C4 13.5 1.5 10 2 6.5 2.6 3 7.5 2 11 6.5 14.5 2 19.4 3 20 6.5 20.5 10 18 13.5 11 18.5Z" fill="#FF6FA5"/></svg><span>You earned +1 vote!</span><a href="/coming-soon">Use it</a>';
  document.body.appendChild(t);
  if(window.gsap){
    gsap.fromTo(t,{y:-80,scale:.6,opacity:0},{y:0,scale:1,opacity:1,duration:.6,ease:'back.out(2.5)'});
    gsap.fromTo(t.querySelector('svg'),{scale:0,rotation:-90},{scale:1,rotation:0,duration:.6,delay:.2,ease:'back.out(3)'});
    gsap.to(t,{y:-80,opacity:0,duration:.4,delay:7,ease:'power2.in',onComplete:()=>t.remove()});
  }else setTimeout(()=>t.remove(),7000);
};
addEventListener('message',e=>{
  if((e.origin!==location.origin&&!ORIGINS.includes(e.origin))||!slug)return;
  const d=e.data||{};
  if(d.type!=='fk:complete')return;
  const done=read('fk-done');
  if(done.includes(slug))return;
  done.push(slug);
  write('fk-done',done);
  toast();
});
})();
