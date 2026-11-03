const W = 1280, H = 720;
const PALETTES = [
  {sky:'#0b1421', haze:'#204247', stone:'#25343c', moss:'#4a8584', glow:'#8be3ce', moon:'#eee3b8'},
  {sky:'#101725', haze:'#283e4c', stone:'#303946', moss:'#648695', glow:'#9ddde5', moon:'#e2ded0'},
  {sky:'#21151c', haze:'#654039', stone:'#4e3b3c', moss:'#c17a4f', glow:'#ffb780', moon:'#f5d49a'},
  {sky:'#171e36', haze:'#425d70', stone:'#405566', moss:'#a3b2bb', glow:'#bfdaff', moon:'#e3e9f9'},
  {sky:'#150e1d', haze:'#382a43', stone:'#322c3d', moss:'#735c88', glow:'#c7a3f0', moon:'#edc8cd'},
];

function rand(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export function drawClassPortrait(canvas,id) {
  const c=canvas.getContext('2d');canvas.width=360;canvas.height=260;
  const color=id==='warrior'?'#e7a184':id==='archer'?'#9ed6b2':'#c4aff5';
  c.clearRect(0,0,360,260);glow(c,180,145,135,color+'20');
  c.strokeStyle=color+'40';c.lineWidth=1;c.beginPath();c.arc(180,135,92,0,7);c.stroke();c.beginPath();c.arc(180,135,104,-2.7,-.7);c.stroke();
  for(let i=0;i<12;i++){const a=i*Math.PI/6;circle(c,180+Math.cos(a)*104,135+Math.sin(a)*104,1.5,color+'88');}
  c.save();c.translate(146,96);c.scale(2.5,2.5);
  Renderer.prototype.heroBody.call({},c,{x:0,y:0,w:30,h:46,face:1,classId:id,color,weaponId:id==='warrior'?'blade':id==='archer'?'longbow':'emberstaff',attackTime:0},0,0);
  c.restore();c.fillStyle=color;c.font='12px Georgia';c.textAlign='center';c.fillText(id==='warrior'?'I':id==='archer'?'II':'III',180,250);
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
    this.canvas=canvas; this.ctx=canvas.getContext('2d',{alpha:false}); this.t=0;this.cachedStage=0;
    if(!this.ctx)throw new Error('이 브라우저에서 2D 그래픽을 사용할 수 없습니다. Chrome 또는 Edge에서 열어주세요.');
    this.backdrop=document.createElement('canvas');this.backdrop.width=W;this.backdrop.height=H;
    this.terrain=document.createElement('canvas');this.terrain.width=W;this.terrain.height=H;
    this.cachedPlatforms=null;this.cachedTerrainStage=0;
    this.specks=Array.from({length:62},(_,i)=>{const r=rand(i*503+8);return{x:r()*W,y:80+r()*580,s:.4+r()*1.6,v:3+r()*11,p:r()*7};});
    this.trails=[];
    canvas.addEventListener?.('contextlost',event=>event.preventDefault());
    canvas.addEventListener?.('contextrestored',()=>{this.cachedStage=0;this.cachedPlatforms=null;});
  }

  render(game,dt=1/60) {
    this.t+=Math.min(dt||1/60,.05);
    const c=this.ctx, r=this.canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2,2560/(r.width||W),1440/(r.height||H));
    const cw=Math.round((r.width||W)*dpr),ch=Math.round((r.height||H)*dpr);
    if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;}
    c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.fillStyle='#080f18';c.fillRect(0,0,cw,ch);
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
    this.skillEffects(c,game);
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
    if(stage>1){this.biomeBackdrop(c,stage,r);return;}
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

  biomeBackdrop(c,stage,r) {
    const p=this.palette,g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,p.sky);g.addColorStop(.65,p.haze);g.addColorStop(1,'#101c2a');c.fillStyle=g;c.fillRect(0,0,W,H);
    if(stage===2){
      for(let layer=0;layer<3;layer++){
        const color=['#172c3f','#25455d','#355d71'][layer];
        for(let i=0;i<12;i++){const x=i*120+layer*27,h=65+r()*170;poly(c,[[x-60,0],[x+70,0],[x+38,h*.6],[x+12,h],[x-15,h*.5]],color);}
        for(let i=0;i<9;i++){const x=i*170+layer*32,y=640,h=100+r()*230;poly(c,[[x-40,y],[x-25,y-h*.7],[x+7,y-h],[x+36,y-h*.6],[x+52,y]],color);line(c,[[x+7,y-h],[x+12,y]],'#8cc9df18',2);}
      }
      for(const [x,y,s] of [[270,330,95],[955,240,150],[650,500,70]]){glow(c,x,y,s*1.5,'#7cdef027');poly(c,[[x,y-s],[x+s*.28,y-s*.4],[x+s*.2,y+s*.35],[x,y+s*.65],[x-s*.27,y],[x-s*.2,y-s*.5]],'#6bb7d0');poly(c,[[x,y-s],[x+8,y+s*.3],[x-s*.27,y]],'#a1deeb');line(c,[[x,y-s],[x+8,y+s*.3]],'#d0f6ff',2);}
      line(c,[[0,180],[290,225],[490,210],[790,260],[1280,185]],'#15303d',7);
      for(const x of [250,600,1040]){line(c,[[x,220],[x,325]],'#183844',4);rect(c,x-11,320,22,25,'#244b5d');glow(c,x,333,60,'#9be7ff38');rect(c,x-5,325,10,13,'#c1f3f7');}
    }else if(stage===3){
      for(let i=0;i<8;i++){const x=i*190-40,h=200+r()*210;rect(c,x,580-h,90,h,'#352730');rect(c,x+8,580-h+8,74,h-8,'#55383b');for(let j=0;j<5;j++)rect(c,x+20,600-h+j*40,50,3,'#7c514447');rect(c,x+25,580-h-50,40,50,'#2c2530');}
      for(const x of [120,760,1120]){c.save();c.translate(x,360);c.strokeStyle='#98644955';c.lineWidth=14;c.beginPath();c.arc(0,0,58,0,7);c.stroke();for(let a=0;a<12;a++){c.save();c.rotate(a*Math.PI/6);rect(c,-6,-79,12,23,'#66483f');c.restore();}c.restore();}
      for(const x of [420,935]){rect(c,x-55,350,110,250,'#312831');c.fillStyle='#d6753e';c.beginPath();c.ellipse(x,428,34,65,0,Math.PI,0);c.lineTo(x+34,560);c.lineTo(x-34,560);c.fill();glow(c,x,480,160,'#f47e3839');for(let j=0;j<5;j++)rect(c,x-36,420+j*28,72,5,'#32252e');}
      for(const x of [270,610,1010]){line(c,[[x,0],[x,300]],'#382c33',5);for(let y=0;y<300;y+=18){c.strokeStyle='#806351';c.lineWidth=2;c.strokeRect(x-4,y,8,13);}}
      const lava=c.createLinearGradient(0,620,0,720);lava.addColorStop(0,'#b957392b');lava.addColorStop(1,'#f897405f');c.fillStyle=lava;c.fillRect(0,600,W,120);
    }else if(stage===4){
      glow(c,920,160,210,'#d3e5ef25');circle(c,920,160,72,'#d5dfdc');
      for(let i=0;i<12;i++){const x=r()*W,y=180+r()*400,w=100+r()*200;c.save();c.globalAlpha=.12;glow(c,x,y,w,'#c6deec');c.restore();}
      for(const [x,y,w] of [[80,310,270],[510,240,260],[890,370,310]]){poly(c,[[x,y],[x+w,y],[x+w*.7,y+50],[x+w*.57,y+110],[x+w*.42,y+65],[x+25,y+40]],'#354e62');rect(c,x,y-6,w,7,'#829b9b');for(let j=0;j<3;j++){const cx=x+40+j*70;rect(c,cx,y-130,18,130,'#627d89');rect(c,cx-5,y-136,28,10,'#8ca2a7');rect(c,cx-4,y-8,26,8,'#8ca2a7');}line(c,[[x+30,y-133],[x+w-25,y-133]],'#758d99',12);}
      for(let i=0;i<9;i++){const x=r()*W,y=r()*400;poly(c,[[x,y],[x+20,y+4],[x+8,y+20]],'#9eabb755');}
      line(c,[[580,0],[550,90],[590,95],[530,200]],'#c8e1ff88',3);
    }else{
      for(let i=0;i<160;i++)circle(c,r()*W,r()*H,r()>.8?1.8:.7,'#d1b7ef88');
      glow(c,640,270,260,'#c191de29');circle(c,640,270,143,'#bd9dcf');circle(c,635,265,137,'#171222');
      c.strokeStyle='#d7b6f35c';c.lineWidth=1;for(const rr of [165,190]){c.beginPath();c.arc(640,270,rr,0,7);c.stroke();}
      for(let i=0;i<12;i++){const a=i*Math.PI/6;rect(c,638+Math.cos(a)*190,268+Math.sin(a)*190,4,4,'#e4c7f5');}
      for(const x of [110,300,950,1140]){rect(c,x-20,210,40,440,'#39334b');poly(c,[[x-30,210],[x,170],[x+30,210]],'#685576');rect(c,x-7,220,14,380,'#51415e');line(c,[[x,265],[x+10,310],[x-8,360],[x,410]],'#bc91cd60',2);}
      poly(c,[[460,650],[510,590],[540,570],[555,455],[580,470],[600,440],[680,440],[700,470],[725,455],[740,570],[770,590],[820,650]],'#40334f');rect(c,600,470,80,100,'#1e172e');
      for(let i=0;i<13;i++){const x=r()*W,y=400+r()*150;poly(c,[[x,y],[x+35,y-25],[x+60,y+7],[x+22,y+35]],'#59466c55');}
    }
    const shade=c.createLinearGradient(0,460,0,H);shade.addColorStop(0,'transparent');shade.addColorStop(1,'#0a1521a8');c.fillStyle=shade;c.fillRect(0,460,W,260);
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
    for(const s of this.specks){const x=(s.x+t*(stage===4?110:s.v*.2))%W,y=(((s.y+t*s.v*(stage===2?2:stage===4?12:-.3))%H)+H)%H;c.globalAlpha=.18+(Math.sin(t+s.p)+1)*.18;if(stage===4)line(c,[[x,y],[x-7,y-22]],'#b3ceef',1);else circle(c,x+Math.sin(t*.4+s.p)*7,y,s.s,stage===3?'#f6ac70':stage===2?'#d4f3ff':stage===5?'#e2b6ff':'#c0e4c8');}c.globalAlpha=1;
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
    if(this.cachedStage===2){rect(c,p.x-1,p.y-3,p.w+2,5,'#a6d6e6');for(let x=p.x+10;x<p.x+p.w;x+=39)poly(c,[[x,p.y+h],[x+7,p.y+h],[x+3,p.y+h+13]],'#78b0c0');}
    else if(this.cachedStage===3){rect(c,p.x,p.y,p.w,4,'#d49a66');for(let x=p.x+9;x<p.x+p.w;x+=26){circle(c,x,p.y+16,2,'#bc956e');}line(c,[[p.x+3,p.y+h-4],[p.x+p.w-3,p.y+h-4]],'#d5864b',2);}
    else for(let x=p.x+3;x<p.x+p.w-3;x+=5+r()*9){const gh=2+r()*8;line(c,[[x,p.y],[x-2-r()*3,p.y-gh]],r()>.75?pal.glow:pal.moss,1);if(r()>.83)rect(c,x,p.y-2,3,2,pal.glow);}
    for(let j=0;j<Math.floor(p.w/110);j++){const x=p.x+12+r()*(p.w-22);line(c,[[x,p.y+13],[x+4,p.y+19],[x+1,p.y+27]],'#102630',1);}
  }

  decorations(c,game) {
    const ground=(game.platforms||[]).filter(p=>p.kind==='ground');
    for(const p of ground){const r=rand(p.x*77+p.w);for(let i=0;i<p.w/160;i++){
      const x=p.x+25+r()*(p.w-50),y=p.y;
      if(game.stage===2){poly(c,[[x-8,y],[x-5,y-20],[x,y-31],[x+7,y-14],[x+9,y]],'#7ec5dd');line(c,[[x,y-29],[x+2,y]],'#caeffb',2);continue;}
      if(game.stage===3){rect(c,x-7,y-13,15,13,'#6a5346');rect(c,x-9,y-15,19,4,'#b18c66');rect(c,x-3,y-13,5,10,'#e6a167');continue;}
      if(game.stage===5){poly(c,[[x-5,y],[x-8,y-19],[x,y-29],[x+8,y-13],[x+5,y]],'#8a68ab');line(c,[[x,y-27],[x+2,y]],'#d5b2e7',1);continue;}
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
    if(p.attackTime>0&&(!p.classId||p.classId==='warrior')){
      const heavy=p.combo===3,radius=(p.weaponId==='greatsword'?125:heavy?95:75)*(p.rangeScale||1);
      const cx=p.x+p.w*.5+face*5,cy=p.y+p.h*.5,progress=Math.min(1,p.attackTime/(heavy?.21:.17)),angle=(1-progress)*2.2-1.1;
      c.save();c.translate(cx,cy);c.scale(face,p.combo===2?-1:1);c.rotate(angle*.35);c.strokeStyle=heavy?'#fff1bd':'#dafff1';c.lineWidth=heavy?6:4;c.shadowColor='#91ebd5';c.shadowBlur=12;c.beginPath();c.arc(0,0,radius,-1.06,.76);c.stroke();c.shadowBlur=0;c.strokeStyle=heavy?'#ffe8a060':'#a1f1dc65';c.lineWidth=heavy?17:12;c.beginPath();c.arc(0,0,radius-9,-.98,.7);c.stroke();poly(c,[[radius-10,-33],[radius+9,-22],[radius+3,-14]],'#efffdc');c.restore();
    }
  }

  heroBody(c,p,step,t,tint=null) {
    const x=p.x+p.w/2,y=p.y,face=p.face||1;
    c.save();c.translate(x,y);c.scale(face,1);
    const robe=tint||(p.classId==='mage'?'#6e588a':p.classId==='archer'?'#3f705b':'#29474e'),light=tint||'#e0e6ca',shadow=tint||'#879f97';
    // Long red scarf signals motion even at sprite scale.
    const sway=Math.sin(t*5)*3;
    poly(c,[[-3,20],[-18,19],[-27,24+sway],[-37,22+sway],[-30,29+sway],[-16,27],[-1,24]],tint||(p.classId==='mage'?'#9a78bc':p.classId==='archer'?'#5da286':'#b85e57'));
    poly(c,[[-3,22],[-15,24],[-25,31+sway],[-15,30],[-1,26]],tint||p.color||'#e08a73');
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
    if(p.classId==='archer'){
      poly(c,[[-13,9],[-5,-4],[7,0],[14,11],[5,5],[-4,7]],tint||'#658b6b');line(c,[[-8,5],[-19,-5],[-15,-10]],'#d8e4ba',2);
      rect(c,-14,21,6,21,tint||'#806f50');for(let i=0;i<3;i++)line(c,[[-13+i*3,27],[-17+i*3,12]],'#ded6ab',1);
      c.save();c.translate(15,25);if(p.weaponId==='repeater'){rect(c,-3,-3,21,5,'#9aab8e');line(c,[[10,-14],[18,0],[10,14]],'#c1d4ae',3);line(c,[[10,-14],[10,14]],'#e4eccb',1);}else{c.strokeStyle=tint||'#c2cda6';c.lineWidth=3;c.beginPath();c.arc(0,0,23,-1.2,1.2);c.stroke();line(c,[[8,-22],[p.attackTime>0?-4:8,0],[8,22]],'#d8e4bd',1);line(c,[[0,0],[32,0]],'#e1e8c9',2);poly(c,[[32,0],[25,-3],[25,3]],'#ecf5da');}c.restore();
    }else if(p.classId==='mage'){
      poly(c,[[-16,6],[-3,-24],[5,-12],[9,-2],[17,6]],tint||'#796297');line(c,[[-14,6],[15,6]],'#baa7d0',3);circle(c,0,-5,2,'#e8d9ff');
      if(p.weaponId==='froststaff'){poly(c,[[11,21],[24,17],[34,21],[33,35],[22,32],[10,36]],'#a8cbe2');line(c,[[23,18],[22,32]],'#eef7f9',2);glow(c,22,24,24,'#91eaff44');}
      else{line(c,[[16,44],[20,0]],tint||'#a49baf',3);poly(c,[[20,-12],[26,-3],[20,5],[15,-3]],tint||'#f7b58d');glow(c,20,-3,24,'#f2af7848');}
    }else{
      c.save();c.translate(10,29);c.rotate(p.attackTime>0?-.85:.35);rect(c,0,-3,4,9,tint||'#334e53');rect(c,-4,-6,12,3,tint||'#b6bb9a');const big=p.weaponId==='greatsword';poly(c,[[big?-3:0,-6],[big?-5:0,big?-46:-34],[2,big?-56:-41],[big?9:4,big?-46:-34],[big?7:4,-6]],tint||'#b5d5c3');rect(c,0,-29,1,22,tint||'#edf6d8');c.restore();
    }
    rect(c,8,27,7,6,light);c.restore();
  }

  enemy(c,e) {
    if(e.type!=='boss'&&e.biome){this.biomeEnemy(c,e);return;}
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

  biomeEnemy(c,e) {
    const x=e.x+e.w/2,y=e.y,w=e.w,h=e.h,b=e.biome,t=this.t;
    const colors=[null,['#57836a','#bad8a6'],['#5e9bb6','#b6e9fa'],['#8c6553','#ffc185'],['#7685a5','#d6e2f6'],['#7c5f99','#e7b9ef']][b];
    const base=e.hitFlash>0?'#fff4da':colors[0],lit=e.hitFlash>0?'#ffffff':colors[1];
    c.save();if(e.slow>0){glow(c,x,y+h/2,35,'#a2e9fa55');}
    if(e.telegraph>0){glow(c,x,y+h/2,48,'#f58e724f');c.font='bold 19px sans-serif';c.fillStyle='#ffbc91';c.textAlign='center';c.fillText('!',x,y-13);}
    c.translate(x,y);c.scale(e.face||-1,1);
    if(e.type==='flyer'){
      const flap=Math.sin(t*13+e.phase)*10,cy=h*.5;
      if(b===3){rect(c,-16,3,32,21,base);rect(c,-12,7,24,8,'#372f3b');rect(c,-5,9,10,5,lit);for(const side of [-1,1]){line(c,[[side*15,10],[side*28,6]],'#b29b85',3);rect(c,side*28-12,3,24,3,lit);}poly(c,[[-5,25],[0,34+Math.sin(t*30)*4],[5,25]],'#ef9e61');}
      else{const wing=b===1?28:b===4?35:25;for(const side of [-1,1])poly(c,[[0,cy],[side*wing*.6,cy-12-flap],[side*wing,cy-9-flap],[side*wing*.7,cy+4-flap],[side*12,cy+8]],base);poly(c,[[-9,cy-7],[0,cy-13],[9,cy-7],[8,cy+9],[0,cy+15],[-8,cy+8]],lit);rect(c,-5,cy-2,10,5,'#273442');rect(c,1,cy-1,4,2,'#f8dab1');if(b===2){poly(c,[[-5,cy-8],[-12,cy-21],[0,cy-12]],'#d5f6ff');}if(b===5)glow(c,0,cy,24,'#d09cfb3b');}
    }else if(e.type==='archer'){
      poly(c,[[-12,15],[10,15],[17,h],[-17,h]],base);poly(c,[[-13,17],[-11,5],[0,-6],[12,5],[14,17]],lit);rect(c,-8,10,16,9,'#1e2c38');rect(c,0,12,7,3,b===3?'#ffbd72':lit);line(c,[[19,45],[19,5]],base,4);const gem=b===3?'#f8a15d':lit;poly(c,[[19,-3],[25,5],[19,13],[13,5]],gem);glow(c,19,6,24,gem+'33');
      if(b===1){poly(c,[[-17,7],[-22,-4],[-5,2],[4,-14],[9,0],[22,-6],[15,10]],'#799e66');}
      if(b===2){for(const xx of [-9,0,9])poly(c,[[xx-3,4],[xx,-10-Math.abs(xx)*.3],[xx+4,4]],'#a9e1ef');}
      if(b===3){rect(c,-14,3,28,6,'#aa8062');rect(c,-8,-6,16,12,'#736052');rect(c,-19,22,11,21,'#544b4a');}
      if(b===4){c.strokeStyle='#d4e6ff88';c.beginPath();c.ellipse(0,-5,18,5,0,0,7);c.stroke();}
      if(b===5){poly(c,[[-13,4],[-18,-17],[-5,-1],[7,-4],[18,-17],[12,5]],'#d7afd9');}
    }else{
      const step=Math.sin(t*10+e.phase)*3;
      if(b===2){c.fillStyle=base;c.beginPath();c.ellipse(0,h*.55,w*.56,h*.42,0,0,7);c.fill();for(let i=-1;i<=1;i++)poly(c,[[i*12-5,13],[i*12,0-Math.abs(i)*5],[i*12+7,13]],lit);for(const side of [-1,1])for(let i=0;i<3;i++)line(c,[[side*12,25+i*3],[side*(24+i*2),32+i*3+step]],'#85b8cd',2);rect(c,9,20,9,4,'#f3e6c3');}
      else if(b===4){poly(c,[[-21,18],[-8,8],[13,10],[24,17],[15,29],[-15,28]],base);poly(c,[[8,15],[8,-4],[16,4],[26,6],[20,19]],lit);rect(c,17,8,4,3,'#2d3952');line(c,[[-20,20],[-34,8],[-29,24]],lit,5);rect(c,-13,26,6,13+step,lit);rect(c,10,26,5,13-step,lit);}
      else{rect(c,-13,h-9,8,9+step,base);rect(c,6,h-9,8,9-step,base);poly(c,[[-18,h-8],[-16,11],[-8,3],[11,3],[19,14],[17,h-8]],base);rect(c,-12,12,24,11,'#27353e');rect(c,2,15,9,4,lit);rect(c,-14,27,28,5,lit);
        if(b===1){poly(c,[[-19,13],[-25,1],[-12,6],[-7,-7],[2,1],[12,-5],[23,8],[18,16]],'#9cba83');line(c,[[-14,6],[16,12]],'#c8d8a6',2);}
        else if(b===3){rect(c,-23,13,10,21,'#ac7d5a');rect(c,15,13,11,23,'#ac7d5a');rect(c,-14,-3,29,10,'#b68d69');poly(c,[[-4,20],[4,15],[9,23],[3,29]],'#fdb875');glow(c,3,22,30,'#fca66a3a');}
        else{poly(c,[[-14,10],[-19,-10],[-5,2],[4,-3],[17,-14],[14,12]],lit);glow(c,0,20,24,'#d29dfb35');}
      }
    }
    c.restore();if(e.hp<e.maxHp&&e.hp>0){rect(c,e.x,e.y-10,w,3,'#13202d');rect(c,e.x,e.y-10,w*Math.max(0,e.hp/e.maxHp),3,lit);}
  }

  skillEffects(c,game) {
    for(const f of game.fields||[]){c.save();c.strokeStyle=f.color;c.lineWidth=2;c.globalAlpha=.5;c.beginPath();c.ellipse(f.x,f.y+30,f.r,f.r*.24,0,0,7);c.stroke();if(f.delay>0){line(c,[[f.x-12,f.y],[f.x+12,f.y]],f.color,2);line(c,[[f.x,f.y-12],[f.x,f.y+12]],f.color,2);if(f.type==='meteor'){const y=f.y-500*Math.max(0,f.delay/.75);glow(c,f.x-30,y,60,'#ffc89755');circle(c,f.x-30,y,19,'#fbc18e');line(c,[[f.x-80,y-90],[f.x-30,y]],'#f4b88188',15);}}c.restore();}
    for(const e of game.effects||[]){const ratio=Math.max(0,e.life/e.maxLife);c.save();c.globalAlpha=ratio;c.strokeStyle=e.color;c.lineWidth=3+ratio*7;if(e.type==='ring'){c.beginPath();c.arc(e.x,e.y,e.r*(1-ratio*.6),0,7);c.stroke();glow(c,e.x,e.y,e.r,e.color+'20');}
      else if(e.type==='rain'){for(let i=0;i<12;i++){const x=e.x+Math.sin(i*47)*e.r,y=e.y-90+Math.cos(i*19)*60+(1-ratio)*90;line(c,[[x-20,y-65],[x,y]],e.color,2);}}
      else if(e.type==='slash'){line(c,[[e.x-e.r,e.y+35],[e.x+e.r,e.y-35]],e.color,10*ratio);}
      else{glow(c,e.x,e.y,e.r,e.color+'88');c.beginPath();c.arc(e.x,e.y,e.r*(1-ratio*.5),0,7);c.stroke();}c.restore();}
  }

  projectiles(c,projectiles) {
    for(const p of projectiles){const color=p.color||(p.hostile?'#ec9aaa':'#aff9d9');glow(c,p.x,p.y,(p.r||4)*5,p.hostile?'#ed80a438':'#b0ffd72d');line(c,[[p.x-(p.vx||0)*.035,p.y-(p.vy||0)*.035],[p.x,p.y]],color,(p.r||4)*.75);if(p.shape==='arrow'){c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx));line(c,[[-24,0],[5,0]],color,2);poly(c,[[8,0],[0,-4],[0,4]],'#efffe1');line(c,[[-20,0],[-26,-5]],color,2);c.restore();}else{circle(c,p.x,p.y,p.r||4,color);circle(c,p.x,p.y,(p.r||4)*.4,'#fff4d8');}}
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
