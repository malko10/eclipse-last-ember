import assert from 'node:assert/strict';
import {Game,DUNGEONS,UPGRADE_POOL} from '../dist/engine.js';
import {warriorPose} from '../dist/renderer.js';
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const step=(g,n,input={})=>{for(let i=0;i<n;i++)g.update(1/60,input);};
for(const cls of ['warrior','archer','mage'])for(const d of DUNGEONS){
  const g=new Game();g.start(cls,d.id);const zone=g.zone;
  for(let room=1;room<=5;room++){
    assert.equal(g.dungeonId,d.id);assert.equal(g.zone,zone,'theme persists across rooms');assert.equal(g.stage,room);assert.ok(g.enemies.every(e=>e.biome===d.rank));
    if(room===5){assert.equal(g.boss.name,d.bossName);assert.equal(g.boss.maxHp,d.bossHp);assert.ok(g.introTime>0);const hp=g.player.hp,bhp=g.boss.hp,x=g.player.x;step(g,30,{right:true,attackPressed:true,skill1Pressed:true});g.hurtPlayer(10,1);g.damageEnemy(g.boss,100);assert.equal(g.player.hp,hp);assert.equal(g.boss.hp,bhp);assert.equal(g.player.x,x,'intro prevents movement and combat');g.pause();const time=g.introTime;step(g,10);assert.equal(g.introTime,time);g.resume();g.finishIntro();}
    for(const e of [...g.enemies])g.damageEnemy(e,10000);step(g,12);g.player.x=g.portal.x;g.player.y=614;g.update(1/60,{interactPressed:true});
    if(room<5){assert.equal(g.mode,'upgrade');assert.ok(g.choices.every(u=>!u.classId||u.classId===cls));assert.equal(g.choices[0].classId,cls,'one eligible class relic is guaranteed');g.chooseUpgrade(g.choices[0].id);}else assert.equal(g.mode,'won');
  }
  g.restart();assert.equal(g.dungeonId,d.id,'restart retains dungeon');assert.equal(g.stage,1);
}
// All 15 telegraphed attack slots reach a real hazard, projectile or charge.
for(const d of DUNGEONS){
  const g=new Game();g.start('warrior',d.id);g.stage=5;g.makeRoom();g.finishIntro();g.player.hp=g.player.maxHp=10000;
  for(const kind of d.patterns){const e=g.boss;e.attackKind=kind;e.state='windup';e.telegraph=.1;e.targetX=300;e.targetY=637;e.blinkX=200;g.hazards=[];g.projectiles=[];step(g,10);assert.ok(g.hazards.length||g.projectiles.length||Math.abs(e.vx)>400,`${d.id}/${kind} executes`);}
  g.boss.hp=g.boss.maxHp*.4;g.boss.state='idle';g.boss.cooldown=0;g.update(1/60);assert.ok(g.boss.enraged);
}
const create=(cls,ids)=>{const g=new Game();g.start(cls);g.upgrades=ids;g.random=()=>.5;return g;};
{
 const g=create('warrior',['riposte','warcry','cleaver','executioner']);g.player.dashTime=.1;g.hurtPlayer(20,1);assert.ok(g.player.riposte>0);g.player.hp=50;g.useSkill(0);assert.equal(g.player.hp,58);assert.ok(g.player.invuln>=.6);
 const e=g.enemies[0];g.player.x=e.x-40;g.player.y=e.y;g.player.dashTime=0;g.player.castTime=0;g.player.combo=2;g.player.comboWindow=1;e.hp=500;g.attack();step(g,8);assert.ok(e.hp<400,'riposte and third-strike multiplier apply');
}
{
 const g=create('archer',['quiver','pinning','windstep','hunter']);g.attack();assert.equal(g.projectiles.length,2);assert.ok(g.projectiles.every(b=>b.slow&&b.pierce===4));g.update(1/60,{dashPressed:true});assert.ok(g.player.windstep>0);g.rangedAttack();assert.ok(g.player.attackCooldown<.3);
}
{
 const g=create('mage',['binary','permafrost','cinders','conduit']);g.useSkill(1);assert.equal(g.fields.filter(f=>f.type==='meteor').length,2);const e=g.enemies[0];e.x=g.player.x+60;e.hp=500;g.useSkill(0);assert.ok(e.frozen>1.1);const cd=g.player.skillCooldowns[1];g.onWeaponHit(e);assert.ok(g.player.skillCooldowns[1]<cd);assert.ok(e.burn>0);g.fields.forEach(f=>{f.delay=0;f.tick=0});g.updateFields(.016);assert.ok(g.fields.some(f=>f.type==='embers'&&f.life>4));
}
// Wrong-class relics cannot be selected even if a forged choice is supplied.
const g=create('warrior',[]);g.mode='upgrade';g.choices=[UPGRADE_POOL.find(u=>u.classId==='mage')];assert.equal(g.chooseUpgrade(g.choices[0].id),false);
for(const weaponId of ['blade','greatsword'])for(const face of [-1,1])for(const combo of [1,2,3])for(let i=0;i<=10;i++){
 const pose=warriorPose({weaponId,face,combo,attackTime:i/10*.3,attackDuration:.3,rangeScale:1});assert.ok(Object.values(pose).flat().every(Number.isFinite));assert.ok(Math.hypot(pose.hand[0]-pose.elbow[0],pose.hand[1]-pose.elbow[1])<13.1,'forearm stays attached');
}
console.log('Dungeons: 75 rooms, 15 boss patterns, protected intros, class-only loot, relic mechanics and connected sword poses passed.');
