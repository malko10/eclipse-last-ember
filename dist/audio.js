// Original, locally synthesized score. No streaming or downloaded audio assets.
export const SCORES = [
  {name:'01 · 이끼 아래의 달',bpm:82,root:50,mode:[0,2,3,7,10],chords:[0,5,3,7],air:1500,voice:'sine'},
  {name:'02 · 얼어붙은 별',bpm:90,root:54,mode:[0,2,3,7,9],chords:[0,3,7,5],air:2600,voice:'sine'},
  {name:'03 · 재의 심장',bpm:112,root:45,mode:[0,2,3,5,7],chords:[0,0,5,3],air:1100,voice:'triangle'},
  {name:'04 · 하늘을 가르는 바람',bpm:102,root:57,mode:[0,2,5,7,9],chords:[0,5,7,3],air:2200,voice:'triangle'},
  {name:'05 · 마지막 월식',bpm:120,root:43,mode:[0,1,3,7,8],chords:[0,3,1,7],air:1800,voice:'triangle'},
];
const hz=n=>440*2**((n-69)/12);
export class Soundscape {
  constructor(){this.enabled=true;this.musicVolume=.55;this.fxVolume=.8;this.step=0;this.next=0;this.stage=0;this.mode='title';this.intensity=0;this.lastHit=-1;}
  unlock(){
    if(!this.enabled)return;
    try{
      if(!this.ctx){
        const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
        const c=this.ctx=new C();this.master=c.createGain();this.master.gain.value=.7;
        const limiter=c.createDynamicsCompressor();limiter.threshold.value=-14;limiter.ratio.value=5;this.master.connect(limiter);limiter.connect(c.destination);
        this.music=c.createGain();this.fx=c.createGain();this.music.connect(this.master);this.fx.connect(this.master);
        this.echo=c.createDelay(.8);this.echo.delayTime.value=.31;const feedback=c.createGain();feedback.gain.value=.23;this.echo.connect(feedback);feedback.connect(this.echo);
        const wet=c.createGain();wet.gain.value=.24;this.echo.connect(wet);wet.connect(this.music);
        this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const a=this.noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
        this.applyVolumes();this.next=c.currentTime+.06;
      }
      if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
    }catch{}
  }
  applyVolumes(){if(!this.ctx)return;const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(this.enabled?.7:0,t,.035);this.music.gain.setTargetAtTime(this.musicVolume*.58,t,.08);this.fx.gain.setTargetAtTime(this.fxVolume,t,.025);}
  setEnabled(enabled){this.enabled=enabled;if(enabled)this.unlock();else if(this.ctx){this.ctx.suspend().catch(()=>{});}this.applyVolumes();}
  setVolume(bus,value){this[bus==='music'?'musicVolume':'fxVolume']=Math.max(0,Math.min(1,value));this.applyVolumes();}
  voice(freq,duration,type='sine',volume=.08,end=freq,delay=0,bus='fx',cutoff=5000,echo=false){
    const c=this.ctx;if(!this.enabled||!c||c.state!=='running')return;
    const t=c.currentTime+Math.max(0,delay),o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();
    o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);f.type='lowpass';f.frequency.value=cutoff;
    const attack=bus==='music'&&duration>1?.22:.008;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(f);f.connect(g);g.connect(this[bus]);if(echo)g.connect(this.echo);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();f.disconnect();g.disconnect();};
  }
  hiss(duration=.1,volume=.1,cutoff=1800,delay=0,bus='fx'){
    const c=this.ctx;if(!this.enabled||!c||c.state!=='running')return;
    const t=c.currentTime+delay,s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=this.noise;f.type='bandpass';f.frequency.setValueAtTime(cutoff,t);f.frequency.exponentialRampToValueAtTime(Math.max(150,cutoff*.35),t+duration);f.Q.value=.7;
    g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);g.connect(this[bus]);s.start(t);s.stop(t+duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
  }
  update(game){
    const c=this.ctx;if(!this.enabled||!c||c.state!=='running')return;
    const paused=game.mode==='paused';if(paused){this.next=c.currentTime+.08;this.music.gain.setTargetAtTime(0,c.currentTime,.18);this.mode=game.mode;return;}
    if(this.mode==='paused')this.applyVolumes();this.mode=game.mode;
    const stage=game.biome||1,s=SCORES[stage-1];
    if(this.stage!==stage){this.stage=stage;this.step=0;this.next=c.currentTime+.08;this.echo.delayTime.setTargetAtTime(60/s.bpm*.75,c.currentTime,.1);}
    this.intensity=game.mode==='playing'&&!game.cleared?(game.boss?1:.65):.18;
    if(this.next<c.currentTime-.2)this.next=c.currentTime+.04;
    // Short look-ahead cannot queue a song's worth of notes after a tab sleeps.
    for(let count=0;this.next<c.currentTime+.15&&count<4;count++){
      this.scoreStep(s,this.step++,this.next-c.currentTime);this.next+=60/s.bpm/2;
    }
  }
  scoreStep(s,step,delay){
    const beat=step%16,bar=Math.floor(step/16),root=s.root+s.chords[bar%4],int=this.intensity,v=(n,d,type,vol,cutoff=s.air)=>this.voice(hz(n),d,type,vol,hz(n),delay,'music',cutoff,true);
    if(beat===0){[root,root+7,root+12,root+15].forEach((n,i)=>v(n,60/s.bpm*7.5,'triangle',i===0?.07:.035,700));}
    const pattern=[0,2,4,1,3,2,1,4,0,3,2,4,1,2,3,1];
    if(beat%2===0||int>.5){const n=root+12+s.mode[pattern[(step+bar*3)%16]];v(n,.7,s.voice,.075*(beat%4===0?1:.65));if(this.stage===2)v(n+12,.48,'sine',.026,4000);}
    if(beat%4===0){v(root-12,.55,'triangle',.12,500);if(int>.5)this.voice(130,.22,'sine',.2*int,38,delay,'music',700);}
    if(int>.5){if(beat%4===2){this.hiss(.14,.055*int,this.stage===3?900:1900,delay,'music');this.voice(175,.11,'triangle',.07,85,delay,'music');}if(beat%2===1)this.hiss(.045,.018*int,6500,delay,'music');}
    if(bar%4===3&&beat===12){[0,7,12].forEach((n,i)=>this.voice(hz(root+12+n),1.6,'sine',.045,hz(root+12+n),delay+i*.11,'music',2200,true));}
  }
  play(type,payload={}){
    if(!this.enabled||!this.ctx)return;const v=(...a)=>this.voice(...a);
    if(type==='impact'){
      const t=this.ctx.currentTime;if(t-this.lastHit<.045)return;this.lastHit=t;const heavy=payload.heavy||payload.crit||payload.kill;
      v(heavy?95:145,heavy?.19:.1,'sine',heavy?.32:.22,32);this.hiss(heavy?.15:.075,heavy?.24:.17,heavy?1700:3100);v(920,.055,'triangle',.05,230);
      if(payload.kill)v(58,.22,'triangle',.12,30);return;
    }
    if(type==='bossintro'){[65,98,130].forEach((f,i)=>v(f,1.8,'triangle',.08,f*.95,i*.12));this.hiss(1,.12,800);}
    else if(type==='sword'||type==='heavy'){this.hiss(type==='heavy'?.23:.13,.16,3200);v(250,.12,'triangle',.035,90);}
    else if(type==='jump')v(180,.12,'triangle',.025,390);
    else if(type==='dash'||type==='warrior2'){this.hiss(.24,.18,1800);v(150,.25,'sine',.1,40);}
    else if(type==='warrior1'){[0,.14,.28].forEach(d=>this.hiss(.16,.18,2500,d));v(150,.36,'triangle',.12,55);}
    else if(type==='archer1'||type==='shoot'){this.hiss(.08,.1,4800);v(480,.11,'triangle',.045,130);}
    else if(type==='archer2'){[0,.1,.2,.3].forEach((d,i)=>{this.hiss(.12,.08,4200,d);v(600+i*170,.35,'sine',.045,500,d);});}
    else if(type==='mage1'){[660,990,1320,1760].forEach((f,i)=>v(f,.65,'sine',.065,f*1.08,i*.04));this.hiss(.35,.1,6000);}
    else if(type==='mage2'){v(70,.8,'sawtooth',.09,280);v(220,.7,'triangle',.08,660);}
    else if(type==='shatter'){this.hiss(.28,.22,6200);[1200,1800,2400].forEach(f=>v(f,.17,'sine',.045,f*.6));}
    else if(type==='magic'){v(330,.22,'sine',.06,710);v(660,.18,'triangle',.025,390);}
    else if(type==='slam'){v(75,.6,'sine',.36,22);this.hiss(.5,.25,1300);}
    else if(type==='hurt'){v(160,.2,'sawtooth',.07,45);this.hiss(.16,.1,800);}
    else if(type==='shard')v(820,.12,'sine',.025,1300);
    else if(type==='heal'){v(440,.3,'sine',.05,660);v(880,.3,'sine',.035,880,.08);}
    else if(['start','clear','portal','upgrade'].includes(type))[220,330,440,660].forEach((f,i)=>v(f,.5,'sine',.04,f,i*.09));
    else if(['victory','bossdeath'].includes(type))[261,329,392,523,659,784].forEach((f,i)=>v(f,.9,'triangle',.05,f,i*.15));
    else if(type==='death')[220,174,130,65].forEach((f,i)=>v(f,.7,'sine',.06,f*.8,i*.18));
  }
}
