import {Game, CLASSES, WEAPONS} from './engine.js?v=2';
import {Renderer, drawClassPortrait} from './renderer.js?v=2';

const $=id=>document.getElementById(id);
const canvas=$('game'), frame=$('game-frame');
const renderer=new Renderer(canvas);
const keys=new Set(), edges=new Set(), touches=new Set();
let game, last=performance.now(), toastTime=0, audioContext, sound=true, helpResume=false, selectedMode='', attackClock=0, hudClock=0,zoneIntroTime=0,ready=false;
try { sound=localStorage.getItem('eclipse-sound')!=='off'; } catch {}
const fmt=n=>`${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;
const icon=name=>`<svg aria-hidden="true"><use href="#i-${['sword','bolt','heart','wing','flame','gem','shield','moon'].includes(name)?name:'moon'}"/></svg>`;
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function unlockAudio(){if(!sound)return;try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();}catch{}}
function tone(freq,duration,type='sine',volume=.045,endFreq=freq,delay=0){
  if(!sound||!audioContext||audioContext.state!=='running')return;
  try{const now=audioContext.currentTime+delay, osc=audioContext.createOscillator(), gain=audioContext.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(Math.max(15,endFreq),now+duration);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.009);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+duration+.01);}catch{}
}
function playSound(type){
  if(!sound)return;
  if(type==='jump')tone(180,.13,'triangle',.025,390);
  else if(type==='dash'){tone(280,.15,'sawtooth',.019,65);tone(110,.12,'sine',.05,45);}
  else if(type==='sword'||type==='heavy'){tone(type==='heavy'?170:310,.11,'sawtooth',.025,40);}
  else if(type==='hit'){tone(85,.09,'square',.035,35);tone(560,.045,'triangle',.02,250);}
  else if(type==='hurt'){tone(160,.2,'sawtooth',.04,45);}
  else if(type==='shard')tone(820,.1,'sine',.018,1300);
  else if(type==='heal'){tone(440,.2,'sine',.035,660);tone(880,.2,'sine',.025,880,.08);}
  else if(['start','clear','portal','upgrade'].includes(type)){[220,330,440,660].forEach((f,i)=>tone(f,.45,'sine',.024,f,i*.09));}
  else if(type==='shoot')tone(420,.13,'triangle',.018,120);
  else if(type==='magic'){tone(330,.22,'sine',.035,710);tone(660,.18,'triangle',.016,390);}
  else if(type==='skill'){[220,440,660].forEach((f,i)=>tone(f,.25,'triangle',.03,f*1.3,i*.04));}
  else if(type==='ultimate'){[110,220,330,440].forEach((f,i)=>tone(f,.6,'sawtooth',.018,f*1.5,i*.07));}
  else if(type==='slam'){tone(70,.35,'sawtooth',.05,20);}
  else if(['victory','bossdeath'].includes(type)){[261,329,392,523,659,784].forEach((f,i)=>tone(f,.7,'triangle',.026,f,i*.15));}
  else if(type==='death'){[220,174,130,65].forEach((f,i)=>tone(f,.6,'sine',.04,f*.8,i*.18));}
}
function notify(message){$('toast').textContent=message;$('toast').classList.remove('hidden');toastTime=3.2;}
function event(type,payload){if(type==='sfx')playSound(payload);if(type==='notify')notify(payload);if(type==='mode')queueMicrotask(syncMode);if(type==='room'&&payload){zoneIntroTime=2.5;queueMicrotask(()=>{if(!game)return;$('zone-intro-index').textContent=`FLOOR ${String(game.stage).padStart(2,'0')} / ${game.zone.en}`;$('zone-intro-name').textContent=game.roomName;$('zone-intro-desc').textContent=game.zone.tag;$('zone-intro').classList.remove('hidden');});}}
function makeGame(){game=new Game({onEvent:event});selectedMode='';syncMode();}
function soundButton(){const b=$('sound-button');b.setAttribute('aria-pressed',String(sound));b.setAttribute('aria-label',sound?'소리 끄기':'소리 켜기');b.innerHTML=`<svg><use href="#i-${sound?'sound':'mute'}"/></svg>`;}
function choose(index){if(game.mode!=='upgrade')return;const choice=game.choices[index];if(!choice)return;unlockAudio();game.chooseUpgrade(choice.id);keys.clear();edges.clear();canvas.focus();syncMode();}
function syncMode(){
  if(!game)return;const mode=game.mode;if(mode===selectedMode)return;selectedMode=mode;
  $('title-screen').classList.toggle('hidden',mode!=='title');$('pause-screen').classList.toggle('hidden',mode!=='paused');$('upgrade-screen').classList.toggle('hidden',mode!=='upgrade');$('end-screen').classList.toggle('hidden',!['dead','won'].includes(mode));
  $('class-screen').classList.toggle('hidden',mode!=='select');
  $('hud').classList.toggle('hidden',['title','select'].includes(mode));$('loadout-hud').classList.toggle('hidden',mode!=='playing');frame.classList.toggle('is-playing',mode==='playing');
  $('best-title').textContent=game.bestKills>0||game.bestStage>1?`최고 기록 ${Math.min(game.bestStage,5)}구역 · 보유 불씨 ${game.metaShards||0}`:'첫 번째 전설을 시작하세요';
  if(mode==='title'){$('session-label').textContent='THE FORGOTTEN SANCTUARY';$('session-ko').textContent='잊혀진 성역';}
  if(mode==='upgrade'){
    $('upgrade-cards').innerHTML=game.choices.map((u,i)=>`<button class="upgrade-card" data-choice="${i}"><kbd>${i+1}</kbd><div class="card-icon">${icon(u.icon)}</div><span class="rarity">${u.rarity==='EPIC'?'영웅 유물 · EPIC':'희귀 유물 · RARE'}</span><h3>${escapeHTML(u.name)}</h3><p>${escapeHTML(u.description)}</p></button>`).join('');
    $('upgrade-cards').querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>choose(i)));
  }
  if(mode==='dead'||mode==='won'){
    const won=mode==='won';$('end-eyebrow').textContent=won?'DAWN WILL FIND US':'THE EMBER REMAINS';$('end-title').textContent=won?'당신이 새벽을 깨웠다':'불씨는 남아 있다';$('end-description').textContent=won?'가장 긴 밤이 끝났습니다. 당신의 전설은 이제 시작입니다.':'잠깐의 어둠일 뿐. 남겨진 불씨가 다음 여정을 밝힙니다.';
    $('end-stage').textContent=String(game.stage).padStart(2,'0')+' / 05';$('end-kills').textContent=game.kills;$('end-time').textContent=fmt(game.runTime);$('meta-reward').textContent=`누적 불씨 ${game.metaShards||0} · 다음 여정 최대 체력 +${game.metaBonus||0}`;
  }
  if(mode!=='playing'){$('interaction-hint').classList.add('hidden');keys.clear();touches.clear();edges.clear();}
}
function start(){unlockAudio();keys.clear();edges.clear();touches.clear();game.setMode('select');syncMode();}
function startClass(id){if(!ready){notify('화면을 준비하고 있습니다. 잠시 후 다시 선택해주세요.');return;}unlockAudio();keys.clear();edges.clear();touches.clear();game.start(id);syncMode();canvas.focus();}
function restart(){unlockAudio();keys.clear();edges.clear();touches.clear();game.restart();syncMode();canvas.focus();}
function pause(){if(game.mode==='playing')game.pause();else if(game.mode==='paused'&&!$('help-dialog').open){game.resume();canvas.focus();}syncMode();}
function showHelp(){helpResume=game.mode==='playing';if(helpResume)game.pause();syncMode();$('help-dialog').showModal();}
function closeHelp(){$('help-dialog').close();}
$('help-dialog').addEventListener('close',()=>{if(helpResume&&game.mode==='paused'){game.resume();syncMode();canvas.focus();}helpResume=false;});
$('start-button').addEventListener('click',start);$('retry-button').addEventListener('click',start);$('restart-button').addEventListener('click',start);$('resume-button').addEventListener('click',pause);$('pause-button').addEventListener('click',pause);$('home-button').addEventListener('click',makeGame);$('class-back').addEventListener('click',makeGame);
function setupClasses(){
  $('class-cards').innerHTML=Object.values(CLASSES).map((cls,i)=>`<button class="class-card" data-class="${cls.id}" style="--class-color:${cls.color}"><div class="class-topline"><span>${cls.en}</span><kbd>${i+1}</kbd></div><canvas width="360" height="260" id="portrait-${cls.id}" aria-hidden="true"></canvas><div class="class-title"><h3>${cls.name}</h3><span>${cls.role}</span></div><p class="class-description">${cls.description}</p><div class="class-weapons">${cls.weapons.map(id=>WEAPONS[id].name).join(' / ')}</div><div class="class-skills">${cls.skills.map((s,j)=>`<div><kbd>${j===0?'Q':'R'}</kbd><span><strong>${s.name}</strong><small>${s.description}</small></span></div>`).join('')}</div><div class="class-footer"><span>최대 체력 ${cls.hp}</span><strong>선택하기 ↗</strong></div></button>`).join('');
  for(const cls of Object.values(CLASSES))drawClassPortrait($('portrait-'+cls.id),cls.id);
  $('class-cards').querySelectorAll('[data-class]').forEach(b=>b.addEventListener('click',()=>startClass(b.dataset.class)));
}
function hudAction(code){edges.add(code);canvas.focus();unlockAudio();}
$('weapon-button').addEventListener('click',()=>hudAction('KeyF'));$('skill-0').addEventListener('click',()=>hudAction('KeyQ'));$('skill-1').addEventListener('click',()=>hudAction('KeyR'));
$('help-button').addEventListener('click',showHelp);$('pause-help').addEventListener('click',showHelp);$('close-help').addEventListener('click',closeHelp);$('guide-ready').addEventListener('click',closeHelp);
$('brand').addEventListener('click',e=>{e.preventDefault();if(game.mode==='playing')pause();else if(['dead','won','title'].includes(game.mode))makeGame();});
$('sound-button').addEventListener('click',()=>{sound=!sound;try{localStorage.setItem('eclipse-sound',sound?'on':'off');}catch{}soundButton();if(sound){unlockAudio();tone(440,.16);}});
$('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await frame.requestFullscreen();}catch{notify('이 브라우저에서는 전체 화면을 사용할 수 없습니다.');}});
const controlled=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyJ','KeyK','KeyE','KeyQ','KeyR','KeyF','ShiftLeft','ShiftRight','Escape','Enter','Digit1','Digit2','Digit3'];
document.addEventListener('keydown',e=>{
  if($('help-dialog').open)return;
  if(e.target instanceof HTMLButtonElement&&['Enter','Space'].includes(e.code))return;
  if(controlled.includes(e.code))e.preventDefault();
  if(!e.repeat){edges.add(e.code);if(e.code==='Escape'){if(game.mode==='select')makeGame();else pause();return;}if(e.code==='Enter'&&game.mode==='title'){start();return;}if(e.code==='Enter'&&['dead','won'].includes(game.mode)){start();return;}if(game.mode==='select'&&/^Digit[123]$/.test(e.code)){startClass(Object.keys(CLASSES)[Number(e.code.slice(-1))-1]);return;}if(game.mode==='upgrade'&&/^Digit[123]$/.test(e.code)){choose(Number(e.code.slice(-1))-1);return;}}
  keys.add(e.code);unlockAudio();
});
document.addEventListener('keyup',e=>keys.delete(e.code));
function loseFocus(){keys.clear();edges.clear();touches.clear();if(game?.mode==='playing'){game.pause();syncMode();}}
window.addEventListener('blur',loseFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0&&game.mode==='playing'){edges.add('KeyJ');canvas.focus();unlockAudio();}});
document.querySelectorAll('[data-control]').forEach(b=>{const c=b.dataset.control;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touches.add(c);edges.add('touch-'+c);unlockAudio();});const end=e=>{e.preventDefault();touches.delete(c);};b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);b.addEventListener('lostpointercapture',()=>touches.delete(c));});
function updateHUD(){
  const cls=game.classDef;
  $('player-class-label').textContent=cls.name+' · '+game.player.weapon.name;
  $('class-label').textContent=cls.name;$('weapon-name').textContent=game.player.weapon.name;$('weapon-icon').innerHTML=icon(cls.icon);
  cls.skills.forEach((skill,i)=>{const node=$('skill-'+i),cd=game.player.skillCooldowns[i];node.querySelector('.skill-name').textContent=skill.name;node.querySelector('.skill-symbol').innerHTML=icon(skill.icon);node.querySelector('.skill-time').textContent=cd>.05?cd.toFixed(1)+'s':'준비';node.classList.toggle('cooling',cd>.05);node.style.setProperty('--cooldown',Math.min(1,cd/(game.player.skillTimes[i]||1))*100+'%');node.title=skill.description;});
  const p=game.player;$('hp-text').textContent=`${Math.ceil(Math.max(0,p.hp))} / ${p.maxHp}`;$('hp-fill').style.width=`${Math.max(0,p.hp/p.maxHp)*100}%`;$('hp-fill').style.background=p.hp/p.maxHp<.3?'#d17d70':'#c6b98c';
  $('dash-status').textContent=p.dashCooldown>0?`대시 충전 ${p.dashCooldown.toFixed(1)}s`:'SHIFT · 대시 준비';$('relic-count').textContent=`유물 ${game.upgrades.length}`;
  $('room-index').textContent=`${String(game.stage).padStart(2,'0')} / 05`;$('room-name').textContent=game.roomName;$('shards').textContent=game.currency;$('timer').textContent=fmt(game.runTime);
  $('room-dots').querySelectorAll('i').forEach((d,i)=>{d.classList.toggle('current',i===game.stage-1);d.classList.toggle('complete',i<game.stage-1);});
  if(!['title','select'].includes(game.mode)){$('session-label').textContent=`${String(game.stage).padStart(2,'0')} / ${game.zone.en}`;$('session-ko').textContent=game.roomName;}
  const boss=game.boss;$('boss-hud').classList.toggle('hidden',!boss||boss.hp<=0||game.mode!=='playing');if(boss){$('boss-fill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';$('boss-hp').textContent=Math.max(0,Math.ceil(boss.hp));}
  const portal=game.portal;const nearby=game.mode==='playing'&&portal?.active&&Math.abs(p.x+p.w/2-(portal.x+portal.w/2))<110&&Math.abs(p.y+p.h-(portal.y+portal.h))<130;
  $('interaction-hint').classList.toggle('hidden',!nearby);if(nearby)$('interaction-hint').innerHTML=`<kbd>E</kbd> ${game.stage===5?'새벽을 깨우기':'다음 구역으로'}`;
}
function loop(now){
  try {
  const dt=Math.min((now-last)/1000,.1);last=now;attackClock-=dt;
  const attacking=edges.has('KeyJ')||edges.has('KeyK')||edges.has('touch-attack')||((keys.has('KeyJ')||touches.has('attack'))&&attackClock<=0);
  if(attacking)attackClock=.08;
  const input={left:keys.has('KeyA')||keys.has('ArrowLeft')||touches.has('left'),right:keys.has('KeyD')||keys.has('ArrowRight')||touches.has('right'),jumpPressed:edges.has('Space')||edges.has('KeyW')||edges.has('ArrowUp')||edges.has('touch-jump'),jumpHeld:keys.has('Space')||keys.has('KeyW')||keys.has('ArrowUp')||touches.has('jump'),attackPressed:attacking,dashPressed:edges.has('ShiftLeft')||edges.has('ShiftRight')||edges.has('touch-dash'),interactPressed:edges.has('KeyE')||edges.has('touch-interact')};
  input.skill1Pressed=edges.has('KeyQ');input.skill2Pressed=edges.has('KeyR');input.swapPressed=edges.has('KeyF');
  let remaining=dt,firstStep=true;
  while(remaining>0){const step=Math.min(remaining,1/60);game.update(step,firstStep?input:{...input,jumpPressed:false,attackPressed:false,dashPressed:false,interactPressed:false,skill1Pressed:false,skill2Pressed:false,swapPressed:false});remaining-=step;firstStep=false;}
  edges.clear();renderer.render(game,dt);ready=true;syncMode();hudClock-=dt;if(hudClock<=0){updateHUD();hudClock=.1;}if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.add('hidden');}if(zoneIntroTime>0){zoneIntroTime-=dt;if(zoneIntroTime<=0)$('zone-intro').classList.add('hidden');}requestAnimationFrame(loop);
  } catch(error) { console.error(error);window.eclipseReportError?.(error.message); }
}
soundButton();makeGame();setupClasses();requestAnimationFrame(loop);
