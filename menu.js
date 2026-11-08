// Game Day Arcade: shared menu bar for every game page.
// Replaces the page's "‹ All games" link with a bar (Menu button + game name).
// The menu pauses the game (window.GD_PAUSED) and offers Resume, How to play, Restart and Leave game.
// Games can listen for the 'gd-pause' and 'gd-resume' events on window.
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

  window.GD_PAUSED=false;
  const pause=()=>{if(!window.GD_PAUSED){window.GD_PAUSED=true;dispatchEvent(new Event('gd-pause'));}};
  const resume=()=>{if(window.GD_PAUSED){window.GD_PAUSED=false;dispatchEvent(new Event('gd-resume'));}};
  const btn=bar.querySelector('.gd-menu-btn');
  function open(){pause();scrim.hidden=false;scrim.querySelector('.gd-go').focus();}
  function close(keepPaused){scrim.hidden=true;if(!keepPaused)resume();btn.focus();}

  btn.addEventListener('click',open);
  scrim.addEventListener('click',e=>{
    if(e.target===scrim)return close();
    const a=e.target.closest('button')?.dataset.a;
    if(a==='resume')close();
    else if(a==='help'){close(true);intro.hidden=false;const go=intro.querySelector('button');go&&go.focus();}
    else if(a==='fav'){const f=getFavs(),i=f.indexOf(gameId);if(i<0)f.push(gameId);else f.splice(i,1);try{localStorage.setItem('arcade-favs',JSON.stringify(f))}catch(_){}favLabel();}
    else if(a==='restart')location.reload();
    else if(a==='leave')location.href=home;
  });
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
