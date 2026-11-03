import assert from 'node:assert/strict';
import {Game,CLASSES,WEAPONS,ZONES,UPGRADE_POOL} from '../dist/engine.js';
const step=(g,n,input={})=>{for(let i=0;i<n;i++)g.update(1/60,input);};
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
assert.equal(Object.keys(CLASSES).length,3);assert.equal(Object.keys(WEAPONS).length,6);assert.equal(UPGRADE_POOL.length,18);
for(const id of Object.keys(CLASSES)){
  const g=new Game();g.start(id);assert.equal(g.player.classId,id);assert.equal(g.player.hp,CLASSES[id].hp);
  const first=g.player.weaponId;g.update(1/60,{swapPressed:true});assert.notEqual(g.player.weaponId,first);step(g,25);g.update(1/60,{swapPressed:true});assert.equal(g.player.weaponId,first);
  for(const weapon of CLASSES[id].weapons){
    g.start(id);g.player.weaponId=weapon;g.player.weapon=WEAPONS[weapon];const target=g.enemies[0];target.x=g.player.x+(id==='warrior'?55:300);target.y=g.player.y;target.hp=target.maxHp=1000;target.cooldown=100;
    g.update(1/60,{attackPressed:true});step(g,50);assert.ok(target.hp<1000,`${weapon} must hit its target`);
  }
  for(let skill=0;skill<2;skill++){
    g.start(id);g.player.x=500;g.player.face=1;g.enemies.forEach(e=>e.hp=0);const e=g.spawnEnemy('crawler',570,614);e.hp=e.maxHp=500;e.cooldown=100;
    assert.equal(g.useSkill(skill),true);const cooldown=g.player.skillCooldowns[skill];assert.ok(cooldown>0);assert.equal(g.useSkill(skill),false,'cooldown prevents repeated casts');
    step(g,180);assert.ok(e.hp<500,`${id} skill ${skill} must do damage`);assert.ok(g.player.skillCooldowns[skill]<cooldown,'cooldown advances');
  }
  g.start(id);
  for(let floor=1;floor<=5;floor++){
    assert.equal(g.zone,ZONES[floor-1]);assert.ok(g.enemies.every(e=>e.biome===floor));
    g.enemies.forEach(e=>g.damageEnemy(e,100000));step(g,15);g.player.x=g.portal.x;g.player.y=614;g.update(1/60,{interactPressed:true});
    if(floor<5){assert.equal(g.mode,'upgrade');assert.ok(g.chooseUpgrade(g.choices[0].id));assert.equal(g.player.classId,id);}else assert.equal(g.mode,'won');
  }
}
// Hit-stop must retain the new skill and weapon edges as well as movement edges.
const buffered=new Game();buffered.start('archer');buffered.hitStop=.04;buffered.update(1/60,{skill1Pressed:true,swapPressed:true});step(buffered,5);assert.ok(buffered.player.skillCooldowns[0]>0);assert.equal(buffered.player.weaponId,'repeater');
// Frost, cooldown and persistent class identity survive floor transitions.
for(const id of ['flow','reach','pulse','renewal']){const g=new Game();g.start('mage');g.choices=[UPGRADE_POOL.find(u=>u.id===id)];g.setMode('upgrade');assert.ok(g.chooseUpgrade(id));assert.equal(g.player.classId,'mage');if(id==='flow')assert.ok(g.player.cooldownScale<1);if(id==='reach')assert.ok(g.player.rangeScale>1);if(id==='pulse')assert.ok(g.player.skillPower>1);}
console.log('Expansion: all 3 classes, 6 weapons, 6 skills, cooldowns, upgrades and 15 class/floor transitions passed.');
