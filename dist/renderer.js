const W = 1280, H = 720;
const PALETTES = [
  {sky:'#0b1421', haze:'#204247', stone:'#25343c', moss:'#4a8584', glow:'#8be3ce', moon:'#eee3b8'},
  {sky:'#101725', haze:'#283e4c', stone:'#303946', moss:'#648695', glow:'#9ddde5', moon:'#e2ded0'},
  {sky:'#171326', haze:'#3f3048', stone:'#393441', moss:'#8d738b', glow:'#dbb5de', moon:'#ead6c6'},
  {sky:'#1b151c', haze:'#4b3837', stone:'#403638', moss:'#a18169', glow:'#f2cb8e', moon:'#f5d49a'},
  {sky:'#150e1d', haze:'#382a43', stone:'#322c3d', moss:'#735c88', glow:'#c7a3f0', moon:'#edc8cd'},
];

function rand(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function poly(c, pts, color) {
  c.fillStyle = color; c.beginPath(); pts.forEach((p,i)=>i ? c.lineTo(p[0],p[1]) : c.moveTo(p[0],p[1])); c.closePath(); c.fill();
}
function line(c, pts, color, width=1) {
  c.strokeStyle=color; c.lineWidth=width; c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.stroke();
}
function rect(c,x,y,w,h,color) {c.fillStyle=color;c.fillRect(x,y,w,h);}
function circle(c,x,y,r,color) {c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function glow(c,x,y,r,color) {
  const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,color);g.addColorStop(1,'transparent');
  c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
}

export class Renderer {
  constructor(canvas) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.t=0;this.cachedStage=0;
    this.backdrop=document.createElement('canvas');this.backdrop.width=W;this.backdrop.height=H;
    this.terrain=document.createElement('canvas');this.terrain.width=W;this.terrain.height=H;
    this.cachedPlatforms=null;this.cachedTerrainStage=0;
    this.specks=Array.from({length:62},(_,i)=>{const r=rand(i*503+8);return{x:r()*W,y:80+r()*580,s:.4+r()*1.6,v:3+r()*11,p:r()*7};});
    this.trails=[];
  }

  render(game,dt=1/60) {
    this.t+=Math.min(dt||1/60,.05);
    const c=this.ctx, r=this.canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
    const cw=Math.round((r.width||W)*dpr),ch=Math.round((r.height||H)*dpr);
    if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;}
    c.setTransform(1,0,0,1,0,0);c.fillStyle='#080f18';c.fillRect(0,0,cw,ch);
    const scale=Math.min(cw/W,ch/H);
    c.setTransform(scale,0,0,scale,(cw-W*scale)/2,(ch-H*scale)/2);
    c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
    const stage=Math.max(1,Math.min(5,game.stage||1));this.palette=PALETTES[stage-1];
    if(this.cachedStage!==stage){this.cachedStage=stage;this.makeBackdrop(stage);}
    c.drawImage(this.backdrop,0,0);
    this.skyMovement(c,stage);
    c.save();
    if(game.shake>0){const amount=Math.min(10,game.shake*1.5);c.translate(Math.sin(this.t*83)*amount,Math.cos(this.t*117)*amount*.6);}
    this.farMist(c);
    if(this.cachedPlatforms!==game.platforms||this.cachedTerrainStage!==stage){
      const terrainContext=this.terrain.getContext('2d');terrainContext.clearRect(0,0,W,H);
      for(const p of game.platforms||[])this.platform(terrainContext,p);
      this.decorations(terrainContext,game);
      this.cachedPlatforms=game.platforms;this.cachedTerrainStage=stage;
    }
    c.drawImage(this.terrain,0,0);
    if(game.portal)this.portal(c,game.portal);
    for(const d of game.drops||[])this.drop(c,d);
    for(const e of game.enemies||[])this.enemy(c,e);
    this.projectiles(c,game.projectiles||[]);
    if(game.player)this.hero(c,game.player);
    this.particles(c,game.particles||[]);
    for(const t of game.texts||[]) {
      c.save();c.globalAlpha=Math.max(0,Math.min(1,t.life*2));c.font='bold 19px "Trebuchet MS", sans-serif';c.textAlign='center';c.shadowColor='#07151b';c.shadowBlur=5;c.fillStyle=t.color||'#fff4d4';c.fillText(t.text,t.x,t.y);c.restore();
    }
    this.foreground(c);
    c.restore();
    const vignette=c.createRadialGradient(640,330,280,640,350,770);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#060d16a0');c.fillStyle=vignette;c.fillRect(0,0,W,H);
    if(game.flash>0){c.fillStyle=`rgba(224,255,245,${Math.min(.24,game.flash)})`;c.fillRect(0,0,W,H);}
    c.restore();
  }

  makeBackdrop(stage) {
    const c=this.backdrop.getContext('2d'),p=this.palette,r=rand(31415+stage*17);
    const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,p.sky);sky.addColorStop(.55,p.haze);sky.addColorStop(1,'#101e26');c.fillStyle=sky;c.fillRect(0,0,W,H);
    // Fine stars and the enormous, veiled eclipse.
    for(let i=0;i<160;i++){let x=r()*W,y=r()*430;circle(c,x,y,r()>.94?1.3:.65,`rgba(206,232,226,${.08+r()*.4})`);}
    glow(c,962,173,255,stage===5?'#bd90c21b':'#d5ddad16');
    glow(c,962,173,145,'#dedbb312');
    circle(c,962,173,91,p.moon);
    c.save();c.beginPath();c.arc(962,173,91,0,7);c.clip();
    for(let i=0;i<30;i++){circle(c,879+r()*168,90+r()*165,3+r()*17,'#8caa9d10');}
    circle(c,944,159,83,p.sky);c.restore();
    c.strokeStyle='#ebeed623';c.lineWidth=1;c.beginPath();c.arc(962,173,103,-1.9,2.5);c.stroke();
    // Drifting cloud banks, as hard-edged watercolor silhouettes.
    for(let j=0;j<7;j++){const x=-70+r()*1200,y=80+r()*270,w=160+r()*390;c.globalAlpha=.12;poly(c,[[x,y],[x+w*.22,y-8],[x+w*.36,y-5],[x+w*.53,y-12],[x+w*.73,y-2],[x+w,y+1],[x+w*.71,y+8],[x+w*.2,y+7]],'#527775');}c.globalAlpha=1;
    // Three layers give a quiet sense of enormous space.
    this.mountain(c,rand(188),'#192d37',290,75);
    this.ruins(c,rand(438),'#203941',330,.62);
    this.mountain(c,rand(199),'#203c43',410,50);
    this.ruins(c,rand(754),'#24454a',440,1);
    this.tree(c,86,620,290,'#172d33',rand(15));
    this.tree(c,1228,639,350,'#162b33',rand(26));
    this.tree(c,1135,577,210,'#203a3d',rand(71));
    // Broken ceremonial rings behind the path.
    c.save();c.strokeStyle='#638e8b25';c.lineWidth=11;c.beginPath();c.arc(702,480,108,3.3,5.65);c.stroke();c.lineWidth=2;c.beginPath();c.arc(702,480,121,3.4,5.67);c.stroke();c.restore();
    for(let i=0;i<36;i++){const x=r()*W,y=520+r()*140;rect(c,x,y,3+r()*6,120,'#183137');}
    const ground=c.createLinearGradient(0,500,0,720);ground.addColorStop(0,'transparent');ground.addColorStop(1,'#0b1823');c.fillStyle=ground;c.fillRect(0,500,W,220);
  }

  mountain(c,r,color,y,amplitude) {
    const points=[[0,H],[0,y]];for(let x=0;x<=W+60;x+=60)points.push([x,y-r()*amplitude]);points.push([W,H]);poly(c,points,color);
  }

  ruins(c,r,color,baseline,scale) {
    c.save();c.fillStyle=color;
    for(let i=0;i<11;i++){
      const x=-30+i*139+r()*35,w=(39+r()*42)*scale,h=(50+r()*120)*scale,y=baseline-h;
      rect(c,x,y,w,h+120,color);poly(c,[[x-6,y],[x+w*.12,y-10],[x+w*.31,y-10],[x+w*.31,y-18],[x+w*.48,y-18],[x+w*.48,y-7],[x+w*.75,y-7],[x+w*.83,y-15],[x+w,y-13],[x+w,y]],color);
      if(i%3===1){rect(c,x+w*.2,y-60*scale,w*.6,70*scale,color);poly(c,[[x+w*.1,y-60*scale],[x+w*.5,y-116*scale],[x+w*.9,y-60*scale]],color);rect(c,x+w*.47,y-134*scale,2,24*scale,color);}
      c.fillStyle='#91b5aa14';c.fillRect(x+w*.4,y+20*scale,5*scale,14*scale);
      if(i>0&&i%3!==0){c.strokeStyle=color;c.lineWidth=12*scale;c.beginPath();c.arc(x-38*scale,baseline+8,44*scale,Math.PI,0);c.stroke();rect(c,x-84*scale,baseline+5,12*scale,120,color);}
      for(let j=0;j<4;j++)rect(c,x+w*.17,y+45*scale+j*25*scale,w*.63,1,'#64857e10');
    }
    c.restore();
  }

  tree(c,x,y,h,color,r) {
    poly(c,[[x-20,y],[x-13,y-h*.42],[x-17,y-h*.68],[x-5,y-h],[x+4,y-h*.83],[x+10,y-h*.49],[x+28,y]],color);
    for(let j=0;j<7;j++){
      const by=y-h*(.2+j*.105),side=j%2?1:-1,len=35+r()*65;
      poly(c,[[x,by+17],[x+side*len,by-12],[x+side*(len+24),by-50],[x+side*(len-3),by-26],[x+side*12,by-4]],color);
      if(j>2)poly(c,[[x+side*(len-7),by-19],[x+side*(len-26),by-59],[x+side*(len-17),by-19]],color);
    }
  }

  skyMovement(c,stage) {
    const t=this.t;
    c.save();c.globalAlpha=.16;
    for(let i=0;i<3;i++){const x=((t*(4+i)+i*430)%1800)-300,y=220+i*47;const g=c.createLinearGradient(x,y,x+500,y);g.addColorStop(0,'transparent');g.addColorStop(.5,stage===5?'#b19eba':'#a7c9bd');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x,y,500,1+i);}
    c.restore();
    for(const s of this.specks){const x=(s.x+t*s.v*.2)%W,y=(((s.y-t*s.v*.18)%H)+H)%H;c.globalAlpha=.12+(Math.sin(t+s.p)+1)*.14;circle(c,x+Math.sin(t*.4+s.p)*7,y,s.s,'#c0e4c8');}c.globalAlpha=1;
  }

  farMist(c) {
    const t=this.t;
    for(let i=0;i<4;i++){
      const x=-180+i*380+Math.sin(t*.08+i)*60,y=536+i%2*62;
      c.save();c.scale(1,.18);glow(c,x,y/.18,310,'#80bab614');c.restore();
    }
  }

  platform(c,p) {
    const pal=this.palette,r=rand(Math.round(p.x*31+p.y*71+p.w));const ground=p.kind==='ground',h=Math.max(p.h||18,ground?70:26);
    c.fillStyle='#09161f';c.fillRect(p.x-2,p.y+5,p.w+4,h+5);
    rect(c,p.x,p.y,p.w,h,pal.stone);
    // Cool upper ledge, fractured tile face, and dark lower cutaway.
    rect(c,p.x,p.y,p.w,5,pal.moss);rect(c,p.x,p.y+5,p.w,4,'#172c32');
    for(let x=p.x+3;x<p.x+p.w-5;x+=28){const tw=Math.min(26,p.x+p.w-x-2);rect(c,x,p.y+11,tw,Math.min(h-12,18),r()>.5?'#31434a':'#2b3b44');rect(c,x,p.y+11,tw,2,'#728b8515');}
    if(ground){
      for(let row=1;row<4;row++)for(let x=p.x-18+row%2*19;x<p.x+p.w;x+=41){if(x>=p.x&&x+37<=p.x+p.w)rect(c,x,p.y+12+row*22,37,19,row>2?'#14242c':'#203039');}
    } else {
      poly(c,[[p.x,p.y+h-3],[p.x+14,p.y+h+10],[p.x+28,p.y+h+3],[p.x+44,p.y+h+17],[p.x+p.w*.4,p.y+h+9],[p.x+p.w*.52,p.y+h+15],[p.x+p.w*.69,p.y+h+3],[p.x+p.w-8,p.y+h+5],[p.x+p.w,p.y+h-3]],'#1b2b35');
      for(let j=0;j<p.w/90;j++){const x=p.x+20+r()*(p.w-40),length=12+r()*28;line(c,[[x,p.y+h-4],[x-3,p.y+h+length*.6],[x+1,p.y+h+length]],'#43645c',2);rect(c,x-5,p.y+h+length*.5,4,3,'#548675');}
    }
    // Moss and fine luminous grass never obscure collision edges.
    for(let x=p.x+3;x<p.x+p.w-3;x+=5+r()*9){const gh=2+r()*8;line(c,[[x,p.y],[x-2-r()*3,p.y-gh]],r()>.75?'#81b6a0':pal.moss,1);if(r()>.83)rect(c,x,p.y-2,3,2,'#bbd9a9');}
    for(let j=0;j<Math.floor(p.w/110);j++){const x=p.x+12+r()*(p.w-22);line(c,[[x,p.y+13],[x+4,p.y+19],[x+1,p.y+27]],'#102630',1);}
  }

  decorations(c,game) {
    const ground=(game.platforms||[]).filter(p=>p.kind==='ground');
    for(const p of ground){const r=rand(p.x*77+p.w);for(let i=0;i<p.w/160;i++){
      const x=p.x+25+r()*(p.w-50),y=p.y;
      if(i%3===0){const h=15+r()*14;poly(c,[[x-5,y],[x-8,y-h*.55],[x-1,y-h],[x+5,y-h*.6],[x+7,y]],'#4a7877');line(c,[[x-1,y-h+3],[x-1,y-3]],'#85bbae',1);glow(c,x,y-12,28,'#94edd510');}
      else {rect(c,x,y-10,3,10,'#304e4b');rect(c,x-4,y-13,11,4,'#659782');rect(c,x-1,y-14,6,2,'#a0c7a2');}
    }}
  }

  portal(c,p) {
    const x=p.x+p.w*.5,y=p.y+p.h*.5,t=this.t,active=p.active;
    c.save();
    if(active){
      glow(c,x,y,95,'#84e5d23b');c.save();c.translate(x,y);c.scale(.53,1);const g=c.createRadialGradient(0,0,4,0,0,p.h*.51);g.addColorStop(0,'#b4fff35a');g.addColorStop(.5,'#6ccab244');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(-p.h,-p.h,p.h*2,p.h*2);c.restore();
      c.strokeStyle='#92efd0';c.lineWidth=2;c.shadowBlur=12;c.shadowColor='#7fffcc';c.beginPath();c.ellipse(x,y,p.w*.36,p.h*.46,0,0,7);c.stroke();c.shadowBlur=0;
      c.strokeStyle='#b1fbd950';c.lineWidth=1;c.beginPath();c.ellipse(x,y,p.w*.47,p.h*.53,0,t,-1.5+t);c.stroke();
      for(let i=0;i<12;i++){const a=t*.7+i*Math.PI/6;circle(c,x+Math.cos(a)*p.w*.42,y+Math.sin(a)*p.h*.5,1.3,'#d7ffdf');}
    }
    rect(c,p.x-3,p.y+p.h-5,p.w+6,8,'#263d43');rect(c,p.x+1,p.y+p.h-5,p.w-2,2,active?'#9adbbb':'#4a6262');
    poly(c,[[p.x-3,p.y+p.h],[p.x-4,p.y+16],[p.x+3,p.y+6],[p.x+9,p.y+14],[p.x+6,p.y+p.h]],'#29434a');
    poly(c,[[p.x+p.w-5,p.y+p.h],[p.x+p.w-8,p.y+14],[p.x+p.w-2,p.y+6],[p.x+p.w+5,p.y+17],[p.x+p.w+5,p.y+p.h]],'#29434a');
    for(let j=0;j<3;j++){rect(c,p.x,p.y+25+j*19,3,5,active?'#a3ddbb':'#58736b');rect(c,p.x+p.w-1,p.y+25+j*19,3,5,active?'#a3ddbb':'#58736b');}
    c.restore();
  }

  drop(c,d) {
    const t=this.t,x=d.x,y=d.y+Math.sin(t*3+d.x)*4;
    c.save();glow(c,x,y,24,d.type==='heal'?'#ecb8a52b':'#a5f2d32b');
    if(d.type==='heal') {rect(c,x-3,y-7,6,14,'#efa99a');rect(c,x-7,y-3,14,6,'#efa99a');rect(c,x-2,y-5,3,9,'#ffe2bb');}
    else {poly(c,[[x,y-7],[x+5,y],[x,y+7],[x-5,y]],'#93d9c1');poly(c,[[x,y-7],[x+1,y],[x,y+7],[x-5,y]],'#d1f5d8');}
    c.restore();
  }

  hero(c,p) {
    const t=this.t,run=Math.abs(p.vx||0)>25&&p.grounded,step=run?Math.sin(t*20)*5:0,face=p.face||1;
    if(p.dashTime>0){this.trails.push({x:p.x,y:p.y,face,life:.2});}
    this.trails=this.trails.filter(s=>(s.life-=1/60)>0);
    for(const s of this.trails){c.save();c.globalAlpha=s.life*1.6;this.heroBody(c,{...p,x:s.x,y:s.y,face:s.face},0,0,'#6ce5d4');c.restore();}
    c.save();
    if(p.invuln>0&&Math.sin(t*55)>.5)c.globalAlpha=.55;
    glow(c,p.x+p.w/2,p.y+p.h*.6,39,p.dashTime>0?'#66ffdd48':'#76bca410');
    if(p.grounded){c.save();c.translate(p.x+p.w*.5,p.y+p.h+1);c.scale(1,.2);circle(c,0,0,23,'#07141c70');c.restore();}
    this.heroBody(c,p,step,t);
    c.restore();
    if(p.attackTime>0){
      const heavy=p.combo===3,radius=heavy?95:75;
      const cx=p.x+p.w*.5+face*5,cy=p.y+p.h*.5,progress=Math.min(1,p.attackTime/(heavy?.21:.17)),angle=(1-progress)*2.2-1.1;
      c.save();c.translate(cx,cy);c.scale(face,p.combo===2?-1:1);c.rotate(angle*.35);c.strokeStyle=heavy?'#fff1bd':'#dafff1';c.lineWidth=heavy?6:4;c.shadowColor='#91ebd5';c.shadowBlur=12;c.beginPath();c.arc(0,0,radius,-1.06,.76);c.stroke();c.shadowBlur=0;c.strokeStyle=heavy?'#ffe8a060':'#a1f1dc65';c.lineWidth=heavy?17:12;c.beginPath();c.arc(0,0,radius-9,-.98,.7);c.stroke();poly(c,[[radius-10,-33],[radius+9,-22],[radius+3,-14]],'#efffdc');c.restore();
    }
  }

  heroBody(c,p,step,t,tint=null) {
    const x=p.x+p.w/2,y=p.y,face=p.face||1;
    c.save();c.translate(x,y);c.scale(face,1);
    const robe=tint||'#29474e',light=tint||'#e0e6ca',shadow=tint||'#879f97';
    // Long red scarf signals motion even at sprite scale.
    const sway=Math.sin(t*5)*3;
    poly(c,[[-3,20],[-18,19],[-27,24+sway],[-37,22+sway],[-30,29+sway],[-16,27],[-1,24]],tint||'#b85e57');
    poly(c,[[-3,22],[-15,24],[-25,31+sway],[-15,30],[-1,26]],tint||'#e08a73');
    // Boots and split cloak.
    rect(c,-10,34,7,11+step, tint||'#172b34');rect(c,3,34,7,11-step,tint||'#172b34');
    rect(c,-11,42+step,9,4,tint||'#78958d');rect(c,2,42-step,11,4,tint||'#78958d');
    poly(c,[[-9,21],[7,20],[12,38],[3,37],[0,34],[-3,39],[-13,37]],robe);
    rect(c,-7,24,5,11,tint||'#456a6b');rect(c,-7,31,16,3,tint||'#a29d7b');rect(c,1,31,4,4,tint||'#e0cfa0');
    // Ivory antler-like mask; asymmetry makes the gaze readable.
    poly(c,[[-10,7],[-8,2],[-3,4],[4,2],[10,7],[9,18],[4,23],[-5,21],[-10,15]],light);
    poly(c,[[-10,7],[-14,-2],[-8,2],[-5,9]],light);poly(c,[[4,6],[10,-4],[10,6],[8,10]],light);
    poly(c,[[-10,10],[-7,11],[-5,19],[-1,22],[-6,21],[-10,16]],shadow);
    rect(c,-2,11,4,4,'#142b32');rect(c,6,10,3,4,'#142b32');rect(c,0,11,2,2,tint||'#a5e3cc');
    rect(c,-7,21,17,5,tint||'#d07c65');rect(c,3,23,8,3,tint||'#efac84');
    // Sword and mitten.
    c.save();c.translate(10,29);c.rotate(p.attackTime>0?-.85:.35);rect(c,0,-3,4,9,tint||'#334e53');rect(c,-4,-6,12,3,tint||'#b6bb9a');poly(c,[[0,-6],[0,-34],[2,-41],[4,-34],[4,-6]],tint||'#b5d5c3');rect(c,0,-29,1,22,tint||'#edf6d8');c.restore();
    rect(c,8,27,7,6,light);c.restore();
  }

  enemy(c,e) {
    const x=e.x+(e.w||30)/2,y=e.y,w=e.w||30,h=e.h||30,t=this.t,face=e.face||-1;
    c.save();
    if(e.hitFlash>0){c.shadowColor='#f6fff1';c.shadowBlur=15;}
    if(e.telegraph>0){const a=.35+Math.sin(t*28)*.18;glow(c,x,y+h*.5,w*1.35,`rgba(245,113,105,${a})`);c.strokeStyle='#fba08a';c.lineWidth=1;c.beginPath();c.ellipse(x,y+h+2,w*.9,5,0,0,7);c.stroke();}
    if(e.type==='boss'){
      if(e.telegraph>0)this.bossTelegraph(c,e);
      this.bossBody(c,e);
    }
    else{
      c.translate(x,y);c.scale(face,1);
      const white=e.hitFlash>0?'#f1f8db':null;
      if(e.type==='flyer'){
        const flap=Math.sin(t*13+e.x)*9,cy=h*.5;
        poly(c,[[0,cy],[w*.48,cy-11-flap],[w*.85,cy-5-flap],[w*.65,cy+4-flap],[w*.3,cy+6],[0,cy+5]],white||'#557b81');
        poly(c,[[0,cy],[-w*.5,cy-12-flap],[-w*.85,cy-4-flap],[-w*.6,cy+4-flap],[-w*.3,cy+5],[0,cy+5]],white||'#3e626c');
        poly(c,[[-8,cy-6],[0,cy-12],[8,cy-6],[9,cy+7],[0,cy+14],[-9,cy+7]],white||'#7a9e96');
        rect(c,-5,cy-1,4,3,'#e9d7ae');rect(c,3,cy-1,4,3,'#e9d7ae');
        poly(c,[[-5,cy-5],[-8,cy-15],[-1,cy-9]],white||'#a9c6b0');poly(c,[[3,cy-7],[9,cy-17],[8,cy-3]],white||'#a9c6b0');
      }else if(e.type==='archer'){
        const sway=Math.sin(t*2+e.x)*2;
        poly(c,[[-w*.35,15],[w*.3,13],[w*.47,h],[-w*.45,h]],white||'#65536d');
        poly(c,[[-w*.34,17],[-w*.3,5],[0,-2],[w*.34,5],[w*.4,17]],white||'#89738e');
        rect(c,-8,9,17,9,'#20303c');rect(c,-1,11,7,3,'#f4bbd0');
        rect(c,-w*.35,24,w*.7,4,white||'#a98f97');
        line(c,[[w*.5,11],[w*.76,22+sway],[w*.5,36]],white||'#9cbaad',2);line(c,[[w*.5,11],[w*.5,36]],'#bdc4a9',1);
        rect(c,w*.1,22,w*.65,3,'#d7bd91');
      }else{
        const step=Math.sin(t*10+e.x)*3;
        rect(c,-w*.38,h-7,7,7+step,'#263a42');rect(c,w*.17,h-7,7,7-step,'#263a42');
        poly(c,[[-w*.47,h-7],[-w*.4,12],[-w*.18,4],[w*.2,2],[w*.43,11],[w*.48,h-7]],white||'#546a70');
        poly(c,[[-w*.4,13],[-w*.53,-3],[-w*.13,7],[w*.07,3],[w*.39,-6],[w*.35,13]],white||'#95a5a1');
        rect(c,-w*.28,13,w*.58,9,'#24353e');rect(c,-w*.04,15,w*.29,4,'#e3ad9e');
        rect(c,-w*.34,h-13,w*.66,4,white||'#747c75');
        poly(c,[[w*.4,22],[w*.81,18],[w*.75,24],[w*.44,28]],white||'#b2b9a7');
      }
    }
    c.restore();
    if(e.hp<e.maxHp&&e.hp>0&&e.type!=='boss'){rect(c,e.x,e.y-10,w,3,'#122731');rect(c,e.x,e.y-10,w*Math.max(0,e.hp/e.maxHp),3,'#d89483');}
  }

  bossTelegraph(c,e) {
    const x=e.x+e.w/2,y=e.y+e.h,t=this.t,pulse=.25+(Math.sin(t*24)+1)*.13;
    c.save();c.globalAlpha=pulse;
    if(e.attackKind==='charge'){
      const end=e.face>0?1250:30,start=x+(e.face||-1)*e.w*.5;
      const g=c.createLinearGradient(start,0,end,0);g.addColorStop(0,'#ed9484');g.addColorStop(1,'#ed948415');
      c.fillStyle=g;c.fillRect(Math.min(start,end),y-12,Math.abs(end-start),12);
      for(let i=1;i<8;i++){const px=start+(end-start)*i/8;line(c,[[px-e.face*7,y-17],[px,y-11],[px-e.face*7,y-5]],'#ffe1af',2);}
    }else if(e.attackKind==='slam'){
      c.strokeStyle='#ffc4a0';c.lineWidth=3;c.beginPath();c.ellipse(x,y,125,13,0,0,7);c.stroke();
      c.fillStyle='#ef9a7733';c.beginPath();c.ellipse(x,y,125,13,0,0,7);c.fill();
      for(const side of [-1,1])line(c,[[x+side*65,y-4],[x+side*80,y-10],[x+side*95,y-4]],'#fff0b9',2);
    }else if(e.attackKind==='volley'){
      for(let i=0;i<5;i++){const a=i*Math.PI*.4+t*1.2;circle(c,x+Math.cos(a)*e.w*.8,e.y+e.h*.35+Math.sin(a)*e.h*.4,4,'#ffd2eb');}
    }
    c.restore();
  }

  bossBody(c,e) {
    const x=e.x+e.w/2,y=e.y,w=e.w,h=e.h,t=this.t,white=e.hitFlash>0?'#f2e8d9':null;
    c.save();c.translate(x,y);c.scale(e.face||-1,1);
    glow(c,0,h*.45,w*1.3,e.enraged?'#f19a7540':'#d57ed12c');
    const sway=Math.sin(t*2)*3;
    // Ancient antlered guardian, stone armor held together by violet light.
    poly(c,[[-w*.3,h*.31],[-w*.62,h*.45],[-w*.7,h*.9],[-w*.39,h*.81],[-w*.25,h*.56]],white||'#3c334d');
    poly(c,[[w*.3,h*.31],[w*.58,h*.45],[w*.67,h*.94],[w*.37,h*.81],[w*.25,h*.56]],white||'#56425f');
    poly(c,[[-w*.3,h*.33],[w*.3,h*.33],[w*.41,h*.76],[w*.21,h*.88],[0,h*.77],[-w*.27,h*.88],[-w*.42,h*.72]],white||'#685b71');
    poly(c,[[-w*.2,h*.79],[-w*.08,h*.78],[-w*.08,h],[-w*.31,h],[-w*.28,h*.93]],white||'#413c53');
    poly(c,[[w*.07,h*.78],[w*.23,h*.78],[w*.29,h],[w*.08,h]],white||'#594a61');
    poly(c,[[-w*.26,h*.13],[-w*.16,h*.02],[w*.12,0],[w*.29,h*.13],[w*.23,h*.35],[0,h*.45],[-w*.23,h*.34]],white||'#cec7b1');
    poly(c,[[-w*.23,h*.13],[-w*.43,-h*.13],[-w*.38,-h*.27],[-w*.52,-h*.17],[-w*.44,h*.04],[-w*.3,h*.22]],white||'#9e9aa2');
    poly(c,[[w*.22,h*.12],[w*.45,-h*.11],[w*.4,-h*.3],[w*.55,-h*.17],[w*.48,h*.03],[w*.29,h*.23]],white||'#d0c6b0');
    poly(c,[[-w*.38,-h*.08],[-w*.66,-h*.22],[-w*.56,-h*.05],[-w*.38,h*.03]],white||'#aca7a6');
    poly(c,[[w*.4,-h*.08],[w*.67,-h*.23],[w*.59,-h*.04],[w*.42,h*.03]],white||'#b9b3ab');
    poly(c,[[-w*.19,h*.17],[-w*.04,h*.2],[-w*.07,h*.26],[-w*.18,h*.25]],'#312b44');
    poly(c,[[w*.05,h*.2],[w*.2,h*.16],[w*.19,h*.25],[w*.07,h*.27]],'#312b44');
    rect(c,-w*.14,h*.21,w*.08,3,'#ffc5e3');rect(c,w*.08,h*.21,w*.08,3,'#ffc5e3');
    poly(c,[[-2,h*.28],[4,h*.28],[1,h*.38]],'#6b6573');
    line(c,[[-w*.25,h*.48],[0,h*.57],[w*.28,h*.46]],'#b09b9f',4);
    poly(c,[[0,h*.48],[w*.1,h*.6],[0,h*.71],[-w*.1,h*.6]],e.enraged?'#ffbc8e':'#d7abd0');glow(c,0,h*.6,28,e.enraged?'#ffc68d70':'#ffb5f352');
    // Oversized ceremonial blade.
    c.save();c.translate(w*.53,h*.57);c.rotate(-.3+sway*.015);rect(c,-3,-9,7,27,'#b39795');rect(c,-17,-12,34,5,'#aba59b');poly(c,[[-8,-12],[-11,-h*.6],[0,-h*.75],[11,-h*.6],[8,-12]],white||'#8c9ca2');poly(c,[[0,-h*.75],[11,-h*.6],[8,-12],[0,-12]],white||'#c3c5b6');c.restore();
    c.restore();
  }

  projectiles(c,projectiles) {
    for(const p of projectiles){const color=p.color||(p.hostile?'#ec9aaa':'#aff9d9');glow(c,p.x,p.y,(p.r||4)*5,p.hostile?'#ed80a438':'#b0ffd72d');line(c,[[p.x-(p.vx||0)*.035,p.y-(p.vy||0)*.035],[p.x,p.y]],color,(p.r||4)*.75);circle(c,p.x,p.y,p.r||4,color);circle(c,p.x,p.y,(p.r||4)*.4,'#fff4d8');}
  }

  particles(c,particles) {
    c.save();
    for(const p of particles){c.globalAlpha=Math.min(1,Math.max(0,p.life/(p.maxLife||.5)));const s=p.size||2;rect(c,p.x-s*.5,p.y-s*.5,s,s,p.color||'#c5e4c9');}
    c.restore();
  }

  foreground(c) {
    // A few dark fern fronds frame the playable space.
    for(const side of [0,1]){
      c.save();c.translate(side?W:0,H);c.scale(side?-1:1,1);
      const sway=Math.sin(this.t*.9+side)*3;
      for(let i=0;i<5;i++){const x=12+i*24,h=32+i%3*21;line(c,[[x,0],[x+7+sway,-h]],'#0b1b25',3);for(let j=0;j<4;j++){const y=-j*h/5;poly(c,[[x+j,y],[x-13+j,y-14],[x+4+j,y-7]],'#0b1b25');poly(c,[[x+3+j,y-4],[x+20+j,y-20],[x+5+j,y-12]],'#0b1b25');}}
      c.restore();
    }
  }
}
