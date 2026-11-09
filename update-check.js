// Game Day Arcade: automatic updates.
// When the page opens (and, on the homepage, whenever the app comes back to the screen), ask the server
// when this page was last published. If that's newer than the copy on screen, reload a fresh copy.
// Usage: <script src="update-check.js" data-resume="1"></script>  (data-resume: also check when returning to the app)
(()=>{
  const me=document.currentScript,resume=me&&me.dataset.resume==='1';
  const KEY='arcade-upd-'+location.pathname;
  function toast(){
    const t=document.createElement('div');t.textContent='Updating to the newest version…';
    t.style.cssText='position:fixed;left:50%;top:max(14px,env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:99;padding:9px 16px;border-radius:999px;background:#f2b33d;color:#1b1405;font:700 15px "Barlow Condensed",Arial,sans-serif;letter-spacing:.04em;box-shadow:0 6px 16px rgba(0,0,0,.4)';
    document.body.appendChild(t);
  }
  async function check(){
    try{
      // don't loop: at most one automatic reload per page every 2 minutes
      const last=+sessionStorage.getItem(KEY)||0;if(Date.now()-last<120000)return;
      const res=await fetch(location.pathname+'?v='+Date.now(),{method:'HEAD',cache:'no-store'});
      const lm=res.ok&&res.headers.get('last-modified');if(!lm)return;
      const server=Date.parse(lm),mine=Date.parse(document.lastModified);
      if(!server||!mine||server<=mine+1000)return;
      sessionStorage.setItem(KEY,Date.now());toast();
      const u=new URL(location.href);u.searchParams.set('r',Date.now());
      setTimeout(()=>location.replace(u.pathname+u.search+u.hash),400);
    }catch(e){}
  }
  if(location.protocol.startsWith('http')){
    if(document.readyState==='complete')check();else addEventListener('load',check);
    if(resume)document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  }
  // tidy the ?r= marker out of the address bar
  if(new URLSearchParams(location.search).has('r')){const u=new URL(location.href);u.searchParams.delete('r');history.replaceState(history.state,'',u.pathname+u.search+u.hash);}
})();
