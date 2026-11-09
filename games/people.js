// Game Day Arcade: illustrated people (drawn, not photos). Shared by games that show people.
// Usage: const P=GDPeople(ctx); P.setClock(ms); P.draw(person,x,y,unit,turn,face,talking,{chair:false});
// face = {gx,gy,blinkT,mood,moodUntil,think,angry}
window.GDPeople=function(ctx){
let clk=0;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
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
function brow(cx,cy,u,ws,side,pp,raise,angry){
  const c=pp.hair.style==='bald'||pp.hair.c==='#bdb7ae'?shade(pp.hair.c,-.35):shade(pp.hair.c,-.05);
  ctx.strokeStyle=c;ctx.lineWidth=(pp.fem?.05:.075)*u;ctx.lineCap='round';
  const y=cy-raise*.06*u;
  if(angry){ctx.beginPath();ctx.moveTo(cx-side*.15*u*ws,y+.07*u);ctx.lineTo(cx+side*.22*u*ws,y-.08*u);ctx.stroke();return;}
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

function drawPersonUpper(pp,X,Y,u,turn,f,talking,opt){
  opt=opt||{};
  ctx.save();ctx.translate(X,Y);
  const dx=turn*.2*u,skin=pp.skin,sd=shade(skin,-.32),sl=shade(skin,.16);
  // chair back
  const cg=ctx.createLinearGradient(-2.3*u,0,2.3*u,0);cg.addColorStop(0,'#2a170d');cg.addColorStop(.5,'#4a2c18');cg.addColorStop(1,'#2a170d');
  if(opt.chair!==false){ctx.fillStyle=cg;rr(-2.15*u,.55*u,4.3*u,4*u,.5*u);ctx.fill();}
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
  if(pp.suit){ // white shirt, tie and lapels in the V of the jacket
    const cx=dx*.4;ctx.fillStyle='#f4f1ea';ctx.beginPath();ctx.moveTo(-.42*u+cx,sy-.25*u);ctx.lineTo(.42*u+cx,sy-.25*u);ctx.lineTo(cx,sy+1.1*u);ctx.closePath();ctx.fill();
    ctx.fillStyle=pp.tie||'#a3202f';ctx.beginPath();ctx.moveTo(cx-.12*u,sy-.22*u);ctx.lineTo(cx+.12*u,sy-.22*u);ctx.lineTo(cx+.07*u,sy-.05*u);ctx.lineTo(cx+.17*u,sy+.9*u);ctx.lineTo(cx,sy+1.12*u);ctx.lineTo(cx-.17*u,sy+.9*u);ctx.lineTo(cx-.07*u,sy-.05*u);ctx.closePath();ctx.fill();
    ctx.fillStyle=shade(pp.shirt,-.12);for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(cx+s*.42*u,sy-.25*u);ctx.lineTo(cx+s*.62*u,sy+.25*u);ctx.lineTo(cx+s*.3*u,sy+.45*u);ctx.lineTo(cx+s*.08*u,sy+1.1*u);ctx.lineTo(cx+s*.05*u,sy+1.15*u);ctx.lineTo(cx+s*.36*u,sy-.2*u);ctx.closePath();ctx.fill();}
  }
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
  brow(-ex+dx,-.3*u,u,far<0?fs:1,-1,pp,raise+(f.think?.3:0),f.angry);brow(ex+dx,-.3*u,u,far>0?fs:1,1,pp,raise,f.angry);
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

return {draw:drawPersonUpper,PEOPLE,shade,mix,rr,setClock:t=>{clk=t;}};
};
