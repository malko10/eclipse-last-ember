import assert from 'node:assert/strict';
import {Game} from '../dist/engine.js';
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const step=(g,n)=>{for(let i=0;i<n;i++)g.update(1/60,{});};
function setup(cls){const g=new Game();g.start(cls);g.enemies=[];g.player.x=450;const e=g.spawnEnemy('crawler',510,620);e.hp=e.maxHp=2000;e.cooldown=100;g.random=()=>.5;return [g,e];}
{
  const [g,e]=setup('warrior');g.useSkill(0);step(g,80);assert.ok(e.hp<1950,'cyclone deals several hits');assert.ok(g.hitChain>=2);
  const [rush,target]=setup('warrior');rush.useSkill(1);step(rush,65);assert.ok(target.hp<2000);assert.ok(rush.player.rushTime===0);assert.ok(rush.effects.every(e=>Number.isFinite(e.life)));
}
{
  const [g,e]=setup('archer');g.useSkill(0);step(g,35);assert.ok(e.marked>0,'volley applies a visible mark');
  const hp=e.hp;g.damageEnemy(e,20);assert.equal(hp-e.hp,25,'marked targets take 25% more damage');
  const other=g.spawnEnemy('crawler',g.player.x+30,620);other.cooldown=100;g.useSkill(1);assert.equal(g.fields.find(f=>f.type==='rain').x,e.x+e.w/2,'rain prioritizes the marked target over a closer enemy');
}
{
  const [g,e]=setup('mage');g.useSkill(0);assert.ok(e.frozen>0);const x=e.x;step(g,12);assert.equal(e.x,x,'frozen enemies cannot move');
  const hp=e.hp;g.damageEnemy(e,10);assert.ok(hp-e.hp>10,'a follow-up attack shatters frozen enemies');assert.equal(e.frozen,0);
  const [auto,thaw]=setup('mage');auto.useSkill(0);const hp2=thaw.hp;step(auto,130);assert.ok(thaw.hp<hp2,'freeze also shatters on expiry');
  const [meteor,target]=setup('mage');meteor.useSkill(1);step(meteor,65);assert.ok(meteor.fields.some(f=>f.type==='embers'),'meteor leaves a persistent fire field');const hp3=target.hp;step(meteor,50);assert.ok(target.hp<hp3,'residual fire continues damaging enemies');
}
console.log('Combat: cyclone, rush, mark bonus/targeting, freeze/shatter and meteor afterburn passed.');
