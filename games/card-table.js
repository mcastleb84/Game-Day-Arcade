// Game Day Arcade: shared card table for Spades and Bid Whist.
// The page sets window.CARD_GAME = 'spades' | 'whist' before loading this file.
// You sit at the bottom (seat 0). Seat 1 is on your left, seat 2 (your partner) across, seat 3 on your right.
// Play goes clockwise: 0 → 1 → 2 → 3. Teams: you + partner (seats 0, 2) vs. seats 1, 3.
(()=>{
const GAME=window.CARD_GAME==='whist'?'whist':'spades';
const $=id=>document.getElementById(id);
const cv=$('c'),ctx=cv.getContext('2d'),wrap=$('wrap');
const Q=new URLSearchParams(location.search),AUTO=Q.has('autoplay'),FAST=Q.has('fast')?.12:1;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const KEY=GAME==='whist'?'bw':'sp';
const rnd=(a,b)=>a+Math.random()*(b-a),rint=n=>Math.floor(Math.random()*n),pick=a=>a[rint(a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const team=s=>s%2,partnerOf=s=>(s+2)%4;
const minBy=(a,f)=>a.reduce((x,y)=>f(y)<f(x)?y:x),maxBy=(a,f)=>a.reduce((x,y)=>f(y)>f(x)?y:x);
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- sound (synthesized) ---------- */
let AC=null,NB=null,muted=store.get('cards-mute')==='1';
function ac(){if(muted)return null;if(!AC){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;try{AC=new A()}catch(e){return null}}if(AC.state==='suspended')AC.resume();return AC;}
function tone(f,d,type,vol,f2,delay){const a=ac();if(!a)return;const t=a.currentTime+(delay||0);const o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d+.05);}
function noise(d,vol,freq,delay){const a=ac();if(!a)return;if(!NB){NB=a.createBuffer(1,a.sampleRate,a.sampleRate);const ch=NB.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;}const t=a.currentTime+(delay||0),src=a.createBufferSource();src.buffer=NB;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=1;const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+d);src.connect(f).connect(g).connect(a.destination);src.start(t);src.stop(t+d+.05);}
const sfx={
  card(){noise(.07,.25,3200);},
  deal(){noise(.04,.12,4200);},
  shuffle(){for(let i=0;i<8;i++)noise(.05,.12,2600+i*150,i*.04);},
  win(){tone(660,.12,'triangle',.08);tone(880,.16,'triangle',.08,0,.1);},
  lose(){tone(300,.25,'sine',.06,220);},
  set(){tone(330,.4,'sawtooth',.05,150);},
  cheer(){[523,659,784,1047].forEach((f,i)=>tone(f,.25,'triangle',.1,0,i*.12));}
};
$('snd').addEventListener('click',()=>{muted=!muted;store.set('cards-mute',muted?'1':'0');if(muted&&AC)AC.suspend();sndLabel();});
function sndLabel(){$('snd').textContent=muted?'Sound off':'Sound on';}
sndLabel();

/* ---------- clock + waits (everything stops while the menu is open) ---------- */
let clk=0;const timers=[];
const wait=ms=>new Promise(res=>timers.push({at:clk+ms*FAST,res}));

/* ---------- cards ---------- */
const SUITS=['S','H','D','C'],SYM={S:'♠',H:'♥',D:'♦',C:'♣',J:'★'},SNAME={S:'Spades',H:'Hearts',D:'Diamonds',C:'Clubs'};
const isRed=c=>c.s==='H'||c.s==='D'||c.id==='BJ';
const RL=r=>r===14?'A':r===13?'K':r===12?'Q':r===11?'J':String(r);
function newDeck(){
  const d=[];for(const s of SUITS)for(let r=2;r<=14;r++)d.push({s,r,id:s+r});
  if(GAME==='whist'){d.push({s:'J',r:16,id:'BJ'});d.push({s:'J',r:15,id:'LJ'});}
  for(let i=d.length-1;i>0;i--){const j=rint(i+1);[d[i],d[j]]=[d[j],d[i]];}
  return d;
}
const FULL=newDeck();
// Rules context for the hand being played: trump suit (or null), direction ('up' = high wins, 'down' = low wins), no-trump flag.
const R={trump:'S',dir:'up',nt:false};
const esuit=c=>c.s==='J'?(R.trump||'J'):c.s;
function power(c){if(c.s==='J')return R.trump?(c.r===16?200:199):-1;return R.dir==='down'?(c.r===14?14:15-c.r):c.r;}
const isTrump=c=>!!R.trump&&esuit(c)===R.trump;
const val=c=>(isTrump(c)?100:0)+power(c);
function bySuit(h){const o={S:[],H:[],D:[],C:[],J:[]};h.forEach(c=>o[c.s].push(c));return o;}
function ledSuit(trick){for(const t of trick){const e=esuit(t.c);if(e!=='J')return e;}return null;}
function legal(hand,trick){
  if(!trick.length){
    if(GAME==='spades'&&!S.broken){const non=hand.filter(c=>c.s!=='S');if(non.length)return non;}
    return hand.slice();
  }
  const led=ledSuit(trick);if(!led)return hand.slice();
  const f=hand.filter(c=>esuit(c)===led);
  if(f.length)return R.nt?f.concat(hand.filter(c=>c.s==='J')):f;
  return hand.slice();
}
function winnerOf(trick){
  const led=ledSuit(trick);let best=null,bp=-1e9;
  for(const t of trick){const e=esuit(t.c);const p=isTrump(t.c)?1000+power(t.c):e===led?power(t.c):-5;if(p>bp){bp=p;best=t;}}
  return best.seat;
}
const beats=(c,seat)=>winnerOf([...S.trick,{seat:-1,c}])===-1;
function sortHand(h){
  const order=GAME==='whist'&&R.trump?[R.trump,...SUITS.filter(s=>s!==R.trump)]:['S','H','C','D'];
  // keep colors alternating where possible
  if(order.length===4){const blk=order.filter(s=>s==='S'||s==='C'),red=order.filter(s=>s==='H'||s==='D');const first=order[0];const a=blk.includes(first)?blk:red,b=a===blk?red:blk;order.splice(0,4,a[0],b[0],a[1],b[1]);}
  const rank=c=>c.s==='J'?(R.trump?-1:99):order.indexOf(c.s);
  h.sort((x,y)=>rank(x)-rank(y)||power(y)-power(x));
}

/* ---------- the people at the table (drawn, not photos) ---------- */
const PEOPLE=[
  {name:'Rose',skin:'#6b4226',hair:{style:'curls',c:'#2b1b14'},fem:1,shirt:'#7a2e4d',glasses:1,earrings:1,long:1},
  {name:'Mike',skin:'#4a2c1a',hair:{style:'fade',c:'#140d09'},beard:'full',shirt:'#2b4a7a'},
  {name:'Ray',skin:'#8d5a3b',hair:{style:'short',c:'#bdb7ae'},beard:'mustache',glasses:1,shirt:'#55663a',long:1},
  {name:'Keisha',skin:'#5c3a24',hair:{style:'afro',c:'#1d120c'},fem:1,earrings:1,shirt:'#d08a2e'},
  {name:'Tony',skin:'#d6a77a',hair:{style:'short',c:'#3a2618'},beard:'goatee',shirt:'#3d3d45',iris:'#4a5e74'},
  {name:'Gloria',skin:'#c68a5e',hair:{style:'bun',c:'#2a1a10'},fem:1,earrings:1,shirt:'#2e7a6b',long:1},
  {name:'Dre',skin:'#3d2516',hair:{style:'braids',c:'#120b07'},beard:'goatee',shirt:'#8a2b2b'},
  {name:'Linda',skin:'#f1c9a5',hair:{style:'long',c:'#8a5a2b'},fem:1,glasses:1,shirt:'#4b5fa6',iris:'#4d6e5a',long:1},
  {name:'Earl',skin:'#5a3620',hair:{style:'bald',c:'#9a948c'},beard:'full',shirt:'#6b4a2b',long:1}
];
function shade(hex,a){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=a<0?0:255,k=Math.abs(a);r=Math.round(r+(f-r)*k);g=Math.round(g+(f-g)*k);b=Math.round(b+(f-b)*k);return `rgb(${r},${g},${b})`;}
function mix(h1,h2,t){const a=parseInt(h1.slice(1),16),b=parseInt(h2.slice(1),16);const c=(s)=>Math.round(((a>>s)&255)*(1-t)+((b>>s)&255)*t);return `rgb(${c(16)},${c(8)},${c(0)})`;}
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}

// Per-seat expression state: gaze, blink, smile, eyebrows, talking.
const FACE=[0,1,2,3].map(()=>({gx:0,gy:0,tgx:0,tgy:0,blinkAt:rnd(1000,4000),blinkT:0,mood:0,moodUntil:0,think:false,brow:0}));
function headPath(u){
  ctx.beginPath();ctx.moveTo(0,-1.05*u);
  ctx.bezierCurveTo(.52*u,-1.05*u,.86*u,-.62*u,.84*u,-.05*u);
  ctx.bezierCurveTo(.82*u,.45*u,.6*u,.86*u,0,1.0*u);
  ctx.bezierCurveTo(-.6*u,.86*u,-.82*u,.45*u,-.84*u,-.05*u);
  ctx.bezierCurveTo(-.86*u,-.62*u,-.52*u,-1.05*u,0,-1.05*u);ctx.closePath();
}
function hairCap(u,off,hl,dx,side){
  const rx=.86*u+off,ry=1.08*u+off;
  ctx.beginPath();ctx.ellipse(0,-.04*u,rx,ry,0,Math.PI*.98,Math.PI*2.02);
  ctx.lineTo(.8*u,side*u);
  ctx.quadraticCurveTo(.74*u,hl*.6*u,.42*u+dx*.6,hl*u);
  ctx.quadraticCurveTo(dx*.6,(hl-.07)*u,-.42*u+dx*.6,hl*u);
  ctx.quadraticCurveTo(-.74*u,hl*.6*u,-.8*u,side*u);ctx.closePath();
}
function hairFill(c,u){const g=ctx.createLinearGradient(0,-1.3*u,0,.4*u);g.addColorStop(0,shade(c,.18));g.addColorStop(.5,c);g.addColorStop(1,shade(c,-.25));return g;}
function curlBlob(cx,cy,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=r*.18;ctx.beginPath();ctx.arc(cx,cy,r*.55,.4,2.6);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.arc(cx,cy,r*.6,3.6,5);ctx.stroke();}
function backHair(pp,u,dx){
  const c=pp.hair.c,st=pp.hair.style;
  if(st==='afro'){
    ctx.fillStyle=hairFill(c,u);ctx.beginPath();ctx.ellipse(dx*.2,-.45*u,1.42*u,1.32*u,0,0,7);ctx.fill();
    for(let i=0;i<26;i++){const a=i/26*Math.PI*2,x=dx*.2+Math.cos(a)*1.38*u,y=-.45*u+Math.sin(a)*1.28*u;if(y>.55*u)continue;curlBlob(x,y,.2*u,c);}
  }else if(st==='curls'){
    for(let i=0;i<22;i++){const a=Math.PI*(1.05+i/21*.9)-Math.PI*.05,x=Math.cos(a)*1.05*u,y=-.25*u+Math.sin(a)*1.0*u;curlBlob(x+dx*.2,y,.3*u,c);}
    for(const s of [-1,1])for(let k=0;k<4;k++)curlBlob(s*(1.0+k*.04)*u+dx*.2,(-.1+k*.32)*u,.3*u,c);
  }else if(st==='long'||st==='braids'){
    ctx.fillStyle=hairFill(c,u);ctx.beginPath();ctx.moveTo(-.95*u,-.5*u);ctx.quadraticCurveTo(-1.25*u,1*u,-1.2*u,2.3*u);ctx.lineTo(1.2*u,2.3*u);ctx.quadraticCurveTo(1.25*u,1*u,.95*u,-.5*u);ctx.closePath();ctx.fill();
  }
}
function frontHair(pp,u,dx){
  const c=pp.hair.c,st=pp.hair.style;ctx.fillStyle=hairFill(c,u);
  if(st==='bald'){
    // fringe around the sides + scalp shine
    ctx.fillStyle=c;for(const s of [-1,1]){ctx.beginPath();ctx.ellipse(s*.8*u,-.15*u,.12*u,.32*u,s*.2,0,7);ctx.fill();}
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.ellipse(-.25*u+dx*.3,-.78*u,.3*u,.12*u,-.4,0,7);ctx.fill();return;
  }
  if(st==='fade'){hairCap(u,.03*u,-.62,dx,-.15);ctx.fill();
    ctx.fillStyle=pp.skin;ctx.globalAlpha=.45;for(const s of [-1,1]){ctx.beginPath();ctx.ellipse(s*.78*u,-.3*u,.12*u,.3*u,0,0,7);ctx.fill();}ctx.globalAlpha=1;return;}
  if(st==='short'){hairCap(u,.08*u,-.56,dx,.08);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=.03*u;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*.18*u,-.7*u);ctx.quadraticCurveTo(i*.18*u+.1*u,-.95*u,i*.2*u+.15*u,-1.05*u);ctx.stroke();}return;}
  if(st==='afro'){hairCap(u,.1*u,-.6,dx,-.1);ctx.fill();for(let i=-3;i<=3;i++)curlBlob(i*.24*u+dx*.5,-.66*u+Math.abs(i)*.05*u,.14*u,c);return;}
  if(st==='curls'){hairCap(u,.12*u,-.55,dx,.1);ctx.fill();for(let i=-3;i<=3;i++)curlBlob(i*.25*u+dx*.5,-.62*u+Math.abs(i)*.06*u,.17*u,c);return;}
  if(st==='bun'){hairCap(u,.04*u,-.62,dx,-.05);ctx.fill();ctx.fillStyle=hairFill(c,u);ctx.beginPath();ctx.arc(dx*.2,-1.22*u,.4*u,0,7);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=.03*u;ctx.beginPath();ctx.arc(dx*.2,-1.22*u,.26*u,.5,3.2);ctx.stroke();ctx.fillStyle='#c9a227';ctx.fillRect(-.22*u+dx*.2,-.92*u,.44*u,.07*u);return;}
  if(st==='long'){
    hairCap(u,.08*u,-.58,dx,.2);ctx.fill();
    // strands framing the face, falling over the shoulders
    for(const s of [-1,1]){ctx.fillStyle=hairFill(c,u);ctx.beginPath();ctx.moveTo(s*.55*u+dx*.5,-.62*u);ctx.quadraticCurveTo(s*.95*u,-.1*u,s*.92*u,.9*u);ctx.quadraticCurveTo(s*1.0*u,1.6*u,s*1.15*u,2.0*u);ctx.lineTo(s*1.35*u,1.9*u);ctx.quadraticCurveTo(s*1.2*u,.4*u,s*.9*u,-.85*u);ctx.closePath();ctx.fill();}
    ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=.025*u;ctx.beginPath();ctx.moveTo(dx*.5,-1.12*u);ctx.lineTo(dx*.6,-.66*u);ctx.stroke();return;
  }
  if(st==='braids'){
    hairCap(u,.06*u,-.6,dx,-.05);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=.035*u;
    for(let i=-4;i<=4;i++){ctx.beginPath();ctx.moveTo(i*.17*u+dx*.6,-.62*u);ctx.quadraticCurveTo(i*.2*u,-1.0*u,i*.12*u,-1.12*u);ctx.stroke();}
    for(const s of [-1,1])for(let k=0;k<3;k++){const x=s*(.95+k*.12)*u;ctx.strokeStyle=c;ctx.lineWidth=.13*u;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,-.2*u);ctx.lineTo(x+s*.1*u,2.1*u);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=.02*u;for(let j=0;j<9;j++){const y=(-.1+j*.24)*u;ctx.beginPath();ctx.moveTo(x-.05*u,y);ctx.lineTo(x+.05*u,y+.08*u);ctx.stroke();}}
  }
}
function eye(cx,cy,u,ws,side,pp,f){
  const w=.19*u*ws,h=.085*u,lid=shade(pp.skin,-.5);
  if(f.blinkT>0){ctx.strokeStyle=lid;ctx.lineWidth=.035*u;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cx-w,cy);ctx.quadraticCurveTo(cx,cy+h*.7,cx+w,cy);ctx.stroke();return;}
  ctx.save();ctx.beginPath();ctx.moveTo(cx-w,cy);ctx.quadraticCurveTo(cx,cy-h*1.6,cx+w,cy);ctx.quadraticCurveTo(cx,cy+h*1.3,cx-w,cy);ctx.closePath();
  ctx.fillStyle='#f2ece2';ctx.fill();ctx.clip();
  const ix=cx+f.gx*w*.5,iy=cy+f.gy*h*.45;
  ctx.fillStyle=pp.iris||'#3a2416';ctx.beginPath();ctx.arc(ix,iy,.085*u,0,7);ctx.fill();
  ctx.fillStyle='#0b0705';ctx.beginPath();ctx.arc(ix,iy,.045*u,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(ix-.028*u,iy-.03*u,.022*u,0,7);ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(cx-w,cy-h*1.6,2*w,h*.75);
  ctx.restore();
  ctx.strokeStyle='#170e09';ctx.lineWidth=(pp.fem?.05:.038)*u;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(cx-w*1.05,cy+.005*u);ctx.quadraticCurveTo(cx,cy-h*1.65,cx+w*1.06,cy-.005*u);ctx.stroke();
  if(pp.fem){ctx.beginPath();ctx.moveTo(cx+side*w*1.0,cy-.01*u);ctx.lineTo(cx+side*w*1.32,cy-h*.75);ctx.stroke();}
  ctx.strokeStyle=shade(pp.skin,-.32);ctx.lineWidth=.022*u;
  ctx.beginPath();ctx.moveTo(cx-w*.85,cy-h*1.7);ctx.quadraticCurveTo(cx,cy-h*2.6,cx+w*.9,cy-h*1.6);ctx.stroke();
}
function brow(cx,cy,u,ws,side,pp,raise){
  const c=pp.hair.style==='bald'||pp.hair.c==='#bdb7ae'?shade(pp.hair.c,-.35):shade(pp.hair.c,-.05);
  ctx.strokeStyle=c;ctx.lineWidth=(pp.fem?.05:.075)*u;ctx.lineCap='round';
  const y=cy-raise*.06*u;
  ctx.beginPath();ctx.moveTo(cx-side*.15*u*ws,y+.02*u);ctx.quadraticCurveTo(cx+side*.05*u*ws,y-.09*u,cx+side*.22*u*ws,y-.01*u);ctx.stroke();
}
function mouthShape(mx,my,u,pp,smile,open){
  const w=.24*u,lip=rgbHex(mix(pp.skin,pp.fem?'#9a3c50':'#7a3b34',pp.fem?.45:.3));
  const cy=my-smile*.06*u;
  if(open>0){ctx.fillStyle='#2a0f0c';ctx.beginPath();ctx.ellipse(mx,my+open*.4,w*.72,open,0,0,7);ctx.fill();ctx.fillStyle='#efe9df';ctx.fillRect(mx-w*.45,my-open*.5,w*.9,open*.45);}
  // upper lip
  ctx.fillStyle=shade(lip,-.15);
  ctx.beginPath();ctx.moveTo(mx-w,cy);ctx.quadraticCurveTo(mx-w*.5,my-.08*u,mx,my-.045*u);ctx.quadraticCurveTo(mx+w*.5,my-.08*u,mx+w,cy);ctx.quadraticCurveTo(mx,my+.01*u-open*.3,mx-w,cy);ctx.fill();
  // lower lip
  ctx.fillStyle=lip;ctx.beginPath();ctx.moveTo(mx-w*.88,cy+.01*u);ctx.quadraticCurveTo(mx,my+.15*u+open,mx+w*.88,cy+.01*u);ctx.quadraticCurveTo(mx,my+.03*u+open,mx-w*.88,cy+.01*u);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.ellipse(mx-.04*u,my+.08*u+open,.08*u,.025*u,0,0,7);ctx.fill();
  if(open<=0){ctx.strokeStyle='rgba(40,12,10,.7)';ctx.lineWidth=.022*u;ctx.beginPath();ctx.moveTo(mx-w,cy);ctx.quadraticCurveTo(mx,my+.035*u+smile*.03*u,mx+w,cy);ctx.stroke();}
}
function rgbHex(rgb){const m=rgb.match(/\d+/g).map(Number);return '#'+m.slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');}
function beard(pp,u,dx,type){
  const c=pp.hair.c;ctx.fillStyle=c;ctx.globalAlpha=.93;
  if(type==='full'){
    ctx.beginPath();ctx.moveTo(-.82*u,0);ctx.bezierCurveTo(-.8*u,.55*u,-.55*u,1.15*u,dx*.6,1.18*u);ctx.bezierCurveTo(.55*u,1.15*u,.8*u,.55*u,.82*u,0);
    ctx.lineTo(.66*u,.12*u);ctx.quadraticCurveTo(.55*u+dx,.45*u,.34*u+dx,.5*u);ctx.quadraticCurveTo(.3*u+dx,.82*u,dx*1.1,.82*u);ctx.quadraticCurveTo(-.3*u+dx,.82*u,-.34*u+dx,.5*u);ctx.quadraticCurveTo(-.55*u+dx,.45*u,-.66*u,.12*u);ctx.closePath();ctx.fill();
  }else if(type==='goatee'){
    ctx.beginPath();ctx.moveTo(-.3*u+dx,.52*u);ctx.quadraticCurveTo(-.32*u+dx,.98*u,dx*1.1,1.04*u);ctx.quadraticCurveTo(.32*u+dx,.98*u,.3*u+dx,.52*u);ctx.quadraticCurveTo(.2*u+dx,.8*u,dx*1.1,.8*u);ctx.quadraticCurveTo(-.2*u+dx,.8*u,-.3*u+dx,.52*u);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function mustache(pp,u,dx){ctx.fillStyle=pp.hair.c;ctx.beginPath();ctx.moveTo(-.3*u+dx*1.1,.56*u);ctx.quadraticCurveTo(-.15*u+dx*1.1,.4*u,dx*1.1,.45*u);ctx.quadraticCurveTo(.15*u+dx*1.1,.4*u,.3*u+dx*1.1,.56*u);ctx.quadraticCurveTo(dx*1.1,.5*u,-.3*u+dx*1.1,.56*u);ctx.fill();}

function drawPersonUpper(pp,X,Y,u,turn,f,talking){
  ctx.save();ctx.translate(X,Y);
  const dx=turn*.2*u,skin=pp.skin,sd=shade(skin,-.32),sl=shade(skin,.16);
  // chair back
  const cg=ctx.createLinearGradient(-2.3*u,0,2.3*u,0);cg.addColorStop(0,'#2a170d');cg.addColorStop(.5,'#4a2c18');cg.addColorStop(1,'#2a170d');
  ctx.fillStyle=cg;rr(-2.15*u,.55*u,4.3*u,4*u,.5*u);ctx.fill();
  backHair(pp,u,dx);
  // neck
  const ng=ctx.createLinearGradient(0,.5*u,0,1.6*u);ng.addColorStop(0,shade(skin,-.45));ng.addColorStop(.5,sd);ng.addColorStop(1,skin);
  ctx.fillStyle=ng;ctx.fillRect(-.36*u+dx*.4,.5*u,.72*u,1.2*u);
  // torso with a V collar
  const sy=1.35*u;
  const tg=ctx.createLinearGradient(0,sy-.3*u,0,sy+3*u);tg.addColorStop(0,shade(pp.shirt,.18));tg.addColorStop(1,shade(pp.shirt,-.4));
  ctx.fillStyle=tg;ctx.beginPath();
  ctx.moveTo(-.42*u+dx*.4,sy-.25*u);
  ctx.bezierCurveTo(-1.1*u,sy-.2*u,-1.75*u,sy-.05*u,-1.88*u,sy+.6*u);
  ctx.lineTo(-2.05*u,sy+3.6*u);ctx.lineTo(2.05*u,sy+3.6*u);ctx.lineTo(1.88*u,sy+.6*u);
  ctx.bezierCurveTo(1.75*u,sy-.05*u,1.1*u,sy-.2*u,.42*u+dx*.4,sy-.25*u);
  ctx.lineTo(dx*.4,sy+.45*u);ctx.closePath();ctx.fill();
  if(turn){const sg=ctx.createLinearGradient(-2*u,0,2*u,0);const far=turn>0?1:0;sg.addColorStop(far?0:1,'rgba(0,0,0,0)');sg.addColorStop(far?1:0,'rgba(0,0,0,.28)');ctx.fillStyle=sg;ctx.fill();}
  ctx.strokeStyle=shade(pp.shirt,-.3);ctx.lineWidth=.08*u;ctx.beginPath();ctx.moveTo(-.42*u+dx*.4,sy-.25*u);ctx.lineTo(dx*.4,sy+.45*u);ctx.lineTo(.42*u+dx*.4,sy-.25*u);ctx.stroke();
  // shoulder seam folds
  ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=.04*u;ctx.beginPath();ctx.moveTo(-1.3*u,sy+.1*u);ctx.quadraticCurveTo(-1.2*u,sy+.9*u,-1.35*u,sy+1.6*u);ctx.moveTo(1.3*u,sy+.1*u);ctx.quadraticCurveTo(1.2*u,sy+.9*u,1.35*u,sy+1.6*u);ctx.stroke();
  // ears (the far one hides when the head is turned)
  for(const s of [-1,1]){if(Math.abs(turn)>.3&&Math.sign(turn)===s)continue;
    const ex=s*.82*u+dx*.5;ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(ex,.03*u,.14*u,.23*u,0,0,7);ctx.fill();
    ctx.fillStyle=sd;ctx.beginPath();ctx.ellipse(ex+s*.02*u,.03*u,.07*u,.13*u,0,0,7);ctx.fill();
    if(pp.earrings){ctx.fillStyle='#e0b84a';ctx.beginPath();ctx.arc(ex,.3*u,.06*u,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.arc(ex-.02*u,.28*u,.02*u,0,7);ctx.fill();}}
  // head
  ctx.save();ctx.translate(dx*.25,0);headPath(u);
  const hg=ctx.createRadialGradient(-.25*u+dx,-.42*u,.1*u,0,0,1.45*u);hg.addColorStop(0,sl);hg.addColorStop(.55,skin);hg.addColorStop(1,sd);
  ctx.fillStyle=hg;ctx.fill();
  if(turn){ctx.save();ctx.clip();const sg=ctx.createLinearGradient(-.9*u,0,.9*u,0);const far=turn>0;sg.addColorStop(far?.45:0,far?'rgba(0,0,0,0)':'rgba(0,0,0,.22)');sg.addColorStop(far?1:.55,far?'rgba(0,0,0,.22)':'rgba(0,0,0,0)');ctx.fillStyle=sg;ctx.fillRect(-u,-1.2*u,2*u,2.4*u);ctx.restore();}
  ctx.restore();
  // cheeks + jaw shading
  if(pp.fem){for(const s of [-1,1]){const g=ctx.createRadialGradient(s*.45*u+dx,.3*u,0,s*.45*u+dx,.3*u,.28*u);g.addColorStop(0,'rgba(200,80,90,.16)');g.addColorStop(1,'rgba(200,80,90,0)');ctx.fillStyle=g;ctx.fillRect(s*.45*u+dx-.3*u,0,.6*u,.6*u);}}
  // face
  const now=clk;
  const mood=now<f.moodUntil?f.mood:0;
  const smile=clamp((pp.smile||.15)+mood*.7,-.6,1);
  const raise=(f.think?.9:0)+(mood>0?.4:0)+(mood<0?-.3:0);
  const ex=.33*u,ey=-.07*u;
  const far=turn>0?1:-1,fs=1-.35*Math.abs(turn);
  if(pp.beard==='full'||pp.beard==='goatee')beard(pp,u,dx,pp.beard);
  eye(-ex+dx,ey,u,far<0?fs:1,-1,pp,f);eye(ex+dx,ey,u,far>0?fs:1,1,pp,f);
  brow(-ex+dx,-.3*u,u,far<0?fs:1,-1,pp,raise+(f.think?.3:0));brow(ex+dx,-.3*u,u,far>0?fs:1,1,pp,raise);
  // nose
  const nx=dx*1.3;
  ctx.strokeStyle=shade(skin,-.38);ctx.lineWidth=.03*u;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(nx+(turn>=0?.08:-.08)*u,-.02*u);ctx.quadraticCurveTo(nx+(turn>=0?.13:-.13)*u,.15*u,nx+(turn>=0?.12:-.12)*u,.28*u);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.13)';ctx.beginPath();ctx.ellipse(nx-.01*u,.25*u,.07*u,.06*u,0,0,7);ctx.fill();
  ctx.fillStyle=shade(skin,-.6);for(const s of [-1,1]){ctx.beginPath();ctx.ellipse(nx+s*.075*u,.345*u,.045*u,.024*u,s*.3,0,7);ctx.fill();}
  ctx.strokeStyle=shade(skin,-.35);ctx.lineWidth=.025*u;for(const s of [-1,1]){ctx.beginPath();ctx.arc(nx+s*.11*u,.3*u,.065*u,s>0?-1.2:Math.PI*.7,s>0?.5:Math.PI*1.9+.3);ctx.stroke();}
  // mouth (moves while talking)
  const open=talking&&!reduce?(.03+.045*Math.abs(Math.sin(now*.022)))*u:0;
  mouthShape(dx*1.15,.6*u,u,pp,smile,open);
  if(pp.beard==='mustache'||pp.beard==='goatee'||pp.beard==='full')mustache(pp,u,dx);
  frontHair(pp,u,dx);
  if(pp.glasses){
    ctx.strokeStyle='#1d1d22';ctx.lineWidth=.04*u;
    for(const s of [-1,1]){const gx=s*ex+dx,w=(s===far?fs:1)*.27*u;rr(gx-w,ey-.13*u,2*w,.25*u,.07*u);ctx.fillStyle='rgba(220,235,255,.08)';ctx.fill();ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=.02*u;ctx.beginPath();ctx.moveTo(gx-w*.6,ey+.06*u);ctx.lineTo(gx-w*.1,ey-.09*u);ctx.stroke();ctx.strokeStyle='#1d1d22';ctx.lineWidth=.04*u;}
    ctx.beginPath();ctx.moveTo(-ex+dx+.27*u*(far<0?fs:1),ey-.03*u);ctx.quadraticCurveTo(dx,ey-.08*u,ex+dx-.27*u*(far>0?fs:1),ey-.03*u);ctx.stroke();
  }
  ctx.restore();
}
// Arms on the table, both hands holding the fan of cards; one hand reaches out when playing.
function drawArms(pp,X,Y,u,home,reach,n,fanAngle){
  const sleeve=pp.shirt,skin=pp.skin,long=pp.long;
  const sh=[{x:X-1.6*u,y:Y+1.85*u},{x:X+1.6*u,y:Y+1.85*u}];
  const hands=[{x:home.x-.55*u,y:home.y},{x:home.x+.55*u,y:home.y}];
  if(reach){const k=reach.side,a=reach.a;hands[k]={x:lerp(hands[k].x,reach.x,a*.62),y:lerp(hands[k].y,reach.y,a*.62)};}
  // fan of card backs between the hands
  const fc={x:home.x,y:home.y-.05*u};
  if(n>0){ctx.save();ctx.translate(fc.x,fc.y);ctx.rotate(fanAngle||0);
    const cw=.62*u,spread=Math.min(.09,.9/n);
    for(let i=0;i<n;i++){const a=(i-(n-1)/2)*spread;ctx.save();ctx.rotate(a);ctx.translate(0,-.55*u);drawBack(0,0,cw,0,.5);ctx.restore();}
    ctx.restore();}
  for(let k=0;k<2;k++){
    const s=sh[k],h=hands[k],el={x:lerp(s.x,h.x,.3)+(k?.25:-.25)*u,y:Math.max(s.y+.6*u,h.y+.3*u)};
    const limb=(a,b,w1,w2,col)=>{const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(a.x+nx*w1,a.y+ny*w1);ctx.lineTo(b.x+nx*w2,b.y+ny*w2);ctx.lineTo(b.x-nx*w2,b.y-ny*w2);ctx.lineTo(a.x-nx*w1,a.y-ny*w1);ctx.closePath();ctx.fill();ctx.beginPath();ctx.arc(a.x,a.y,w1,0,7);ctx.arc(b.x,b.y,w2,0,7);ctx.fill();};
    limb(s,el,.36*u,.3*u,shade(sleeve,-.12));
    const cuff={x:lerp(el.x,h.x,long?.75:.15),y:lerp(el.y,h.y,long?.75:.15)};
    limb(el,cuff,.3*u,.26*u,shade(sleeve,-.2));
    limb(cuff,h,.24*u,.2*u,shade(skin,-.08));
    // hand
    ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(h.x,h.y,.26*u,.21*u,k?-.4:.4,0,7);ctx.fill();
    ctx.strokeStyle=shade(skin,-.35);ctx.lineWidth=.025*u;for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(h.x-.12*u+j*.1*u,h.y-.14*u);ctx.lineTo(h.x-.12*u+j*.1*u,h.y-.02*u);ctx.stroke();}
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.ellipse(h.x-.06*u,h.y-.07*u,.1*u,.05*u,0,0,7);ctx.fill();
  }
}

/* ---------- card drawing ---------- */
let BACK=null;
function backPattern(){
  if(BACK)return BACK;const n=24,c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d');
  g.fillStyle='#1f3c74';g.fillRect(0,0,n,n);g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=1.4;
  g.beginPath();g.moveTo(0,n/2);g.lineTo(n/2,0);g.lineTo(n,n/2);g.lineTo(n/2,n);g.closePath();g.stroke();
  g.fillStyle='rgba(242,179,61,.5)';g.beginPath();g.arc(n/2,n/2,2,0,7);g.fill();
  BACK=ctx.createPattern(c,'repeat');return BACK;
}
function drawBack(x,y,w,rot,shadow){
  const h=w*1.4;ctx.save();ctx.translate(x,y);ctx.rotate(rot||0);
  if(shadow){ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=w*.12;ctx.shadowOffsetY=w*.04;}
  ctx.fillStyle='#f6f2ea';rr(-w/2,-h/2,w,h,w*.09);ctx.fill();ctx.shadowColor='transparent';
  ctx.fillStyle=backPattern();rr(-w/2+w*.07,-h/2+w*.07,w*.86,h-w*.14,w*.06);ctx.fill();
  ctx.strokeStyle='rgba(242,179,61,.6)';ctx.lineWidth=Math.max(1,w*.02);ctx.stroke();
  ctx.restore();
}
function drawFace(x,y,w,rot,c,o){
  o=o||{};const h=w*1.4;ctx.save();ctx.translate(x,y);ctx.rotate(rot||0);
  ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=w*.14;ctx.shadowOffsetY=w*.05;
  ctx.fillStyle='#fbf8f1';rr(-w/2,-h/2,w,h,w*.09);ctx.fill();ctx.shadowColor='transparent';
  ctx.strokeStyle=o.sel?'#f2b33d':'rgba(0,0,0,.25)';ctx.lineWidth=o.sel?Math.max(2.5,w*.05):1;ctx.stroke();
  const col=isRed(c)?'#c4213a':'#17171c';ctx.fillStyle=col;ctx.textAlign='center';ctx.textBaseline='middle';
  if(c.s==='J'){
    ctx.font=`700 ${w*.2}px "Barlow Condensed", Arial, sans-serif`;
    'JOKER'.split('').forEach((ch,i)=>ctx.fillText(ch,-w*.33,-h*.36+i*w*.2));
    ctx.font=`${w*.55}px serif`;ctx.fillText('★',w*.06,h*.02);
    ctx.font=`700 ${w*.16}px "Barlow Condensed", Arial, sans-serif`;ctx.fillText(c.id==='BJ'?'BIG':'LITTLE',w*.08,h*.33);
  }else{
    ctx.font=`700 ${w*.34}px "Barlow Condensed", Arial, sans-serif`;ctx.fillText(RL(c.r),-w*.3,-h*.36);
    ctx.font=`${w*.26}px serif`;ctx.fillText(SYM[c.s],-w*.3,-h*.17);
    if(c.r>=11&&c.r<=13){
      ctx.fillStyle=isRed(c)?'rgba(196,33,58,.1)':'rgba(23,23,28,.08)';rr(-w*.15,-h*.32,w*.55,h*.66,w*.05);ctx.fill();
      ctx.strokeStyle=col;ctx.lineWidth=1;ctx.stroke();ctx.fillStyle=col;
      ctx.font=`700 ${w*.42}px Graduate, Georgia, serif`;ctx.fillText(RL(c.r),w*.12,-h*.04);
      ctx.font=`${w*.22}px serif`;ctx.fillText(SYM[c.s],w*.12,h*.2);
    }else{ctx.font=`${w*(c.r===14?.62:.5)}px serif`;ctx.fillText(SYM[c.s],w*.1,h*.07);}
  }
  if(o.dim){ctx.fillStyle='rgba(10,20,15,.45)';rr(-w/2,-h/2,w,h,w*.09);ctx.fill();}
  if(o.glow){ctx.strokeStyle='rgba(242,179,61,.9)';ctx.lineWidth=2;rr(-w/2,-h/2,w,h,w*.09);ctx.stroke();}
  ctx.restore();
}

/* ---------- table state ---------- */
const S={H:[[],[],[],[]],shown:[0,0,0,0],trick:[],tricks:[0,0,0,0],bids:[null,null,null,null],played:new Set(),broken:false,
  dealer:rint(4),scores:[0,0],bags:[0,0],hand:0,turn:-1,mode:null,legal:new Set(),sel:new Set(),pick:null,
  flies:[],say:[null,null,null,null],reach:[null,null,null,null],kitty:[],kittyShown:0,contract:null,kittyBook:null,collected:[0,0,0,0],
  target:GAME==='whist'?7:500,started:false,over:false,people:[]};
let seatPeople=[];
function choosePeople(){const pool=PEOPLE.slice().sort(()=>Math.random()-.5);seatPeople=[null,pool[0],pool[1],pool[2]];}
const nameOf=s=>s===0?'You':seatPeople[s].name;

/* ---------- layout ---------- */
let W=0,H=0,u=10,L={};
function resize(){
  const r=wrap.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,3);W=r.width;H=r.height;
  cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  u=Math.min(W*.115,H*.072);
  const fy=H*.34;
  const hw=Math.min(W*.19,H*.13,96),hh=hw*1.4,cw=Math.min(W*.15,H*.105,80),ch=cw*1.4;
  const handTop=H-hh*.98,cx=W/2,cy=(fy+handTop)/2+u*.2;
  L={fy,hw,hh,cw,ch,cx,cy,handTop,
    table:{fy,fxl:W*.17,fxr:W*.83},
    seat:[
      null,
      {x:W*.1,y:fy-u*.75,s:.9,turn:.55,home:{x:W*.1+u*1.3,y:fy+u*2.45}},
      {x:W*.5,y:fy-u*1.95*.78,s:.78,turn:0,home:{x:W*.5,y:fy+u*.2}},
      {x:W*.9,y:fy-u*.75,s:.9,turn:-.55,home:{x:W*.9-u*1.3,y:fy+u*2.45}}
    ],
    spot:[{x:cx,y:cy+ch*.42},{x:cx-cw*.88,y:cy},{x:cx,y:cy-ch*.42},{x:cx+cw*.88,y:cy}],
    pile:[{x:W*.1,y:handTop-ch*.35},{x:W*.17,y:cy+ch*.9},{x:W*.5+u*2.2,y:fy+u*.9},{x:W*.83,y:cy+ch*.9}]
  };
}
if(window.ResizeObserver)new ResizeObserver(resize).observe(wrap);else addEventListener('resize',resize);

function handRects(){
  const h=S.H[0],n=Math.min(h.length,S.shown[0]);if(!n)return [];
  const {hw,hh}=L,avail=W-12,step=Math.min(hw*.66,(avail-hw)/Math.max(1,n-1)),total=hw+step*(n-1),x0=(W-total)/2+hw/2,baseY=H-hh*.5+6;
  return h.slice(0,n).map((c,i)=>{const t=n>1?i/(n-1)-.5:0;const up=(S.mode==='play'&&S.turn===0&&S.legal.has(c.id))?hh*.1:0;const sel=S.sel.has(c.id)?hh*.22:0;
    return {c,x:x0+i*step,y:baseY+t*t*hh*.35-up-sel,rot:t*.22};});
}
function handPos(seat){const sp=L.seat[seat];return {x:sp.home.x,y:sp.home.y-u*1.2*sp.s};}

/* ---------- animation helpers ---------- */
function fly(o){return new Promise(res=>{o.t0=clk;o.dur=(o.dur||300)*FAST;o.res=res;S.flies.push(o);});}
function say(seat,text,ms){S.say[seat]={text,until:clk+(ms||1800)*FAST};}
function mood(seat,m,ms){if(seat===0)return;FACE[seat].mood=m;FACE[seat].moodUntil=clk+(ms||1400);}
function reachTo(seat,to){if(seat===0)return;S.reach[seat]={t0:clk,dur:520*FAST,x:to.x,y:to.y,side:seat===3?0:1};}

/* ---------- drawing the room and table ---------- */
function drawRoom(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2b1d16');g.addColorStop(.4,'#3a2618');g.addColorStop(1,'#140d09');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // wood paneling on the wall
  ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1;for(let x=-10;x<W;x+=W/7){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,L.fy);ctx.stroke();}
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(0,L.fy*.62,W,3);
  // framed picture on the wall
  ctx.fillStyle='#5a3a1c';ctx.fillRect(W*.7,L.fy*.08,W*.18,L.fy*.22);ctx.fillStyle='#2f4a5a';ctx.fillRect(W*.715,L.fy*.1,W*.15,L.fy*.18);
  ctx.fillStyle='rgba(242,179,61,.25)';ctx.beginPath();ctx.arc(W*.79,L.fy*.17,L.fy*.04,0,7);ctx.fill();
  // hanging lamp and its glow
  ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,L.fy*.12);ctx.stroke();
  ctx.fillStyle='#1c3d2a';ctx.beginPath();ctx.moveTo(W/2-W*.1,L.fy*.22);ctx.lineTo(W/2-W*.04,L.fy*.12);ctx.lineTo(W/2+W*.04,L.fy*.12);ctx.lineTo(W/2+W*.1,L.fy*.22);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.ellipse(W/2,L.fy*.22,W*.1,L.fy*.025,0,0,7);ctx.fill();
}
function tablePath(){
  const t=L.table,ny=H+40,nxl=-W*.3,nxr=W*1.3,r=u*1.6;
  ctx.beginPath();ctx.moveTo(t.fxl+r,t.fy);ctx.lineTo(t.fxr-r,t.fy);ctx.quadraticCurveTo(t.fxr,t.fy,t.fxr+r*.4,t.fy+r*.8);
  ctx.lineTo(nxr,ny);ctx.lineTo(nxl,ny);ctx.lineTo(t.fxl-r*.4,t.fy+r*.8);ctx.quadraticCurveTo(t.fxl,t.fy,t.fxl+r,t.fy);ctx.closePath();
}
function drawTable(){
  ctx.save();tablePath();
  ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=u;ctx.fillStyle='#4a2a14';ctx.fill();ctx.shadowColor='transparent';
  ctx.lineWidth=u*.55;const wg=ctx.createLinearGradient(0,L.fy,0,H);wg.addColorStop(0,'#7a4a24');wg.addColorStop(1,'#3d220f');ctx.strokeStyle=wg;ctx.stroke();
  ctx.clip();
  const fg=ctx.createRadialGradient(W/2,L.cy,u,W/2,L.cy,Math.max(W,H)*.75);fg.addColorStop(0,'#2f7a4a');fg.addColorStop(.45,'#1f5c36');fg.addColorStop(1,'#0e2c19');
  ctx.fillStyle=fg;ctx.fillRect(0,0,W,H);
  // lamp light pool
  const lg=ctx.createRadialGradient(W/2,L.cy-u,0,W/2,L.cy,Math.max(W,H)*.5);lg.addColorStop(0,'rgba(255,240,190,.16)');lg.addColorStop(1,'rgba(255,240,190,0)');ctx.fillStyle=lg;ctx.fillRect(0,0,W,H);
  ctx.restore();
  ctx.save();tablePath();ctx.lineWidth=2;ctx.strokeStyle='rgba(255,220,160,.25)';ctx.stroke();ctx.restore();
}
function drawBubble(seat){
  const b=S.say[seat];if(!b||clk>b.until)return;
  let x,y,anchor;
  if(seat===0){x=W/2;y=L.handTop-u*.6;anchor='b';}
  else{const sp=L.seat[seat];x=sp.x+(seat===1?u*.9:seat===3?-u*.9:u*1.1)*sp.s;y=sp.y-u*.55*sp.s;anchor=seat===3?'r':'l';}
  ctx.save();ctx.font='700 16px "Barlow Condensed", Arial, sans-serif';
  const tw=ctx.measureText(b.text).width,pw=tw+20,ph=28;
  let bx=anchor==='r'?x-pw:anchor==='b'?x-pw/2:x;bx=clamp(bx,4,W-pw-4);const by=y-ph;
  ctx.fillStyle='rgba(251,248,241,.96)';ctx.shadowColor='rgba(0,0,0,.4)';ctx.shadowBlur=8;rr(bx,by,pw,ph,ph/2);ctx.fill();ctx.shadowColor='transparent';
  ctx.beginPath();const tx=clamp(x,bx+ph/2,bx+pw-ph/2);ctx.moveTo(tx-7,by+ph-1);ctx.lineTo(tx,by+ph+9);ctx.lineTo(tx+7,by+ph-1);ctx.fill();
  ctx.fillStyle='#1b1405';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.text,bx+pw/2,by+ph/2+1);ctx.restore();
}
function plate(seat){
  let x,y;
  if(seat===0){x=W*.5;y=L.handTop-u*.15;}
  else{const sp=L.seat[seat];x=sp.x;y=sp.y-u*sp.s*(seat===2?1.6:1.55);}
  const parts=[nameOf(seat)];
  const b=S.bids[seat];
  if(GAME==='spades'&&b!=null)parts.push(b===0?'Nil':'Bid '+b);
  if(GAME==='whist'&&S.contract&&S.contract.seat===seat)parts.push('Bid '+S.contract.n);
  if(S.phase==='play'||S.phase==='done')parts.push(S.tricks[seat]+(S.tricks[seat]===1?' book':' books'));
  const txt=parts.join(' · ');
  ctx.save();ctx.font='600 14px "Barlow Condensed", Arial, sans-serif';
  const tw=ctx.measureText(txt).width,pw=tw+16,ph=22;let bx=clamp(x-pw/2,3,W-pw-3);
  const on=S.turn===seat;
  ctx.fillStyle=on?'rgba(242,179,61,.95)':'rgba(10,20,14,.78)';rr(bx,y-ph/2,pw,ph,ph/2);ctx.fill();
  ctx.fillStyle=on?'#1b1405':'#f3efe4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,bx+pw/2,y+1);
  if(S.dealer===seat){ctx.fillStyle='#f3efe4';ctx.beginPath();ctx.arc(bx+pw+12,y,9,0,7);ctx.fill();ctx.fillStyle='#14263f';ctx.font='700 13px "Barlow Condensed", Arial';ctx.fillText('D',bx+pw+12,y+1);}
  ctx.restore();
}
function drawPiles(){
  for(let s=0;s<4;s++){const n=S.collected[s];if(!n)continue;const p=L.pile[s];for(let i=0;i<Math.min(n,8);i++)drawBack(p.x+i*1.2,p.y-i*1.6,L.cw*.5,s%2?Math.PI/2:0,i===0);}
  if(S.kittyBook){const s=S.contract.seat,p=L.pile[s];drawBack(p.x-L.cw*.35,p.y+4,L.cw*.5,.3,true);}
}
function draw(){
  if(!W)return;
  drawRoom();
  // the three computer players, upper bodies behind the table
  for(const s of [2,1,3]){const sp=L.seat[s],pp=seatPeople[s];if(!pp)continue;
    drawPersonUpper(pp,sp.x,sp.y,u*sp.s,sp.turn,FACE[s],!!(S.say[s]&&clk<S.say[s].until));}
  drawTable();
  drawPiles();
  // kitty in the middle during whist bidding
  if(S.kittyShown){for(let i=0;i<S.kittyShown;i++)drawBack(L.cx-L.cw*.3+i*3,L.cy-i*2,L.cw*.85,.05*i,i===0);}
  // arms, hands and held cards
  for(const s of [2,1,3]){const sp=L.seat[s],pp=seatPeople[s];if(!pp)continue;
    let reach=null;const r=S.reach[s];if(r){const p=(clk-r.t0)/r.dur;if(p>=1)S.reach[s]=null;else reach={...r,a:Math.sin(Math.PI*clamp(p,0,1))};}
    drawArms(pp,sp.x,sp.y,u*sp.s,sp.home,reach,S.shown[s],s===1?.25:s===3?-.25:0);}
  // cards on the table
  for(const t of S.trick){const p=L.spot[t.seat];drawFace(p.x,p.y,L.cw,t.rot,t.c,{glow:S.winGlow===t});}
  for(const s of [1,2,3])plate(s);
  // flying cards
  for(const f of S.flies){const p=clamp((clk-f.t0)/f.dur,0,1),e=1-Math.pow(1-p,3);
    const x=lerp(f.x0,f.x1,e),y=lerp(f.y0,f.y1,e),w=lerp(f.w0,f.w1,e),r=lerp(f.r0||0,f.r1||0,e);
    if(f.face)drawFace(x,y,w,r,f.card);else drawBack(x,y,w,r,true);}
  // your hand
  const rects=handRects();
  rects.forEach(rc=>{const dim=S.mode==='play'&&S.turn===0&&!S.legal.has(rc.c.id);drawFace(rc.x,rc.y,L.hw,rc.rot,rc.c,{dim,sel:S.sel.has(rc.c.id)});});
  plate(0);
  for(let s=0;s<4;s++)drawBubble(s);
}

/* ---------- faces come alive: blinking, glancing, thinking ---------- */
function updateFaces(dt){
  for(let s=1;s<4;s++){
    const f=FACE[s],sp=L.seat[s];if(!sp)continue;
    if(f.blinkT>0)f.blinkT-=dt;else if(clk>f.blinkAt){f.blinkT=130;f.blinkAt=clk+rnd(1800,5200);}
    let tx=L.cx,ty=L.cy;
    if(S.turn===s){tx=sp.home.x;ty=sp.home.y+u*2;}               // looking at own cards
    else if(S.turn>=0&&S.turn!==s){const o=S.turn===0?{x:W/2,y:H}:L.seat[S.turn];tx=o.x;ty=o.y;}
    if(f.think){tx=sp.x+(s===3?-1:1)*u*2;ty=sp.y-u*3;}
    const dx=tx-sp.x,dy=ty-sp.y,d=Math.hypot(dx,dy)||1;
    f.tgx=clamp(dx/d*1.1-sp.turn*.4,-1,1);f.tgy=clamp(dy/d*1.1,-1,1);
    f.gx+=(f.tgx-f.gx)*Math.min(1,dt*.008);f.gy+=(f.tgy-f.gy)*Math.min(1,dt*.008);
  }
}

/* ---------- AI ---------- */
function isBoss(c,seat){
  const e=esuit(c),p=power(c);if(e==='J'||p<0)return false;
  const mine=new Set(S.H[seat].map(x=>x.id));
  if(S.kittyBook&&S.contract&&S.contract.seat===seat)S.kittyBook.forEach(x=>mine.add(x.id));
  for(const d of FULL){if(d.id===c.id||S.played.has(d.id)||mine.has(d.id))continue;if(esuit(d)===e&&power(d)>p)return false;}
  return true;
}
const isNil=s=>GAME==='spades'&&S.bids[s]===0;
function teamBid(tm){let b=0;for(const s of [tm,tm+2])if(S.bids[s])b+=S.bids[s];return b;}
function teamTricks(tm){let t=0;for(const s of [tm,tm+2])if(!isNil(s))t+=S.tricks[s];return t;}
function wantMore(seat){
  if(GAME==='whist')return true;
  const tm=team(seat),rem=13-S.tricks.reduce((a,b)=>a+b,0);
  if(teamTricks(tm)<teamBid(tm))return true;
  const oppNeed=teamBid(1-tm)-teamTricks(1-tm);
  return oppNeed>0&&oppNeed>=rem-1;
}
function aiPlay(seat){
  const hand=S.H[seat],L1=legal(hand,S.trick);
  if(L1.length===1)return L1[0];
  return S.trick.length?aiFollow(seat,L1):aiLead(seat,L1);
}
function aiLead(seat,Lg){
  if(isNil(seat))return minBy(Lg,val);
  const trumps=Lg.filter(isTrump),side=Lg.filter(c=>!isTrump(c));
  const decl=GAME==='whist'&&S.contract&&team(seat)===team(S.contract.seat);
  if(decl&&trumps.length>=2){const b=trumps.filter(c=>isBoss(c,seat));if(b.length)return maxBy(b,power);}
  const boss=side.filter(c=>isBoss(c,seat));
  if(boss.length&&wantMore(seat))return maxBy(boss,power);
  if(GAME==='spades'&&S.bids[partnerOf(seat)]===0){const hi=side.filter(c=>power(c)>=12);if(hi.length)return maxBy(hi,power);}
  if(side.length){const g={};side.forEach(c=>(g[esuit(c)]=g[esuit(c)]||[]).push(c));const longest=maxBy(Object.values(g),a=>a.length+(a.some(c=>isBoss(c,seat))?.5:0));return minBy(longest,power);}
  const bt=trumps.filter(c=>isBoss(c,seat));return bt.length?maxBy(bt,power):minBy(Lg,val);
}
function aiFollow(seat,Lg){
  const trick=S.trick,last=trick.length===3;
  const win=Lg.filter(c=>beats(c,seat)),lose=Lg.filter(c=>!beats(c,seat));
  const curW=winnerOf(trick),pWin=team(curW)===team(seat);
  const dump=()=>minBy(lose.length?lose:Lg,val);
  if(isNil(seat))return lose.length?maxBy(lose,val):minBy(Lg,val);
  const p=partnerOf(seat);
  if(GAME==='spades'&&S.bids[p]===0){
    const pPlayed=trick.some(t=>t.seat===p);
    if(!pPlayed)return win.length?maxBy(win,val):dump();
    if(curW===p)return win.length?minBy(win,val):dump();
  }
  const want=wantMore(seat);
  if(pWin){const wc=trick.find(t=>t.seat===curW).c;if(last||isBoss(wc,seat)||!want)return dump();}
  if(!want)return lose.length?maxBy(lose,val):minBy(win,val);
  if(win.length){
    if(last)return minBy(win,val);
    const cheap=minBy(win,val);
    if(trick.length===1){if(isBoss(cheap,seat)||(isTrump(cheap)&&ledSuit(trick)!==R.trump))return cheap;return dump();}
    const bw=win.filter(c=>isBoss(c,seat));return bw.length?minBy(bw,val):maxBy(win,val);
  }
  return dump();
}

/* ---------- Spades: bidding + scoring ---------- */
function spadesEst(h){
  const by=bySuit(h),sp=by.S,ns=sp.length;let t=0;
  for(const s of ['H','D','C']){const c=by[s],n=c.length,has=r=>c.some(x=>x.r===r);
    if(has(14))t+=n<=6?1:.6;if(has(13))t+=n>=2?(has(14)?.9:.65):.2;if(has(12)&&n>=3&&(has(14)||has(13)))t+=.35;
    if(ns>=3){if(n===0)t+=.9;else if(n===1&&!has(14))t+=.5;}}
  const has=r=>sp.some(x=>x.r===r);
  if(has(14))t+=1;if(has(13))t+=ns>=2?1:.4;if(has(12))t+=ns>=3?.75:.25;if(has(11)&&ns>=4)t+=.35;
  t+=Math.max(0,ns-4)*.85;
  return t;
}
function spadesBidAI(seat){
  const h=S.H[seat],t=spadesEst(h),sp=h.filter(c=>c.s==='S');
  if(t<1.4&&!sp.some(c=>c.r>=10)&&sp.length<=3&&!h.some(c=>c.r>=13)&&S.bids[partnerOf(seat)]!==0)return 0;
  let b=Math.max(1,Math.round(t));
  const pb=S.bids[partnerOf(seat)];if(pb!=null&&pb+b>13)b=Math.max(1,13-pb);
  return Math.min(13,b);
}
const bidWord=b=>b===0?'Nil':String(b);
function scoreSpades(){
  const res=[];
  for(const tm of [0,1]){
    const seats=[tm,tm+2],bid=teamBid(tm),took=teamTricks(tm);let pts=0,bags=0;const notes=[];
    if(bid>0){if(took>=bid){pts+=10*bid+(took-bid);bags+=took-bid;}else{pts-=10*bid;notes.push('set');}}
    for(const s of seats)if(isNil(s)){if(S.tricks[s]===0){pts+=100;notes.push(nameOf(s)+' made nil');}else{pts-=100;bags+=S.tricks[s];pts+=S.tricks[s];notes.push(nameOf(s)+' missed nil');}}
    S.bags[tm]+=bags;if(S.bags[tm]>=10){S.bags[tm]-=10;pts-=100;notes.push('10 bags: −100');}
    S.scores[tm]+=pts;
    res.push({tm,bid,took:seats.reduce((a,s)=>a+S.tricks[s],0),pts,notes});
  }
  return res;
}

/* ---------- Bid Whist: bidding, declaring, scoring ---------- */
const PW=(c,dir)=>c.s==='J'?0:(dir==='down'?(c.r===14?14:15-c.r):c.r);
const KIND={up:'Uptown',down:'Downtown',nt:'No Trump'};
const bidName=b=>b.n+' '+KIND[b.kind];
const bidVal=(n,k)=>n*2+(k==='nt'?1:0);
function whistEval(h,kind,trump,dir){
  let b=0;const by=bySuit(h);
  if(kind==='nt'){
    for(const s of SUITS){const ps=by[s].map(c=>PW(c,dir)).sort((a,b)=>b-a);let top=14,run=0;for(const p of ps){if(p===top){run++;top--;}else break;}
      b+=run;if(run&&ps.length>=4)b+=(ps.length-3)*.5;else if(!run&&ps[0]===13&&ps.length>=2)b+=.45;}
    return b;
  }
  const tr=h.filter(c=>c.s==='J'||c.s===trump),tp=tr.filter(c=>c.s!=='J').map(c=>PW(c,dir));
  b+=tr.filter(c=>c.s==='J').length;
  [14,13,12].forEach((r,i)=>{if(tp.includes(r)&&tr.length>=i+1)b+=[1,.8,.6][i];});
  b+=Math.max(0,tr.length-3)*.9;
  for(const s of SUITS){if(s===trump)continue;const ps=by[s].map(c=>PW(c,dir));if(ps.includes(14))b+=ps.length<=5?.9:.5;if(ps.includes(13)&&ps.length>=2)b+=.45;
    if(tr.length>=4){if(!ps.length)b+=.8;else if(ps.length===1&&!ps.includes(14))b+=.4;}}
  return b;
}
function whistBest(h){
  let best=null;
  for(const dir of ['up','down']){
    for(const t of SUITS){const v=whistEval(h,dir,t,dir);if(!best||v>best.v)best={v,kind:dir};}
    const v=whistEval(h,'nt',null,dir);if(v>best.v)best={v,kind:'nt'};
  }
  return best;
}
function whistBidAI(seat,high,forced){
  const best=whistBest(S.H[seat]),n=clamp(Math.floor(best.v+1+3-6),0,7),k=best.kind;
  if(forced)return {n:Math.max(3,Math.min(n,4)),kind:k};
  if(n<3)return null;
  for(let m=3;m<=n;m++)if(!high||bidVal(m,k)>bidVal(high.n,high.kind))return {n:m,kind:k};
  return null;
}
function whistDeclareAI(seat){
  const h=S.H[seat],k=S.contract.kind;
  if(k==='nt')return {trump:null,dir:whistEval(h,'nt',null,'up')>=whistEval(h,'nt',null,'down')?'up':'down'};
  return {trump:maxBy(SUITS,t=>whistEval(h,k,t,k)),dir:k};
}
function chooseDiscards(seat){
  const h=S.H[seat],by=bySuit(h);
  const key=c=>{if(c.s==='J')return R.trump?1000:-1000;const p=PW(c,R.dir);return (isTrump(c)?500:0)+p*3+(p>=13?40:0)+by[c.s].length;};
  return h.slice().sort((a,b)=>key(a)-key(b)).slice(0,6);
}
function setContract(opt){R.trump=opt.trump;R.dir=opt.dir;R.nt=!opt.trump;S.contract.trump=opt.trump;S.contract.dir=opt.dir;}
function contractText(c){if(!c)return '—';if(c.trump===undefined)return bidName(c);
  return c.n+' '+(c.kind==='nt'?'No Trump '+(c.dir==='down'?'↓':'↑'):(c.dir==='down'?'Down ':'Up ')+SYM[c.trump]);}
function scoreWhist(){
  const c=S.contract,tm=team(c.seat),books=S.tricks[c.seat]+S.tricks[partnerOf(c.seat)]+1,need=6+c.n,mult=c.kind==='nt'?2:1;
  let pts;if(books>=need)pts=(books-6)*mult;else pts=-c.n*mult;
  S.scores[tm]+=pts;
  return {tm,books,need,pts,made:books>=need,boston:books===13};
}

/* ---------- user input ---------- */
function showBox(html){const b=$('bidbox');b.innerHTML=html;b.hidden=false;return b;}
function hideBox(){const b=$('bidbox');b.hidden=true;b.onclick=null;}
function hint(t){$('hint').textContent=t||'';}
function userBidSpades(){
  return new Promise(res=>{
    const sug=Math.max(0,Math.round(spadesEst(S.H[0]))),pb=S.bids[2];
    if(AUTO){wait(100).then(()=>res(spadesBidAI(0)));return;}
    const b=showBox(`<h3>Your bid</h3><p>${pb==null?'Your partner hasn\'t bid yet.':esc(nameOf(2))+' bid '+bidWord(pb)+'.'} Suggested: <b>${sug||'1'}</b>. Nil = you'll take no books.</p>
      <div class="bidgrid">${Array.from({length:14},(_,n)=>`<button type="button" data-n="${n}" class="${n===(sug||1)?'sug':''}">${n?n:'Nil'}</button>`).join('')}</div>`);
    hint('How many books (tricks) will you take?');
    b.onclick=e=>{const n=e.target.closest('button')?.dataset.n;if(n==null)return;hideBox();res(+n);};
  });
}
function userBidWhist(high,forced){
  return new Promise(res=>{
    if(AUTO){wait(100).then(()=>res(whistBidAI(0,high,forced)));return;}
    const sug=whistBidAI(0,high,forced);
    let kind=sug?sug.kind:'up',n=null;
    const minFor=k=>{for(let m=3;m<=7;m++)if(!high||bidVal(m,k)>bidVal(high.n,high.kind))return m;return 99;};
    function render(){
      const b=showBox(`<h3>${forced?'Everyone passed. Dealer must bid.':'Your bid'}</h3>
        <p>${high?'High bid: '+esc(nameOf(high.seat))+', '+bidName(high)+'.':'No bids yet.'} Suggested: <b>${sug?bidName(sug):'Pass'}</b>.</p>
        <div class="seg">${['up','down','nt'].map(k=>`<button type="button" data-k="${k}" class="${k===kind?'on':''}">${KIND[k]}</button>`).join('')}</div>
        <div class="bidgrid five">${[3,4,5,6,7].map(m=>`<button type="button" data-n="${m}" class="${m===n?'on':''}" ${m<minFor(kind)?'disabled':''}>${m}</button>`).join('')}</div>
        <div class="acts"><button type="button" data-a="bid" class="go" ${n?'':'disabled'}>${n?'BID '+n+' '+KIND[kind].toUpperCase():'PICK A NUMBER'}</button>${forced?'':'<button type="button" data-a="pass" class="ghost">PASS</button>'}</div>`);
      b.onclick=e=>{const t=e.target.closest('button');if(!t||t.disabled)return;
        if(t.dataset.k){kind=t.dataset.k;if(n&&n<minFor(kind))n=null;render();}
        else if(t.dataset.n){n=+t.dataset.n;render();}
        else if(t.dataset.a==='bid'&&n){hideBox();res({n,kind});}
        else if(t.dataset.a==='pass'){hideBox();res(null);}};
    }
    hint('Bid books over 6. Uptown: high cards win. Downtown: low cards win.');
    render();
  });
}
function userDeclare(){
  return new Promise(res=>{
    if(AUTO){wait(100).then(()=>res(whistDeclareAI(0)));return;}
    const c=S.contract,nt=c.kind==='nt';
    const opts=nt?[['up','Uptown','High cards win'],['down','Downtown','Low cards win']]:SUITS.map(s=>[s,SYM[s],SNAME[s]]);
    const b=showBox(`<h3>You won the bid: ${bidName(c)}</h3><p>The kitty is in your hand. ${nt?'No trump. Pick the direction.':'Pick your trump suit.'}</p>
      <div class="bidgrid ${nt?'two':'four'}">${opts.map(o=>`<button type="button" data-o="${o[0]}" class="${!nt&&(o[0]==='H'||o[0]==='D')?'red':''}"><span class="big">${o[1]}</span><small>${o[2]}</small></button>`).join('')}</div>`);
    hint('');
    b.onclick=e=>{const o=e.target.closest('button')?.dataset.o;if(!o)return;hideBox();res(nt?{trump:null,dir:o}:{trump:o,dir:c.kind});};
  });
}
function userDiscard(){
  return new Promise(res=>{
    if(AUTO){wait(100).then(()=>res(chooseDiscards(0)));return;}
    S.mode='discard';S.sel=new Set();
    const render=()=>{const k=S.sel.size;const b=showBox(`<h3>Discard 6 cards</h3><p>Tap cards in your hand to pick them. Your discards count as your team's first book.</p>
      <div class="acts"><button type="button" data-a="ok" class="go" ${k===6?'':'disabled'}>${k===6?'DISCARD THESE 6':'PICKED '+k+' OF 6'}</button></div>`);b.classList.add('top');
      b.onclick=e=>{if(e.target.closest('button')?.dataset.a==='ok'&&S.sel.size===6){const d=S.H[0].filter(c=>S.sel.has(c.id));S.sel=new Set();S.mode=null;hideBox();$('bidbox').classList.remove('top');res(d);}};};
    S.onSel=render;render();hint('Tap 6 cards to throw away.');
  });
}
function userPlay(){
  return new Promise(res=>{
    S.mode='play';S.legal=new Set(legal(S.H[0],S.trick).map(c=>c.id));S.pick=res;
    const led=ledSuit(S.trick);
    hint(S.trick.length?(led&&S.H[0].some(c=>esuit(c)===led)?'Your turn. Follow '+SNAME[led]+' '+SYM[led]+'.':'Your turn. You can\'t follow suit, so play anything.'):'Your lead. Tap a card to play it.'+(GAME==='spades'&&!S.broken&&S.H[0].some(c=>c.s!=='S')?' Spades aren\'t broken yet.':''));
    if(AUTO)wait(80).then(()=>{if(S.mode==='play'){S.mode=null;res(aiPlay(0));}});
  });
}
cv.addEventListener('pointerdown',e=>{
  ac();
  const r=cv.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;
  if(S.mode!=='play'&&S.mode!=='discard')return;
  const rects=handRects();const {hw,hh}=L;
  for(let i=rects.length-1;i>=0;i--){const rc=rects[i];
    if(px>rc.x-hw/2&&px<rc.x+hw/2&&py>rc.y-hh/2&&py<rc.y+hh/2){
      if(S.mode==='discard'){if(S.sel.has(rc.c.id))S.sel.delete(rc.c.id);else if(S.sel.size<6)S.sel.add(rc.c.id);S.onSel&&S.onSel();return;}
      if(!S.legal.has(rc.c.id)){hint(GAME==='spades'&&!S.trick.length?'Spades aren\'t broken yet. Lead another suit.':'You have to follow suit.');return;}
      S.mode=null;S.pick(rc.c);return;}
  }
});

/* ---------- the game ---------- */
function newHandState(){S.H=[[],[],[],[]];S.shown=[0,0,0,0];S.trick=[];S.tricks=[0,0,0,0];S.collected=[0,0,0,0];S.bids=[null,null,null,null];S.played=new Set();S.broken=false;S.contract=null;S.kitty=[];S.kittyShown=0;S.kittyBook=null;S.phase='deal';S.winGlow=null;}
async function deal(){
  newHandState();
  if(GAME==='whist'){R.trump=null;R.dir='up';R.nt=false;}else{R.trump='S';R.dir='up';R.nt=false;}
  const d=newDeck(),per=GAME==='whist'?12:13;
  for(let i=0;i<4*per;i++){const s=(S.dealer+1+i)%4;S.H[s].push(d[i]);}
  if(GAME==='whist')S.kitty=d.slice(4*per);
  sortHand(S.H[0]);
  sfx.shuffle();hud();await wait(500);
  const from=S.dealer===0?{x:W/2,y:H-L.hh}:L.seat[S.dealer].home;
  for(let i=0;i<4*per;i++){
    const s=(S.dealer+1+i)%4,to=s===0?{x:W/2,y:H-L.hh*.5}:handPos(s);
    fly({x0:from.x,y0:from.y,x1:to.x,y1:to.y,w0:L.cw*.6,w1:L.cw*.6,r0:0,r1:rnd(-.5,.5),dur:260}).then(()=>{S.shown[s]++;sfx.deal();});
    await wait(i%4===3?40:28);
    if(GAME==='whist'&&i%8===7&&S.kittyShown<6){S.kittyShown++;}
  }
  await wait(420);
  S.shown=S.H.map(h=>h.length);if(GAME==='whist')S.kittyShown=6;
}
async function think(seat,ms){FACE[seat].think=true;await wait(ms);FACE[seat].think=false;}
async function playCard(seat,c){
  const rc=seat===0?handRects().find(r=>r.c===c):null;
  const from=seat===0?{x:rc.x,y:rc.y}:handPos(seat);
  const h=S.H[seat];h.splice(h.indexOf(c),1);S.shown[seat]=h.length;S.played.add(c.id);
  if(GAME==='spades'&&c.s==='S')S.broken=true;
  const to=L.spot[seat];reachTo(seat,to);sfx.card();
  const ledBefore=ledSuit(S.trick);
  await fly({x0:from.x,y0:from.y,x1:to.x,y1:to.y,w0:seat===0?L.hw:L.cw*.6,w1:L.cw,r0:0,r1:rnd(-.18,.18),card:c,face:true,dur:seat===0?240:340});
  S.trick.push({seat,c,rot:rnd(-.16,.16)});
  if(seat!==0&&ledBefore&&isTrump(c)&&ledBefore!==R.trump&&Math.random()<.5)say(seat,pick(['Cut!','Trump!','Not today.']),1200);
  hud();
}
const WIN_LINES=['That\'s mine.','I\'ll take that.','Book!','Thank you!','Come to me.'];
const PARTNER_LINES=['Nice, partner!','That\'s what I\'m talking about.','Good one!','There you go!'];
const SIGH=['Hmm.','Okay, okay.','Lucky.','Watch this next one.'];
async function playTricks(n){
  S.phase='play';
  for(let k=0;k<n;k++){
    S.trick=[];
    for(let i=0;i<4;i++){
      const seat=(S.leader+i)%4;S.turn=seat;hud();
      let c;if(seat===0)c=await userPlay();else{await think(seat,rnd(500,900));c=aiPlay(seat);}
      hint('');await playCard(seat,c);
    }
    S.turn=-1;const w=winnerOf(S.trick);S.tricks[w]++;
    S.winGlow=S.trick.find(t=>t.seat===w);
    if(team(w)===0)sfx.win();else sfx.lose();
    for(let s=1;s<4;s++)mood(s,team(s)===team(w)?1:-.4,1400);
    if(w===0&&Math.random()<.45)say(2,pick(PARTNER_LINES),1500);
    else if(w!==0&&Math.random()<.3)say(w,pick(WIN_LINES),1300);
    else if(team(w)===0&&Math.random()<.2)say(pick([1,3]),pick(SIGH),1300);
    hud();await wait(900);
    // sweep the trick to the winner
    const p=L.pile[w];
    const sweeps=S.trick.map(t=>{const sp=L.spot[t.seat];return fly({x0:sp.x,y0:sp.y,x1:p.x,y1:p.y,w0:L.cw,w1:L.cw*.5,r0:t.rot,r1:w%2?Math.PI/2:0,dur:300});});
    S.trick=[];await Promise.all(sweeps);
    S.winGlow=null;S.collected[w]++;S.leader=w;hud();
  }
}
async function handSpades(){
  await deal();S.phase='bid';
  for(let i=0;i<4;i++){
    const s=(S.dealer+1+i)%4;S.turn=s;hud();
    let b;if(s===0)b=await userBidSpades();else{await think(s,rnd(700,1200));b=spadesBidAI(s);}
    S.bids[s]=b;say(s,b===0?'Nil!':'I\'ll take '+b+'.',1700);hud();await wait(550);
  }
  hint('');S.leader=(S.dealer+1)%4;
  await playTricks(13);
  S.phase='done';return scoreSpades();
}
async function handWhist(){
  await deal();S.phase='bid';
  let high=null;
  for(let i=0;i<4;i++){
    const s=(S.dealer+1+i)%4,forced=i===3&&!high;S.turn=s;hud();
    let b;if(s===0)b=await userBidWhist(high,forced);else{await think(s,rnd(800,1300));b=whistBidAI(s,high,forced);}
    if(b){high={...b,seat:s};say(s,bidName(b)+(forced?' (stuck)':''),1800);}else say(s,'Pass.',1200);
    hud();await wait(600);
  }
  S.contract=high;const d=high.seat;S.turn=d;hud();
  // kitty goes to the winning bidder
  const to=d===0?{x:W/2,y:H-L.hh*.5}:handPos(d);
  for(let i=0;i<6;i++){S.kittyShown--;fly({x0:L.cx,y0:L.cy,x1:to.x,y1:to.y,w0:L.cw*.85,w1:L.cw*.6,dur:300}).then(()=>S.shown[d]++);sfx.deal();await wait(60);}
  S.H[d].push(...S.kitty);S.kitty=[];await wait(320);S.shown[d]=S.H[d].length;
  if(d===0)sortHand(S.H[0]);
  let opt;if(d===0)opt=await userDeclare();else{await think(d,rnd(900,1400));opt=whistDeclareAI(d);}
  setContract(opt);sortHand(S.H[0]);
  say(d,opt.trump?SNAME[opt.trump]+', '+KIND[opt.dir]+'!':'No trump, '+KIND[opt.dir]+'!',2000);hud();
  let disc;if(d===0)disc=await userDiscard();else{await wait(700);disc=chooseDiscards(d);}
  disc.forEach(c=>S.H[d].splice(S.H[d].indexOf(c),1));S.shown[d]=S.H[d].length;S.kittyBook=disc;
  if(d===0)sortHand(S.H[0]);
  hint('');await wait(500);
  S.leader=d;await playTricks(12);
  S.phase='done';return scoreWhist();
}
function gameWinner(){
  const [a,b]=S.scores,t=S.target,low=GAME==='whist'?-t:-200;
  if((a>=t||b>=t)&&a!==b)return a>b?0:1;
  if(a<=low&&b>low)return 1;if(b<=low&&a>low)return 0;
  return null;
}
async function runGame(){
  S.scores=[0,0];S.bags=[0,0];S.hand=0;S.over=false;choosePeople();resize();
  say(1,pick(['Let\'s play.','Shuffle up!','Deal \'em.']),1600);
  while(true){
    S.hand++;S.dealer=(S.dealer+1)%4;
    const res=GAME==='whist'?await handWhist():await handSpades();
    S.turn=-1;hud();
    const w=gameWinner();
    await summary(res,w);
    if(w!=null){S.over=true;return;}
  }
}
function summary(res,w){
  return new Promise(resolve=>{
    let rows='',head='';
    if(GAME==='spades'){
      head=`<h2>Hand ${S.hand}</h2>`;
      rows=`<table class="sum"><tr><th></th><th>Bid</th><th>Took</th><th>Points</th><th>Score</th></tr>`+
        res.map(r=>`<tr class="${r.tm===0?'us':''}"><td>${r.tm===0?'You + '+esc(nameOf(2)):esc(nameOf(1))+' + '+esc(nameOf(3))}</td><td>${teamBidText(r.tm)}</td><td>${r.took}</td><td>${r.pts>0?'+':''}${r.pts}</td><td>${S.scores[r.tm]}<small> · ${S.bags[r.tm]} bags</small></td></tr>`).join('')+'</table>'+
        res.filter(r=>r.notes.length).map(r=>`<p class="note">${r.tm===0?'You':'They'}: ${r.notes.map(esc).join(', ')}.</p>`).join('');
    }else{
      const c=S.contract,us=res.tm===0;
      head=`<h2>${res.made?(us?'You made it!':'They made it.'):(us?'You got set.':'You set them!')}</h2>`;
      rows=`<p class="note">${esc(nameOf(c.seat))} bid ${contractText(c)} and needed ${res.need} books. ${us?'Your':'Their'} team took ${res.books} (kitty counts as 1). ${res.boston?'Boston! All 13 books. ':''}${res.pts>0?'+':''}${res.pts} for ${us?'you':'them'}.</p>
        <table class="sum"><tr><th></th><th>Score</th></tr><tr class="us"><td>You + ${esc(nameOf(2))}</td><td>${S.scores[0]}</td></tr><tr><td>${esc(nameOf(1))} + ${esc(nameOf(3))}</td><td>${S.scores[1]}</td></tr></table>`;
    }
    let btn='NEXT HAND',extra='';
    if(w!=null){
      const wins=+store.get(KEY+'-wins')||0;if(w===0)store.set(KEY+'-wins',wins+1);
      head=`<h2>${w===0?'You win the game!':'They win the game.'}</h2>`+head.replace('<h2>','<h3>').replace('</h2>','</h3>');
      btn='PLAY AGAIN';extra=`<p class="note">Final: ${S.scores[0]} to ${S.scores[1]}. Games won: ${+store.get(KEY+'-wins')||0}.</p>`;
      if(w===0){sfx.cheer();say(2,'We did it, partner!',2500);}else{sfx.set();say(1,'Good game!',2500);}
    }else if(GAME==='whist'&&res.made===(res.tm===0))sfx.win();
    const p=$('panel');p.innerHTML=head+rows+extra+`<button type="button" id="pNext">${btn}</button>`;p.hidden=false;
    if(AUTO)wait(300).then(()=>{if(!p.hidden)$('pNext').click();});
    $('pNext').onclick=()=>{p.hidden=true;if(w!=null)startGame();resolve();};
  });
}
function teamBidText(tm){const a=S.bids[tm],b=S.bids[tm+2];return [a,b].map(bidWord).join(' + ');}

/* ---------- HUD ---------- */
function hud(){
  $('scUs').textContent=S.scores[0];$('scThem').textContent=S.scores[1];
  $('nmThem').textContent=seatPeople[1]?seatPeople[1].name[0]+' & '+seatPeople[3].name[0]:'Them';
  $('nmUs').textContent=seatPeople[2]?'You & '+seatPeople[2].name[0]:'Us';
  if(GAME==='spades'){
    $('bagUs').textContent=S.bags[0]+' bags';$('bagThem').textContent=S.bags[1]+' bags';
    const bt=tm=>S.bids[tm]==null&&S.bids[tm+2]==null?'–':teamBid(tm)+(isNil(tm)||isNil(tm+2)?'·N':'');
    $('v3').textContent=bt(0)+' / '+bt(1);
    $('v4').textContent=(S.tricks[0]+S.tricks[2])+' / '+(S.tricks[1]+S.tricks[3]);
  }else{
    const c=S.contract;$('v3').textContent=c?contractText(c):'—';
    $('l3').textContent=c?'Bid · '+(c.seat===0?'You':seatPeople[c.seat].name):'Bid';
    const kb=t=>c&&team(c.seat)===t&&S.kittyBook?1:0;
    $('v4').textContent=(S.tricks[0]+S.tricks[2]+kb(0))+' / '+(S.tricks[1]+S.tricks[3]+kb(1));
  }
  $('strip').innerHTML=S.hand?`<b>Hand ${S.hand}</b> · ${esc(nameOf(S.dealer))} dealt · Game to ${S.target}`:`<b>${GAME==='whist'?'Bid Whist':'Spades'}</b> · You and ${seatPeople[2]?esc(seatPeople[2].name):'your partner'} vs the table`;
}

/* ---------- start ---------- */
function startScreen(){
  const p=$('panel');
  const targets=GAME==='whist'?[5,7]:[250,500];
  p.innerHTML=`<h2>${GAME==='whist'?'Bid Whist':'Spades'}</h2><p class="note">You sit with your partner across the table. Pick how long a game you want.</p>
    <div class="bidgrid two">${targets.map(t=>`<button type="button" data-t="${t}" class="${t===S.target?'on':''}"><span class="big">${t}</span><small>points to win</small></button>`).join('')}</div>
    <button type="button" id="pStart">DEAL THE CARDS</button>`;
  p.hidden=false;
  p.onclick=e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.t){S.target=+t.dataset.t;store.set(KEY+'-target',S.target);startScreen();}};
  $('pStart').onclick=()=>{p.onclick=null;p.hidden=true;ac();runGame();};
  if(AUTO)wait(200).then(()=>{if(!p.hidden)$('pStart').click();});
}
function startGame(){S.dealer=rint(4);choosePeople();newHandState();S.scores=[0,0];S.bags=[0,0];S.hand=0;hud();startScreen();}
S.target=+store.get(KEY+'-target')||S.target;

let last=performance.now();
function frame(now){
  const dt=Math.min(50,now-last);last=now;
  if(!window.GD_PAUSED){
    clk+=dt;
    for(let i=timers.length-1;i>=0;i--)if(clk>=timers[i].at){const t=timers[i];timers.splice(i,1);t.res();}
    for(let i=S.flies.length-1;i>=0;i--){const f=S.flies[i];if(clk-f.t0>=f.dur){S.flies.splice(i,1);f.res();}}
    updateFaces(dt);
  }
  draw();requestAnimationFrame(frame);
}
function closeIntro(){$('intro').hidden=true;store.set(KEY+'-seen','1');ac();}
$('introGo').addEventListener('click',closeIntro);
resize();choosePeople();hud();
if(store.get(KEY+'-seen')||AUTO)$('intro').hidden=true;
startGame();
requestAnimationFrame(frame);
window.__cards=S;
})();
