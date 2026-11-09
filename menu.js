// Game Day Arcade: shared menu bar for every game page.
// Replaces the page's "‹ All games" link with a bar (Menu button + game name).
// The menu pauses the game (window.GD_PAUSED) and offers Resume, How to play, Restart and Leave game.
// Games can listen for the 'gd-pause' and 'gd-resume' events on window.
// Saving: a game that sets window.GD_SAVE = {get(), load(data), describe(data)} gets a SAVE GAME button,
// is saved automatically when you leave or close it, and asks "Continue where you left off?" when you come back.
// get() returns the game's progress as plain data, or null when there's nothing worth saving (e.g. game over).
(()=>{
  const css=`
.gd-bar{display:flex;align-items:center;gap:12px;min-width:0;flex:1;justify-self:stretch}
.gd-menu-btn{font-family:var(--body,"Barlow Condensed",Arial,sans-serif);font-size:16px;font-weight:700;letter-spacing:.06em;
  display:inline-flex;align-items:center;gap:7px;padding:6px 12px;width:auto;border-radius:6px;cursor:pointer;
  background:var(--panel,#16221b);color:var(--chalk,#f3efe4);border:1px solid var(--line,#2a3a30);flex:none;touch-action:manipulation}
.gd-menu-btn:hover{border-color:var(--gold,#f2b33d)}
.gd-menu-btn:focus-visible{outline:3px solid #5aa8ff;outline-offset:2px}
.gd-burger{display:inline-flex;flex-direction:column;gap:3px}
.gd-burger i{display:block;width:14px;height:2px;border-radius:1px;background:currentColor}
.gd-title{font-family:var(--display,"Graduate",Georgia,serif);font-size:18px;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.gd-scrim{position:fixed;inset:0;z-index:50;background:rgba(5,9,7,.78);display:flex;align-items:center;justify-content:center;
  padding:max(16px,env(safe-area-inset-top,0px)) 16px max(16px,env(safe-area-inset-bottom,0px))}
.gd-panel{width:min(100%,340px);background:var(--panel,#16221b);border:1px solid var(--line,#2a3a30);border-radius:10px;padding:18px 16px 16px;
  display:flex;flex-direction:column;gap:10px;color:var(--chalk,#f3efe4);font-family:var(--body,"Barlow Condensed",Arial,sans-serif)}
.gd-panel h2{margin:0;font-family:var(--display,"Graduate",Georgia,serif);font-weight:400;font-size:26px;color:var(--gold,#f2b33d);text-align:center}
.gd-panel p{margin:-4px 0 4px;text-align:center;color:var(--muted,#9fb1a5);font-size:16px;font-weight:600;letter-spacing:.04em}
.gd-panel button{width:100%;font-family:var(--display,"Graduate",Georgia,serif);font-size:19px;letter-spacing:.05em;padding:13px 10px;border-radius:6px;cursor:pointer;
  background:transparent;color:var(--chalk,#f3efe4);border:1px solid var(--line,#2a3a30);touch-action:manipulation}
.gd-panel button:hover{border-color:var(--muted,#9fb1a5)}
.gd-panel button.gd-go{background:var(--gold,#f2b33d);color:#1b1405;border-color:transparent}
.gd-panel button.gd-fav[aria-pressed="true"]{color:var(--gold,#f2b33d);border-color:var(--gold,#f2b33d)}
.gd-panel button.gd-leave{color:#ff8a98;border-color:#5a2a32}
.gd-panel button.gd-save[data-done]{color:var(--gold,#f2b33d);border-color:var(--gold,#f2b33d)}
.gd-panel .gd-saved{margin:0;font-size:14px;color:var(--muted,#9fb1a5);text-align:center;font-weight:600;letter-spacing:.02em}
.gd-panel .gd-desc{margin:0 0 4px;font-size:17px;color:var(--chalk,#f3efe4);text-align:center;font-weight:600;line-height:1.3;letter-spacing:.01em}
.gd-panel button:focus-visible{outline:3px solid #5aa8ff;outline-offset:2px}
`;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  const back=document.querySelector('.back');
  if(!back)return;
  const home=back.getAttribute('href')||'../../';
  const name=(document.title||'Game').trim();
  const puzzle=/word-search|crossword/.test(location.pathname);

  const bar=document.createElement('div');bar.className='gd-bar';
  bar.innerHTML='<button type="button" class="gd-menu-btn" aria-haspopup="dialog"><span class="gd-burger" aria-hidden="true"><i></i><i></i><i></i></span>MENU</button><span class="gd-title"></span>';
  bar.querySelector('.gd-title').textContent=name;
  back.replaceWith(bar);

  const scrim=document.createElement('div');scrim.className='gd-scrim';scrim.hidden=true;
  scrim.innerHTML='<div class="gd-panel" role="dialog" aria-modal="true" aria-labelledby="gdMenuH">'+
    '<h2 id="gdMenuH">Paused</h2><p class="gd-name"></p>'+
    '<button type="button" class="gd-go" data-a="resume">RESUME</button>'+
    '<button type="button" class="gd-save" data-a="save">SAVE GAME</button><p class="gd-saved" hidden></p>'+
    '<button type="button" data-a="help">HOW TO PLAY</button>'+
    '<button type="button" class="gd-fav" data-a="fav"></button>'+
    '<button type="button" data-a="restart"></button>'+
    '<button type="button" class="gd-leave" data-a="leave">LEAVE GAME</button></div>';
  scrim.querySelector('.gd-name').textContent=name;
  scrim.querySelector('[data-a="restart"]').textContent=puzzle?'NEW PUZZLE':'RESTART GAME';
  document.body.appendChild(scrim);
  // Favorites: same list the lobby uses (localStorage 'arcade-favs', keyed by the game's folder name).
  const gameId=(location.pathname.match(/games\/([^/]+)\//)||[])[1];
  const favBtn=scrim.querySelector('[data-a="fav"]');
  const getFavs=()=>{try{return JSON.parse(localStorage.getItem('arcade-favs')||'[]')||[]}catch(e){return []}};
  function favLabel(){const on=getFavs().includes(gameId);favBtn.textContent=on?'★ IN FAVORITES':'☆ ADD TO FAVORITES';favBtn.setAttribute('aria-pressed',on);}
  if(gameId)favLabel();else favBtn.remove();
  const intro=document.getElementById('intro');
  if(!intro)scrim.querySelector('[data-a="help"]').remove();

  /* ---------- saving ---------- */
  const api=window.GD_SAVE,SKEY='save-'+gameId;
  const saveBtn=scrim.querySelector('[data-a="save"]'),savedNote=scrim.querySelector('.gd-saved');
  const readSave=()=>{try{const r=JSON.parse(localStorage.getItem(SKEY)||'null');return r&&r.data!=null?r:null}catch(e){return null}};
  const when=t=>{const d=new Date(t),now=new Date(),mins=Math.round((now-d)/60000),tm=d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
    if(mins<1)return 'just now';if(mins<60)return mins+(mins===1?' minute ago':' minutes ago');
    if(d.toDateString()===now.toDateString())return 'today at '+tm;
    const y=new Date(now);y.setDate(now.getDate()-1);if(d.toDateString()===y.toDateString())return 'yesterday at '+tm;
    return d.toLocaleDateString([],{month:'short',day:'numeric'})+' at '+tm;};
  let ready=!api;   // until the player answers "continue?", don't overwrite their save
  function writeSave(){
    if(!api||!ready||!gameId)return null;
    let d=null;try{d=api.get();}catch(e){d=null;}
    try{
      if(d==null){localStorage.removeItem(SKEY);return null;}
      let desc='';try{desc=api.describe?api.describe(d):'';}catch(e){}
      const rec={v:1,at:Date.now(),desc,data:d};localStorage.setItem(SKEY,JSON.stringify(rec));return rec;
    }catch(e){return null;}
  }
  const clearSave=()=>{try{localStorage.removeItem(SKEY)}catch(e){}};
  function saveLabel(){saveBtn.textContent='SAVE GAME';saveBtn.removeAttribute('data-done');const r=readSave();savedNote.hidden=!r;if(r)savedNote.textContent='Last saved '+when(r.at);}
  if(!api){saveBtn.remove();savedNote.remove();}
  else{
    scrim.querySelector('[data-a="leave"]').textContent='SAVE & LEAVE';
    addEventListener('pagehide',writeSave);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)writeSave();});
  }

  window.GD_PAUSED=false;
  const pause=()=>{if(!window.GD_PAUSED){window.GD_PAUSED=true;dispatchEvent(new Event('gd-pause'));}};
  const resume=()=>{if(window.GD_PAUSED){window.GD_PAUSED=false;dispatchEvent(new Event('gd-resume'));}};
  const btn=bar.querySelector('.gd-menu-btn');
  function open(){pause();if(api)saveLabel();scrim.hidden=false;scrim.querySelector('.gd-go').focus();}
  function close(keepPaused){scrim.hidden=true;if(!keepPaused)resume();btn.focus();}

  btn.addEventListener('click',open);
  scrim.addEventListener('click',e=>{
    if(e.target===scrim)return close();
    const a=e.target.closest('button')?.dataset.a;
    if(a==='resume')close();
    else if(a==='help'){close(true);intro.hidden=false;const go=intro.querySelector('button');go&&go.focus();}
    else if(a==='fav'){const f=getFavs(),i=f.indexOf(gameId);if(i<0)f.push(gameId);else f.splice(i,1);try{localStorage.setItem('arcade-favs',JSON.stringify(f))}catch(_){}favLabel();}
    else if(a==='save'){const r=writeSave();if(r){saveBtn.textContent='SAVED ✓';saveBtn.setAttribute('data-done','');savedNote.hidden=false;savedNote.textContent=(r.desc?r.desc+'. ':'')+'You can close the game and pick up here later.';}else{saveBtn.textContent='NOTHING TO SAVE YET';}}
    else if(a==='restart'){if(api)clearSave();ready=false;location.reload();}
    else if(a==='leave'){writeSave();ready=false;location.href=home;}
  });
  // Coming back to a saved game: offer to continue.
  if(api){
    const rec=readSave();
    if(!rec)ready=true;
    else{
      pause();
      const cs=document.createElement('div');cs.className='gd-scrim';
      cs.innerHTML='<div class="gd-panel" role="dialog" aria-modal="true" aria-labelledby="gdContH"><h2 id="gdContH">Welcome back</h2><p class="gd-name"></p>'+
        '<p class="gd-desc"></p><button type="button" class="gd-go" data-a="cont">CONTINUE SAVED GAME</button><button type="button" data-a="new">START A NEW GAME</button></div>';
      cs.querySelector('.gd-name').textContent=name+' · saved '+when(rec.at);
      cs.querySelector('.gd-desc').textContent=rec.desc||'You have a saved game.';
      document.body.appendChild(cs);
      const done=()=>{cs.remove();ready=true;if(scrim.hidden&&(!intro||intro.hidden))resume();btn.focus();};
      cs.addEventListener('click',e=>{
        const a=e.target.closest('button')?.dataset.a;if(!a)return;
        if(a==='cont'){if(intro)intro.hidden=true;try{api.load(rec.data);}catch(err){console.error(err);}done();}
        else if(a==='new'){clearSave();done();}
      });
      setTimeout(()=>cs.querySelector('.gd-go').focus(),0);
    }
  }
  // Stay paused while "How to play" is open; resume when it closes.
  if(intro)new MutationObserver(()=>{if(intro.hidden&&scrim.hidden)resume();}).observe(intro,{attributes:true,attributeFilter:['hidden']});
  addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(scrim.hidden)open();else close();
    e.preventDefault();
  },true);
  // Pause automatically if the app goes to the background mid-game.
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&scrim.hidden&&(!intro||intro.hidden))open();});
})();
