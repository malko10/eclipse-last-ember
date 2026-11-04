import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {Game,DUNGEONS} from '../dist/engine.js';
import {Renderer} from '../dist/renderer.js';
const require=createRequire(import.meta.url);
const canvasPackage=process.env.ECLIPSE_CANVAS_PACKAGE||path.resolve(path.dirname(process.execPath),'../node_modules/@napi-rs/canvas');
const {createCanvas}=require(canvasPackage);
function canvas(width=1280,height=720){const c=createCanvas(width,height);c.getBoundingClientRect=()=>({width,height});c.addEventListener=()=>{};return c;}
globalThis.document={createElement:()=>canvas()};globalThis.window={devicePixelRatio:1};globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
for(const id of ['warrior','archer','mage']){
  const g=new Game(),view=canvas(),r=new Renderer(view);g.start(id);
  for(let stage=1;stage<=5;stage++){
    g.start(id,DUNGEONS[stage-1].id);g.stage=5;g.makeRoom();g.finishIntro();g.player.x=400;g.useSkill(0);g.useSkill(1);g.attack();
    for(let frame=0;frame<75;frame++){g.update(1/60,{});r.render(g,1/60);}
    const data=view.getContext('2d').getImageData(0,0,1280,720).data;let bright=0;
    for(let i=0;i<data.length;i+=4)if(data[i]+data[i+1]+data[i+2]>150)bright++;
    assert.ok(bright>10000,`${id}/${stage} must render visible scene pixels`);
  }
}
// Execute the exact downloadable classic scripts, including the real renderer,
const large=canvas();large.getBoundingClientRect=()=>({width:3840,height:2160});window.devicePixelRatio=3;const largeRenderer=new Renderer(large);largeRenderer.render(new Game());assert.equal(large.width,2560);assert.equal(large.height,1440);window.devicePixelRatio=1;
// The high-DPI backing store stays bounded instead of growing into a blank GPU surface.
// Execute the exact downloadable classic scripts, including the real renderer,
// with unavailable storage and no network loader. Exercise the real Start UI.
const html=fs.readFileSync(new URL('../dist/ECLIPSE-offline.html',import.meta.url),'utf8');
assert.ok(!/type="module"|<script[^>]+src=|@import/.test(html),'offline file must have zero external runtime/style dependencies');
for(const storageBlocked of [false,true]){
  const elements=new Map(),raf=[],errors=[],winEvents={},docEvents={};let paints=0;
  class Element {
    constructor(id=''){this.id=id;this.dataset={};this.events={};this.style={setProperty(){}};const set=new Set();this.classList={add:n=>set.add(n),remove:n=>set.delete(n),contains:n=>set.has(n),toggle(n,force){if(force??!set.has(n))set.add(n);else set.delete(n);}};this.children=new Map();this.textContent='';}
    addEventListener(type,fn){this.events[type]=fn;}setAttribute(){}focus(){}setPointerCapture(){}
    querySelector(selector){if(!this.children.has(selector))this.children.set(selector,new Element(selector));return this.children.get(selector);}
    querySelectorAll(selector){if(this.id==='dungeon-list')return ['forest','frost','forge','storm','void'].map(id=>{const b=get('dungeon-'+id);b.dataset.dungeon=id;return b;});if(this.id==='room-dots')return Array.from({length:5},(_,i)=>this.querySelector('dot'+i));if(this.id==='class-cards'&&selector==='[data-class]')return ['warrior','archer','mage'].map(id=>{const b=get('pick-'+id);b.dataset.class=id;return b;});if(this.id==='upgrade-cards')return [0,1,2].map(i=>get('upgrade-'+i));return [];}
    showModal(){this.open=true;}close(){this.open=false;this.events.close?.();}
  }
  function get(id){if(!elements.has(id)){let e;if(id==='game'||id.startsWith('portrait-')){e=canvas(id==='game'?1280:360,id==='game'?720:260);e.style={};e.classList={toggle(){}};e.events={};e.addEventListener=(t,fn)=>e.events[t]=fn;e.focus=()=>{};}else e=new Element(id);elements.set(id,e);}return elements.get(id);}
  const storage={getItem(key){if(storageBlocked)throw new Error('Storage access denied');return key==='eclipse-sound'?'off':null;},setItem(){if(storageBlocked)throw new Error('Storage access denied');}};
  const context=vm.createContext({console:{log(){},error:e=>errors.push(e)},document:{getElementById:get,createElement:()=>canvas(),querySelectorAll:()=>[],addEventListener(t,fn){docEvents[t]=fn;},hidden:false},window:{devicePixelRatio:1,addEventListener:(t,fn)=>winEvents[t]=fn},localStorage:storage,performance:{now:()=>0},HTMLButtonElement:Element,HTMLInputElement:class{},requestAnimationFrame:fn=>raf.push(fn),queueMicrotask:fn=>fn(),setTimeout,clearTimeout});
  for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]).runInContext(context);
  function frames(count){for(let i=0;i<count;i++){const fn=raf.shift();assert.ok(fn,'animation frame must continue');fn(++paints*16.6667);}}
  frames(2);get('start-button').events.click();assert.ok(!get('class-screen').classList.contains('hidden'),'Start reveals class choice');
  for(const id of ['warrior','archer','mage']){
    get('pick-'+id).events.click();frames(2);assert.ok(!get('dungeon-screen').classList.contains('hidden'));get('dungeon-frost').events.focus();assert.equal(get('domain-name').textContent,'서리 광산');get('dungeon-forest').events.pointerenter();assert.equal(get('domain-name').textContent,'잊힌 숲');get('dungeon-forest').events.click();frames(8);assert.ok(get('player-class-label').textContent.includes(id==='warrior'?'검사':id==='archer'?'궁수':'마법사'),`${id} label updates within the HUD's 100 ms refresh interval`);
    for(const [code,slot] of [['KeyK',0],['KeyL',1]]){docEvents.keydown({code,repeat:false,target:get('game'),preventDefault(){}});frames(8);docEvents.keyup({code});assert.ok(get('skill-'+slot).querySelector('.skill-time').textContent.endsWith('s'),`${code} casts skill ${slot+1} in offline file`);}
    get('weapon-button').events.click();frames(90);get('pause-button').events.click();get('restart-button').events.click();frames(2);
  }
  assert.deepEqual(errors,[],'downloaded script must not crash at startup, skills or restart');
}
console.log('Real canvas: 15 class/biome scenes visible. Offline UI: 3 class starts, skills, swaps and restarts pass with storage enabled and blocked.');
