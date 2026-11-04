const W = 1280, FLOOR = 660;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const move = (v, target, amount) => v < target ? Math.min(target, v + amount) : Math.max(target, v - amount);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const center = (e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
export const ZONES = [
  {name:'잊힌 숲',en:'THE HOLLOW WOODS',tag:'이끼와 가시가 삼킨 오래된 숲',color:'#91d7ac',monsters:['가시 정령','밤나방','숲의 주술사'],weather:'spores'},
  {name:'서리 광산',en:'FROSTBOUND MINES',tag:'푸른 수정 아래 잠든 냉기의 군단',color:'#8bd9f3',monsters:['서리 갑충','얼음 박쥐','수정 술사'],weather:'snow'},
  {name:'잿불 주조장',en:'THE CINDER FORGE',tag:'쇳물과 재 속에서 깨어난 기계들',color:'#f8a471',monsters:['용광로 골렘','잿불 드론','화염 포병'],weather:'embers'},
  {name:'폭풍의 정원',en:'TEMPEST GARDENS',tag:'무너진 하늘 정원에 번개가 흐른다',color:'#b9c6ff',monsters:['폭풍 늑대','천둥 매','바람 사제'],weather:'rain'},
  {name:'공허의 왕좌',en:'THRONE OF THE ECLIPSE',tag:'별이 사라진 곳, 마지막 수문장',color:'#d8a6ef',monsters:['공허 망령','그림자 까마귀','월식의 사도'],weather:'void'},
];
export const CLASSES = {
  warrior:{id:'warrior',name:'검사',en:'THE VANGUARD',color:'#e7a184',hp:115,speed:350,damage:24,icon:'sword',role:'근접 · 균형',description:'검끝으로 길을 열고, 폭풍처럼 베어낸다.',passive:'체력 115 · 3연격 · 근접 공격으로 탄막 파괴',weapons:['blade','greatsword'],skills:[{name:'삼연 회오리',description:'몸을 회전해 3번 베고 적의 탄막을 지웁니다.',cooldown:5.5,icon:'sword'},{name:'여명 가르기',description:'무적 돌진 후 거대한 마무리 참격을 날립니다.',cooldown:10,icon:'flame'}]},
  archer:{id:'archer',name:'궁수',en:'THE WAYFARER',color:'#9ed6b2',hp:90,speed:390,damage:20,icon:'wing',role:'원거리 · 기동',description:'바람을 읽고, 어둠의 심장에 화살을 꽂는다.',passive:'체력 90 · 빠른 이동 · 전방의 적을 향해 조준',weapons:['longbow','repeater'],skills:[{name:'사냥꾼의 낙인',description:'관통 5연사. 맞은 적은 5초간 받는 피해 +25%.',cooldown:5,icon:'wing'},{name:'별무리 폭우',description:'표식이 찍힌 적을 우선 조준해 화살 폭풍을 부릅니다.',cooldown:11,icon:'moon'}]},
  mage:{id:'mage',name:'마법사',en:'THE STARKEEPER',color:'#c4aff5',hp:85,speed:335,damage:25,icon:'moon',role:'원거리 · 광역',description:'잊힌 별의 언어로, 새로운 새벽을 부른다.',passive:'체력 85 · 유도 마법탄 · 원소 효과',weapons:['emberstaff','froststaff'],skills:[{name:'빙결의 성좌',description:'주변 적을 동결. 다시 공격하거나 해동되면 파쇄됩니다.',cooldown:6,icon:'shield'},{name:'종말의 유성',description:'거대 운석이 폭발한 자리에 불길이 남습니다.',cooldown:12,icon:'flame'}]},
};
export const WEAPONS = {
  blade:{id:'blade',name:'새벽의 장검',detail:'빠른 3연격',damage:1,rate:1,reach:96,color:'#f1d8b1'},
  greatsword:{id:'greatsword',name:'잿빛 대검',detail:'느리지만 강한 광역 참격',damage:1.8,rate:1.65,reach:152,color:'#efb38f'},
  longbow:{id:'longbow',name:'달그림자 활',detail:'강한 관통 화살',damage:1.3,rate:1.65,speed:820,pierce:3,color:'#b5edd1'},
  repeater:{id:'repeater',name:'바람의 연노',detail:'빠른 연속 사격',damage:.65,rate:.65,speed:950,pierce:1,color:'#e2edbd'},
  emberstaff:{id:'emberstaff',name:'불씨 지팡이',detail:'추적 화염탄 · 폭발',damage:1.1,rate:1.7,speed:460,splash:64,color:'#f2ad82'},
  froststaff:{id:'froststaff',name:'서리 마도서',detail:'세 갈래 냉기탄 · 둔화',damage:.55,rate:1.8,speed:560,slow:true,color:'#9fdff5'},
};

export const UPGRADE_POOL = [
  { id: 'edge', name: '새벽의 칼날', subtitle: '공격력 강화', description: '무기와 스킬의 기본 피해량이 30% 증가합니다.', icon: 'sword', rarity: 'RARE' },
  { id: 'blood', name: '붉은 맹세', subtitle: '생명 흡수', description: '무기로 적을 맞힐 때 체력을 2 회복합니다. 즉시 체력 20 회복.', icon: 'heart', rarity: 'EPIC' },
  { id: 'wings', name: '바람의 깃', subtitle: '트리플 점프', description: '공중에서 한 번 더 점프할 수 있습니다. 이동 속도 +12%.', icon: 'wing', rarity: 'RARE' },
  { id: 'rapid', name: '번개의 맥박', subtitle: '공격 가속', description: '공격 대기시간이 25% 감소합니다. 치명타 확률 +10%.', icon: 'bolt', rarity: 'RARE' },
  { id: 'ember', name: '꺼지지 않는 불씨', subtitle: '화염 부여', description: '무기 공격이 적을 불태워 3초 동안 추가 피해를 줍니다.', icon: 'flame', rarity: 'EPIC' },
  { id: 'vital', name: '오래된 생명', subtitle: '체력 강화', description: '최대 체력이 30 증가하고 체력을 40 회복합니다.', icon: 'heart', rarity: 'RARE' },
  { id: 'echo', name: '달빛의 잔상', subtitle: '달빛 발사', description: '세 번째 연속 공격이 적을 관통하는 달빛 투사체를 발사합니다.', icon: 'moon', rarity: 'EPIC' },
  { id: 'shell', name: '별의 가호', subtitle: '피해 감소', description: '받는 피해가 25% 감소합니다. 즉시 체력 15 회복.', icon: 'shield', rarity: 'RARE' },
  { id: 'storm', name: '섬광의 발걸음', subtitle: '공격 대시', description: '대시가 닿은 적에게 피해를 줍니다. 대시 대기시간 -25%.', icon: 'bolt', rarity: 'EPIC' },
  { id: 'moon', name: '운명의 파편', subtitle: '치명타 강화', description: '치명타 확률이 25% 증가합니다. 치명타는 2배 피해를 줍니다.', icon: 'gem', rarity: 'EPIC' },
  { id:'flow',name:'시간의 모래',subtitle:'스킬 가속',description:'두 스킬의 재사용 대기시간이 30% 감소합니다.',icon:'moon',rarity:'EPIC'},
  { id:'frost',name:'겨울의 숨결',subtitle:'냉기 부여',description:'모든 공격이 적을 2초간 느리게 만듭니다.',icon:'shield',rarity:'RARE'},
  { id:'nova',name:'별의 장례',subtitle:'연쇄 폭발',description:'적을 처치하면 주변 적에게 22 피해를 줍니다.',icon:'flame',rarity:'EPIC'},
  { id:'execution',name:'사냥꾼의 눈',subtitle:'마무리 일격',description:'체력이 35% 이하인 적에게 피해가 50% 증가합니다.',icon:'sword',rarity:'RARE'},
  { id:'spirit',name:'혼의 장막',subtitle:'스킬 보호막',description:'스킬 사용 후 1초 동안 피해를 받지 않습니다.',icon:'shield',rarity:'EPIC'},
  { id:'reach',name:'거인의 유산',subtitle:'범위 확장',description:'검의 범위 +30%, 원거리 투사체 크기와 폭발 범위 +35%.',icon:'wing',rarity:'RARE'},
  { id:'pulse',name:'파멸의 심장',subtitle:'스킬 강화',description:'직업 스킬의 피해량이 40% 증가합니다.',icon:'bolt',rarity:'EPIC'},
  { id:'renewal',name:'생명의 씨앗',subtitle:'회복 강화',description:'다음 층 입장 시 체력을 25 회복합니다. 즉시 체력 25 회복.',icon:'heart',rarity:'RARE'},
];

export class Game {
  constructor({ onEvent = () => {} } = {}) {
    this.onEvent = onEvent;
    this.random = Math.random;
    this.mode = 'title';
    this.time = 0;
    this.runTime = 0;
    this.stage = 1;
    this.kills = 0;
    this.currency = 0;
    this.bestStage = 1;
    this.bestKills = 0;
    this.metaShards = 0;
    this.victories = 0;
    try {
      const save = JSON.parse(localStorage.getItem('eclipse-save-v1') || '{}');
      this.bestStage = clamp(Number(save.bestStage) || 1, 1, 5);
      this.bestKills = Math.max(0, Number(save.bestKills) || 0);
      this.metaShards = Math.max(0, Number(save.metaShards) || 0);
      this.victories = Math.max(0, Number(save.victories) || 0);
    } catch {}
    this.metaBonus = Math.min(30, Math.floor(this.metaShards / 20) * 5);
    this.upgrades = [];
    this.choices = [];
    this.particles = [];
    this.texts = [];
    this.projectiles = [];
    this.drops = [];
    this.enemies = [];
    this.platforms = [];
    this.boss = null;
    this.shake = 0;
    this.flash = 0;
    this.hitStop = 0;
    this.pendingActions = {};
    this.cleared = false;this.hitChain=0;this.chainTimer=0;
    this.attackBox = null;
    this.id = 0;
    this.classId = 'warrior';
    this.zones = ZONES;
    this.fields = [];
    this.effects = [];
    this.resetPlayer();
    this.makeRoom(true);
  }

  emit(type, data) { this.onEvent(type, data); }
  setMode(mode) { this.mode = mode; this.emit('mode', mode); }
  save() {
    this.bestStage = Math.max(this.bestStage, this.stage);
    this.bestKills = Math.max(this.bestKills, this.kills);
    this.metaBonus = Math.min(30, Math.floor(this.metaShards / 20) * 5);
    try { localStorage.setItem('eclipse-save-v1', JSON.stringify({ bestStage: this.bestStage, bestKills: this.bestKills, metaShards: this.metaShards, victories: this.victories })); } catch {}
  }

  resetPlayer() {
    const memory = Math.min(30, Math.floor(this.metaShards / 20) * 5);
    const cls = CLASSES[this.classId] || CLASSES.warrior;
    this.classDef = cls;
    this.player = {
      x: 135, y: FLOOR - 46, w: 30, h: 46, vx: 0, vy: 0, face: 1,
      hp: cls.hp + memory, maxHp: cls.hp + memory, grounded: true,
      damage: cls.damage, speed: cls.speed, jumps: 0, maxJumps: 2, coyote: 0.1,
      jumpBuffer: 0, attackTime: 0, attackCooldown: 0, attackSpeed: 1,
      dashTime: 0, dashCooldown: 0, dashRecovery: 0.85, invuln: 0,
      combo: 0, comboWindow: 0, crit: 0.05, defense: 1,
      hitIds: new Set(), dashHitIds: new Set(), trail: [], memory,
      classId:cls.id, weaponId:cls.weapons[0], weapon:WEAPONS[cls.weapons[0]],color:cls.color,
      skillCooldowns:[0,0],skillTimes:[0,0],skillPower:1,cooldownScale:1,rangeScale:1,
      swapCooldown:0,rushTime:0,rushHits:new Set(),attackDuration:0,castTime:0,castDuration:0,castSkill:-1,
    };
  }

  start(classId = this.classId) {
    this.classId = CLASSES[classId] ? classId : 'warrior';
    this.stage = 1;
    this.runTime = 0;
    this.kills = 0;
    this.currency = 0;
    this.upgrades = [];
    this.choices = [];
    this.resetPlayer();
    this.makeRoom();
    this.setMode('playing');
    this.emit('notify', `${this.classDef.name} · J 공격 / K L 스킬 / F 무기 교체`);
    this.emit('sfx', 'start');
  }

  restart() { this.start(); }
  pause() { if (this.mode === 'playing') this.setMode('paused'); }
  resume() { if (this.mode === 'paused') this.setMode('playing'); }

  makeRoom(title = false) {
    this.zone = ZONES[this.stage-1];
    this.roomName = this.zone.name;
    this.platforms = [{ x: 0, y: FLOOR, w: W, h: 80, kind: 'ground' }];
    const layouts = [
      [[235, 530, 210], [530, 430, 210], [825, 535, 225], [1040, 345, 150]],
      [[170, 520, 180], [420, 410, 190], [700, 510, 200], [985, 395, 180]],
      [[220, 535, 180], [485, 440, 200], [760, 340, 185], [970, 535, 180]],
      [[165, 525, 200], [435, 375, 195], [710, 510, 200], [995, 390, 180]],
      [[210, 500, 180], [515, 380, 230], [890, 500, 180]],
    ];
    const chosenLayout = layouts[title ? 0 : this.stage - 1].map(([x,y,w],i)=>[x+(title||this.stage===5?0:Math.floor(this.random()*25)-12),y,w]);
    chosenLayout.forEach(([x, y, w]) => this.platforms.push({ x, y, w, h: 23, kind: 'ledge' }));
    this.enemies = [];
    this.particles = [];
    this.texts = [];
    this.projectiles = [];
    this.drops = [];
    this.fields = [];
    this.effects = [];
    this.boss = null;
    this.shake = 0;
    this.flash = 0;
    this.hitStop = 0;
    this.pendingActions = {};
    this.attackBox = null;
    this.cleared = false;this.hitChain=0;this.chainTimer=0;
    this.portal = { x: 1150, y: FLOOR - 112, w: 62, h: 112, active: false };
    const p = this.player;
    Object.assign(p, { x: 110, y: FLOOR - p.h, vx: 0, vy: 0, face: 1, grounded: true, jumps: 0, coyote: 0.1, jumpBuffer: 0, attackTime: 0, attackCooldown: 0, dashTime: 0, dashCooldown: 0, invuln: 1.2, combo: 0, comboWindow: 0, trail: [],skillCooldowns:[0,0],rushTime:0,castTime:0,castSkill:-1 });
    if (this.stage === 5) {
      this.boss = this.spawnEnemy('boss', 950, FLOOR - 112);
      this.spawnEnemy('flyer', 670, 420);
      this.spawnEnemy('flyer', 1050, 350);
    } else {
      this.spawnEnemy('crawler', 565, FLOOR - 40);
      this.spawnEnemy('crawler', 1000, FLOOR - 40);
      const ledge = this.platforms[2];
      this.spawnEnemy('archer', ledge.x + ledge.w * 0.6, ledge.y - 46);
      if (this.stage >= 2) this.spawnEnemy('flyer', 800, 360);
      if (this.stage >= 3) {
        this.spawnEnemy('crawler', 790, FLOOR - 40);
        const ledge2 = this.platforms[4];
        this.spawnEnemy('archer', ledge2.x + 30, ledge2.y - 46);
      }
      if (this.stage >= 4) this.spawnEnemy('flyer', 470, 300);
    }
    if (title) {
      p.x = 365; p.y = FLOOR - p.h;
      p.invuln = 0;
    } else {
      this.save();
      this.emit('room', this.roomName);
    }
  }

  spawnEnemy(type, x, y) {
    const size = type === 'boss' ? [90, 112] : type === 'flyer' ? [32, 28] : type === 'archer' ? [30, 46] : [38, 40];
    const hp = type === 'boss' ? 450 : (type === 'flyer' ? 29 : type === 'archer' ? 33 : 38) + (this.stage - 1) * 6;
    const e = {
      id: ++this.id, type, x, y, w: size[0], h: size[1], vx: 0, vy: 0, face: -1,
      hp, maxHp: hp, hitFlash: 0, attackTime: 0, telegraph: 0, grounded: false,
      cooldown: 0.9 + this.random(), state: 'idle', phase: this.random() * 6.28,
      homeY: y, burn: 0, burnTick: 0, stun: 0, pattern: 0, contactHit: false,
      biome:this.stage, name:this.zone.monsters[type==='crawler'?0:type==='flyer'?1:2],slow:0,
    };
    this.enemies.push(e);
    return e;
  }

  update(dt, input = {}) {
    dt = clamp(Number(dt) || 0, 0, 0.033);
    if (this.mode === 'paused') return;
    this.time += dt;
    this.updateEffects(dt);
    if (this.mode !== 'playing') return;
    this.runTime += dt;
    this.shake = Math.max(0, this.shake - dt * 30);
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.hitStop > 0) {
      // Input edges must survive the brief impact freeze; otherwise a well-timed
      // jump or dodge can disappear precisely when the player needs it most.
      for (const action of ['jumpPressed', 'attackPressed', 'dashPressed', 'interactPressed','skill1Pressed','skill2Pressed','swapPressed']) {
        if (input[action]) this.pendingActions[action] = true;
      }
      this.hitStop -= dt;
      return;
    }
    input = { ...input, ...this.pendingActions };
    this.pendingActions = {};
    this.updatePlayer(dt, input);
    if (this.mode !== 'playing') return;
    for (const e of [...this.enemies]) {
      if (e.hp > 0) this.updateEnemy(e, dt);
      if (this.mode !== 'playing') break;
    }
    if (this.mode !== 'playing') return;
    this.updateProjectiles(dt);
    if (this.mode !== 'playing') return;
    this.updateFields(dt);
    this.updateDrops(dt);
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (!this.enemies.length && !this.cleared) {
      this.cleared = true;
      this.portal.active = true;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8);
      this.emit('sfx', 'clear');
      this.emit('notify', this.stage === 5 ? '월식이 걷혔다. 문으로 돌아가세요.' : '방 클리어! 오른쪽 문에서 E · 체력 +8');
      this.burst(1180, 600, '#94f5d8', 45, 200);
    }
    if (this.portal.active && input.interactPressed && Math.abs(center(this.player).x - (this.portal.x + 31)) < 115 && this.player.y + this.player.h > this.portal.y) {
      // Clearing a room earns its remaining drops even when the player exits
      // before the room-wide pickup attraction finishes its animation.
      this.drops.forEach(d => this.collectDrop(d));
      this.drops = [];
      if (this.stage === 5) {
        this.victories++;
        this.save();
        this.setMode('won');
        this.emit('sfx', 'victory');
      } else {
        this.choices = UPGRADE_POOL.filter(u => !this.upgrades.includes(u.id)).sort(() => this.random() - 0.5).slice(0, 3);
        this.setMode('upgrade');
        this.emit('sfx', 'portal');
      }
    }
  }

  updatePlayer(dt, input) {
    const p = this.player;
    const endingRush=p.rushTime>0&&p.rushTime<=dt;
    for (const timer of ['attackTime', 'attackCooldown', 'dashTime', 'dashCooldown', 'invuln', 'comboWindow', 'jumpBuffer','swapCooldown','rushTime','castTime']) p[timer] = Math.max(0, p[timer] - dt);
    if(endingRush){const pc=center(p);this.areaHit(pc.x+p.face*50,pc.y,150*p.rangeScale,p.damage*1.8*p.skillPower);this.effects.push({type:'cleave',x:pc.x,y:pc.y,r:150,color:'#ffe3a1',face:p.face,life:.42,maxLife:.42});this.emit('sfx','heavy');p.attackTime=p.attackDuration=.26;p.combo=3;}
    p.skillCooldowns = p.skillCooldowns.map(t=>Math.max(0,t-dt));
    if(input.swapPressed && p.swapCooldown<=0){const ids=this.classDef.weapons;p.weaponId=ids[(ids.indexOf(p.weaponId)+1)%ids.length];p.weapon=WEAPONS[p.weaponId];p.swapCooldown=.35;p.attackTime=0;this.emit('notify',`${p.weapon.name} · ${p.weapon.detail}`);this.emit('sfx','upgrade');}
    if(input.skill1Pressed)this.useSkill(0);
    if(input.skill2Pressed)this.useSkill(1);
    p.coyote = p.grounded ? 0.1 : Math.max(0, p.coyote - dt);
    if (input.jumpPressed) p.jumpBuffer = 0.13;
    if (input.attackPressed && p.attackCooldown <= 0 && p.dashTime <= 0 && p.castTime<=0) this.attack();
    const dir = Number(!!input.right) - Number(!!input.left);
    if (input.dashPressed && p.dashCooldown <= 0) {
      if (dir) p.face = dir;
      p.dashTime = 0.16;
      p.dashCooldown = p.dashRecovery;
      p.invuln = Math.max(p.invuln, 0.22);
      p.vx = p.face * 990;
      p.vy = 0;
      p.dashHitIds.clear();
      this.emit('sfx', 'dash');
      this.burst(p.x + p.w / 2, p.y + p.h / 2, '#a6e5e3', 12, 120);
    }
    if (p.rushTime>0){p.vx=p.face*850;p.vy=0;p.invuln=Math.max(p.invuln,.1);const box={x:p.x-35,y:p.y-35,w:105,h:110};for(const e of this.enemies){if(e.hp>0&&!p.rushHits.has(e.id)&&overlap(box,e)){p.rushHits.add(e.id);this.damageEnemy(e,p.damage*3.2*p.skillPower,p.face);}}}
    else if (p.dashTime > 0) {
      p.vx = p.face * 990;
      p.vy = 0;
      p.trail.push({ x: p.x, y: p.y, face: p.face, life: 0.2 });
      if (this.upgrades.includes('storm')) {
        const box = { x: p.x - 20, y: p.y - 15, w: p.w + 40, h: p.h + 30 };
        this.enemies.forEach(e => {
          if (!p.dashHitIds.has(e.id) && overlap(box, e)) {
            p.dashHitIds.add(e.id);
            this.damageEnemy(e, p.damage * 1.4, p.face, false);
          }
        });
      }
    } else {
      if (dir) p.face = dir;
      p.vx = move(p.vx, dir * p.speed, (p.grounded ? 3300 : 2100) * dt);
      p.vy = Math.min(1050, p.vy + 1800 * dt);
      if (p.jumpBuffer > 0 && (p.coyote > 0 || p.jumps < p.maxJumps)) {
        const first = p.coyote > 0;
        p.jumps = first ? 1 : p.jumps + 1;
        p.vy = first ? -650 : -610;
        p.grounded = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        this.burst(p.x + 15, p.y + p.h, first ? '#779a99' : '#a0e9d3', first ? 9 : 15, 130);
        this.emit('sfx', 'jump');
      }
      if (!input.jumpHeld && p.vy < -230) p.vy += 2200 * dt;
    }
    this.moveBody(p, dt, true);
    p.trail = p.trail.filter(t => (t.life -= dt) > 0);
    const swingProgress=1-p.attackTime/(p.attackDuration||.2);
    if (p.attackTime > 0 && p.classId==='warrior' && swingProgress>=.2 && swingProgress<.85) {
      const reach = p.weapon.reach * p.rangeScale * (p.combo===3?1.23:1);
      this.attackBox = { x: p.face > 0 ? p.x + 10 : p.x + p.w - reach - 10, y: p.y - 18, w: reach, h: p.h + 38 };
      this.enemies.forEach(e => {
        if (e.hp > 0 && !p.hitIds.has(e.id) && overlap(this.attackBox, e)) {
          p.hitIds.add(e.id);
          const crit = this.random() < p.crit;
          this.damageEnemy(e, p.damage * p.weapon.damage * (p.combo === 3 ? 1.65 : 1) * (crit ? 2 : 1), p.face, crit);
          this.onWeaponHit(e);
        }
      });
      // A sword can destroy ordinary enemy bolts; large boss waves require a dash or jump.
      this.projectiles.forEach(b => {
        if (b.hostile && !b.wave && overlap(this.attackBox, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) {
          b.life = 0;
          this.burst(b.x, b.y, '#e6dab8', 7, 140);
        }
      });
    } else this.attackBox = null;
  }

  attack() {
    const p = this.player;
    if(p.classId!=='warrior'){this.rangedAttack();return;}
    p.combo = p.comboWindow > 0 ? (p.combo % 3) + 1 : 1;
    p.comboWindow = 0.8;
    p.attackTime = p.attackDuration = (p.combo === 3 ? 0.3 : 0.23)*(p.weaponId==='greatsword'?1.35:1);
    p.attackCooldown = (p.combo === 3 ? 0.35 : 0.24) * p.attackSpeed * p.weapon.rate;
    p.hitIds.clear();
    this.emit('sfx', p.combo === 3 ? 'heavy' : 'sword');
    if (p.combo === 3 && this.upgrades.includes('echo')) {
      this.projectiles.push({ x: p.x + 15 + p.face * 32, y: p.y + 18, vx: p.face * 760, vy: 0, r: 18, hostile: false, color: '#b4fff0', life: 1.6, damage: p.damage * 1.25, hitIds: new Set() });
    }
  }

  moveBody(e, dt, isPlayer = false) {
    const prevBottom = e.y + e.h;
    e.x = clamp(e.x + e.vx * dt, 22, W - e.w - 22);
    e.y += e.vy * dt;
    e.grounded = false;
    if (e.vy >= 0) {
      for (const plat of this.platforms) {
        if (e.x + e.w > plat.x + 1 && e.x < plat.x + plat.w - 1 && prevBottom <= plat.y + 2 && e.y + e.h >= plat.y) {
          e.y = plat.y - e.h;
          e.vy = 0;
          e.grounded = true;
          if (isPlayer) e.jumps = 0;
          break;
        }
      }
    }
    if (e.y + e.h > FLOOR) { e.y = FLOOR - e.h; e.vy = 0; e.grounded = true; if (isPlayer) e.jumps = 0; }
    e.y = Math.max(-100, e.y);
  }

  aimTarget() {
    const p=this.player,pc=center(p);
    return this.enemies.filter(e=>e.hp>0&&(center(e).x-pc.x)*p.face>-25).sort((a,b)=>Math.hypot(center(a).x-pc.x,center(a).y-pc.y)-Math.hypot(center(b).x-pc.x,center(b).y-pc.y))[0];
  }

  shootPlayer(angle,options={}) {
    const p=this.player,w=p.weapon,speed=options.speed||w.speed||700;
    this.projectiles.push({x:p.x+p.w/2+p.face*20,y:p.y+20,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:(options.r||5)*p.rangeScale,hostile:false,color:options.color||w.color,life:2.6,damage:p.damage*(options.multiplier||w.damage||1),hitIds:new Set(),pierce:options.pierce??w.pierce??1,shape:p.classId==='archer'?'arrow':'orb',splash:options.splash??w.splash??0,slow:options.slow??w.slow??false,homing:options.homing??(p.classId==='mage'&&p.weaponId==='emberstaff'),mark:options.mark||false});
  }

  rangedAttack() {
    const p=this.player,target=this.aimTarget(),pc=center(p);
    const angle=target?Math.atan2(center(target).y-pc.y,center(target).x-pc.x):p.face>0?0:Math.PI;
    p.combo=p.comboWindow>0?(p.combo%3)+1:1;p.comboWindow=1.2;p.attackTime=p.attackDuration=.25;p.attackCooldown=.25*p.weapon.rate*p.attackSpeed;
    if(p.weaponId==='froststaff')for(const spread of [-.14,0,.14])this.shootPlayer(angle+spread,{r:6});
    else this.shootPlayer(angle,{r:p.classId==='mage'?8:4});
    if(p.combo===3&&this.upgrades.includes('echo'))this.shootPlayer(angle,{r:12,pierce:8,multiplier:1.5,color:'#caffec',homing:false});
    this.emit('sfx',p.classId==='mage'?'magic':'shoot');
  }

  onWeaponHit(e) {
    const p=this.player;
    if(this.upgrades.includes('blood'))p.hp=Math.min(p.maxHp,p.hp+2);
    if(this.upgrades.includes('ember')&&e.hp>0){e.burn=3;e.burnTick=0;}
    if(this.upgrades.includes('frost'))e.slow=Math.max(e.slow||0,2);
  }

  useSkill(index) {
    const p=this.player;if(p.skillCooldowns[index]>0)return false;
    const skill=this.classDef.skills[index];p.skillCooldowns[index]=skill.cooldown*p.cooldownScale;p.skillTimes[index]=p.skillCooldowns[index];
    if(this.upgrades.includes('spirit'))p.invuln=Math.max(p.invuln,1);
    const pc=center(p),power=p.skillPower;
    this.emit('sfx',p.classId+(index+1));
    p.castTime=p.castDuration=index===0?.55:.8;p.castSkill=index;
    this.texts.push({x:pc.x,y:p.y-25,text:skill.name,color:p.color,life:1});
    if(p.classId==='warrior'){
      if(index===0){this.fields.push({type:'cyclone',x:pc.x,y:pc.y,r:165*p.rangeScale,delay:0,life:.56,tick:0,damage:p.damage*1.05*power,color:'#ffe3b5'});p.invuln=Math.max(p.invuln,.5);}
      else {p.rushTime=.48;p.rushHits.clear();p.invuln=.8;p.hitIds.clear();this.effects.push({type:'dashline',x:pc.x,y:pc.y,r:360,face:p.face,color:'#ffd3a0',life:.5,maxLife:.5});}
    }else if(p.classId==='archer'){
      const target=this.aimTarget(),tc=target?center(target):{x:clamp(pc.x+p.face*260,60,1220),y:570};
      if(index===0){const angle=Math.atan2(tc.y-pc.y,tc.x-pc.x);for(let i=-2;i<=2;i++)this.shootPlayer(angle+i*.13,{pierce:8,multiplier:1.3*power,speed:950,color:'#d6ffe7',mark:true});this.effects.push({type:'fan',x:pc.x,y:pc.y,r:140,angle,color:'#c8ffe0',life:.4,maxLife:.4});}
      else{const marked=this.enemies.find(e=>e.hp>0&&e.marked>0),at=marked?center(marked):tc;this.fields.push({type:'rain',x:at.x,y:at.y,r:145,delay:.45,life:2.5,tick:0,damage:p.damage*.6*power,color:'#b8efd1'});}
    }else{
      if(index===0){this.areaHit(pc.x,pc.y,220,p.damage*1.2*power,3.5);for(const e of this.enemies)if(e.hp>0&&Math.hypot(center(e).x-pc.x,center(e).y-pc.y)<220){e.frozen=e.type==='boss'?.4:1.1;e.shatterDamage=p.damage*1.3*power;}this.effects.push({type:'frost',x:pc.x,y:pc.y,r:220,color:'#a7eaff',life:.7,maxLife:.7});p.invuln=Math.max(p.invuln,.35);}
      else{const target=this.aimTarget(),tc=target?center(target):{x:clamp(pc.x+p.face*240,60,1220),y:570};this.fields.push({type:'meteor',x:tc.x,y:tc.y,r:175,delay:.75,life:1,tick:0,damage:p.damage*4.4*power,color:'#f5ad83'});}
    }
    this.burst(pc.x,pc.y,p.color,20,160);return true;
  }

  areaHit(x,y,r,damage,slow=0) {
    for(const e of [...this.enemies])if(e.hp>0&&Math.hypot(center(e).x-x,center(e).y-y)<r){this.damageEnemy(e,damage,Math.sign(e.x-x));if(slow){e.slow=slow;e.stun=Math.max(e.stun,e.type==='boss'?.25:1);}}
    this.shake=Math.max(this.shake,7);
  }

  updateFields(dt) {
    const spawned=[];
    for(const f of this.fields){
      f.delay-=dt;if(f.delay>0)continue;f.life-=dt;f.tick-=dt;
      if(f.type==='cyclone'){const pc=center(this.player);f.x=pc.x;f.y=pc.y;this.projectiles=this.projectiles.filter(b=>!b.hostile||Math.hypot(b.x-f.x,b.y-f.y)>f.r);}
      if(f.tick<=0){
        f.tick=f.type==='rain'?.28:f.type==='cyclone'?.2:f.type==='embers'?.45:10;
        if(f.type==='embers'){for(const e of this.enemies)if(e.hp>0&&Math.hypot(center(e).x-f.x,center(e).y-f.y)<f.r)this.damageEnemy(e,f.damage,0,false,true);}
        else this.areaHit(f.x,f.y,f.r,f.damage);
        this.effects.push({type:f.type==='meteor'?'blast':f.type,x:f.x,y:f.y,r:f.r,color:f.color,life:f.type==='meteor'?.65:.42,maxLife:f.type==='meteor'?.65:.42});
        this.burst(f.x,f.y,f.color,f.type==='meteor'?60:6,f.type==='meteor'?330:100);
        if(f.type==='meteor'){this.emit('sfx','slam');this.shake=13;spawned.push({type:'embers',x:f.x,y:f.y,r:160,delay:0,life:2.6,tick:.35,damage:this.player.damage*.4*this.player.skillPower,color:'#f9a269'});}
      }
    }
    this.fields.push(...spawned);
    this.fields=this.fields.filter(f=>f.life>0);
  }

  updateEnemy(e, dt) {
    e.marked=Math.max(0,(e.marked||0)-dt);
    if(e.frozen>0){e.frozen=Math.max(0,e.frozen-dt);e.hitFlash=Math.max(0,e.hitFlash-dt);if(e.frozen===0)this.shatter(e);return;}
    e.slow=Math.max(0,(e.slow||0)-dt);if(e.slow>0)dt*=.45;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.attackTime = Math.max(0, e.attackTime - dt);
    e.cooldown = Math.max(0, e.cooldown - dt);
    e.stun = Math.max(0, e.stun - dt);
    if (e.burn > 0) {
      e.burn -= dt; e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.45;
        this.damageEnemy(e, 5, 0, false, true);
        this.burst(e.x + e.w / 2, e.y + e.h / 2, '#ee9161', 3, 55);
      }
      if (e.hp <= 0) return;
    }
    const p = this.player, pc = center(p), ec = center(e);
    const dx = pc.x - ec.x, dy = pc.y - ec.y;
    if (e.stun > 0 && e.type !== 'boss') {
      e.vx = move(e.vx, 0, 750 * dt);
      if (e.type !== 'flyer') { e.vy += 1800 * dt; this.moveBody(e, dt); }
      else { e.x = clamp(e.x + e.vx * dt, 20, W - 50); e.y += e.vy * dt; }
      return;
    }
    if (e.type === 'boss') { this.updateBoss(e, dt, dx, dy); return; }
    if (e.type === 'flyer') {
      if (e.state === 'windup') {
        e.telegraph -= dt; e.vx *= 0.85; e.vy *= 0.85;
        if (e.telegraph <= 0) {
          const length = Math.hypot(dx, dy) || 1;
          e.vx = dx / length * 380; e.vy = dy / length * 380;
          e.state = 'charge'; e.attackTime = 0.55; e.contactHit = false;
        }
      } else if (e.state === 'charge') {
        if (!e.contactHit && overlap(e, p)) { this.hurtPlayer(10 + this.stage, Math.sign(dx)); e.contactHit = true; }
        if (e.attackTime <= 0) { e.state = 'idle'; e.cooldown = 1.2; }
      } else {
        e.face = Math.sign(dx) || e.face;
        e.vx = move(e.vx, clamp(dx * 0.65, -90, 90), 380 * dt);
        const targetY = clamp(pc.y - 95, 270, 570) + Math.sin(this.time * 2 + e.phase) * 24;
        e.vy = move(e.vy, clamp((targetY - ec.y) * 1.7, -100, 100), 380 * dt);
        if (e.cooldown <= 0 && Math.abs(dx) < 360) { e.state = 'windup'; e.telegraph = 0.7; }
      }
      e.x = clamp(e.x + e.vx * dt, 24, W - e.w - 24);
      e.y = clamp(e.y + e.vy * dt, 180, FLOOR - e.h - 5);
      return;
    }
    e.vy += 1800 * dt;
    if (e.state === 'windup') {
      e.vx = move(e.vx, 0, 1200 * dt);
      e.telegraph -= dt;
      if (e.telegraph <= 0) {
        e.state = 'attack'; e.attackTime = 0.2;
        if (e.type === 'archer') {
          const len = Math.hypot(dx, dy) || 1;
          const aim=Math.atan2(dy,dx),spread=e.biome===3?[-.18,0,.18]:e.biome===4?[-.12,.12]:[0];
          for(const offset of spread)this.projectiles.push({x:ec.x+e.face*18,y:ec.y,vx:Math.cos(aim+offset)*(e.biome===4?360:285),vy:Math.sin(aim+offset)*(e.biome===4?360:285),r:e.biome===2?8:6,hostile:true,color:ZONES[e.biome-1].color,life:4,damage:9+this.stage});
          this.emit('sfx', 'shoot');
        } else {
          const hit = { x: e.face > 0 ? e.x : e.x - 48, y: e.y - 5, w: e.w + 48, h: e.h + 10 };
          if (overlap(hit, p)) this.hurtPlayer(8 + this.stage * 1.5, e.face);
          e.vx = e.face * 145;
        }
      }
    } else if (e.state === 'attack') {
      if (e.attackTime <= 0) { e.state = 'idle'; e.cooldown = e.type === 'archer' ? 1.6 : 1.1; }
    } else {
      e.face = Math.sign(dx) || e.face;
      if (e.type === 'crawler') {
        e.vx = Math.abs(dx) > 48 ? e.face * (76 + this.stage * 6) * (e.biome===4?1.5:e.biome===3?.75:1) : 0;
        if (e.grounded && dy < -65 && Math.abs(dx) < 320 && e.cooldown <= 0) {
          e.vy = -650; e.cooldown = 1.4;
        }
        if (e.cooldown <= 0 && Math.abs(dx) < 88 && Math.abs(dy) < 62) { e.state = 'windup'; e.telegraph = 0.55; }
      } else {
        e.vx = 0;
        if (e.cooldown <= 0) { e.state = 'windup'; e.telegraph = 0.8; }
      }
    }
    this.moveBody(e, dt);
  }

  updateBoss(e, dt, dx, dy) {
    const enraged = e.hp < e.maxHp * 0.45;
    e.enraged = enraged;
    e.vy += 1800 * dt;
    if (e.state === 'windup') {
      e.telegraph -= dt;
      e.vx = move(e.vx, 0, 800 * dt);
      if (e.telegraph <= 0) {
        e.state = 'attack';
        e.contactHit = false;
        if (e.attackKind === 'slam') {
          e.attackTime = 0.45;
          this.shake = 12;
          this.emit('sfx', 'slam');
          this.burst(e.x + e.w / 2, FLOOR - 4, '#f4b28a', 35, 300);
          for (const dir of [-1, 1]) this.projectiles.push({ x: e.x + e.w / 2, y: FLOOR - 18, vx: dir * (enraged ? 390 : 310), vy: 0, r: 18, hostile: true, color: '#ef8d73', life: 4, damage: 16, wave: true });
          if (Math.abs(dx) < 155 && this.player.y + this.player.h > FLOOR - 90) this.hurtPlayer(18, Math.sign(dx));
        } else if (e.attackKind === 'volley') {
          e.attackTime = 0.4;
          const ec = center(e), pc = center(this.player), aim = Math.atan2(pc.y - ec.y, pc.x - ec.x);
          for (let i = -2; i <= 2; i++) {
            const angle = aim + i * 0.2;
            this.projectiles.push({ x: ec.x, y: ec.y, vx: Math.cos(angle) * 275, vy: Math.sin(angle) * 275, r: 8, hostile: true, color: '#e7a786', life: 4, damage: 13 });
          }
          this.emit('sfx', 'shoot');
        } else {
          e.attackTime = 0.65;
          e.vx = e.face * (enraged ? 620 : 510);
          this.emit('sfx', 'dash');
        }
      }
    } else if (e.state === 'attack') {
      if (e.attackKind === 'charge' && !e.contactHit && overlap(e, this.player)) { this.hurtPlayer(17, e.face); e.contactHit = true; }
      if (e.attackTime <= 0 || (e.attackKind === 'charge' && (e.x < 28 || e.x + e.w > 1252))) {
        e.state = 'recover'; e.cooldown = enraged ? 1 : 1.45; e.vx = 0;
      }
    } else if (e.state === 'recover') {
      e.vx = 0;
      if (e.cooldown <= 0) e.state = 'idle';
    } else {
      e.face = Math.sign(dx) || e.face;
      e.vx = Math.abs(dx) > 160 ? e.face * (enraged ? 90 : 55) : 0;
      if (e.cooldown <= 0) {
        e.attackKind = ['slam', 'volley', 'charge'][e.pattern++ % 3];
        e.state = 'windup';
        e.telegraph = e.attackKind === 'charge' ? 1.05 : 0.85;
        this.emit('notify', e.attackKind === 'slam' ? '수호자가 땅을 내리친다 · 점프!' : e.attackKind === 'charge' ? '수호자가 돌진한다 · 대시로 통과!' : '달빛 탄막 · 검으로 튕겨내세요');
      }
    }
    this.moveBody(e, dt);
  }

  shatter(e){
    const amount=e.shatterDamage||this.player.damage;e.frozen=0;e.shatterDamage=0;
    const ec=center(e);this.effects.push({type:'frost',x:ec.x,y:ec.y,r:85,color:'#bbf4ff',life:.4,maxLife:.4});
    this.burst(ec.x,ec.y,'#bdf4ff',24,240);this.emit('sfx','shatter');
    this.damageEnemy(e,amount,0,false,true);
  }

  damageEnemy(e, amount, direction = 0, crit = false, dot = false) {
    if (e.hp <= 0) return;
    if(!dot&&e.frozen>0){this.shatter(e);if(e.hp<=0)return;}
    if(e.marked>0&&!dot)amount*=1.25;
    if(this.upgrades.includes('execution')&&e.hp/e.maxHp<.35)amount*=1.5;
    const damage = Math.round(amount);
    e.hp -= damage;
    e.hitFlash = 0.12;
    if (!dot) {
      const heavy=damage>=40,kill=e.hp<=0;
      e.stun = e.type === 'boss' ? 0 : heavy?.25:.17;
      if (e.type !== 'boss') { e.vx = direction * (heavy?280:170); e.vy = heavy?-140:-75; }
      this.shake = Math.max(this.shake, kill?7:heavy||crit?6:3.5);
      this.hitStop = Math.max(this.hitStop,kill?.07:heavy||crit?.055:.032);
      this.emit('impact',{heavy,crit,kill});
      this.effects.push({type:'impact',x:e.x+e.w/2,y:e.y+e.h*.45,r:heavy?62:38,color:crit?'#ffe1a0':this.player.color,face:direction||1,life:.24,maxLife:.24,heavy});
      this.hitChain=(this.chainTimer>0?this.hitChain||0:0)+1;this.chainTimer=2.2;
    }
    this.texts.push({ x: e.x + e.w / 2+(this.random()-.5)*15, y: e.y - 7, text: String(damage) + (crit ? '!' : ''), color: dot ? '#eea078' : crit ? '#f6d699' : '#e9f5ee', life: .8,maxLife:.8,heavy:!dot&&(damage>=40||crit),vx:direction*22 });
    this.burst(e.x + e.w / 2, e.y + e.h * 0.45, dot ? '#ed9262' : '#d8e8c4', dot ? 3 : 12, dot ? 75 : 220);
    if (e.hp <= 0) {
      this.kills++;
      this.burst(e.x + e.w / 2, e.y + e.h / 2, e.type === 'boss' ? '#f1c394' : '#759eae', e.type === 'boss' ? 80 : 25, 200);
      const amountShards = e.type === 'boss' ? 12 : 2 + Math.floor(this.random() * 3);
      this.drops.push({ x: e.x + e.w / 2, y: Math.min(FLOOR - 15, e.y + e.h / 2), type: 'shard', value: amountShards, phase: this.random() * 6 });
      if (e.type === 'boss' || this.random() < 0.32 || this.player.hp < this.player.maxHp * 0.35) this.drops.push({ x: e.x + e.w / 2 + 24, y: Math.min(FLOOR - 15, e.y + e.h / 2), type: 'heal', value: e.type === 'boss' ? 30 : 12, phase: this.random() * 6 });
      if (e.type === 'boss') { this.shake = 18; this.flash = 0.6; this.projectiles = this.projectiles.filter(b => !b.hostile); this.emit('sfx', 'bossdeath'); }
      this.save();
      if(this.upgrades.includes('nova')){const ec=center(e);this.effects.push({type:'blast',x:ec.x,y:ec.y,r:115,color:'#d4b2fc',life:.35,maxLife:.35});this.areaHit(ec.x,ec.y,115,22);}
    }
  }

  hurtPlayer(amount, direction) {
    const p = this.player;
    if (p.invuln > 0 || p.dashTime > 0 || this.mode !== 'playing') return;
    const damage = Math.round(amount * p.defense);
    p.hp = Math.max(0, p.hp - damage);
    p.invuln = 1.05;
    p.vx = (direction || 1) * 240;
    p.vy = -220;
    this.shake = 9;
    this.flash = 0.18;
    this.texts.push({ x: p.x + 15, y: p.y - 16, text: `−${damage}`, color: '#f28a83', life: 0.9 });
    this.burst(p.x + 15, p.y + 23, '#ed8e87', 20, 180);
    this.emit('sfx', 'hurt');
    if (p.hp <= 0) {
      this.save();
      this.setMode('dead');
      this.emit('sfx', 'death');
    }
  }

  updateProjectiles(dt) {
    for (const b of this.projectiles) {
      if(b.homing&&!b.hostile){const target=this.enemies.filter(e=>e.hp>0&&!b.hitIds.has(e.id)).sort((a,c)=>Math.hypot(center(a).x-b.x,center(a).y-b.y)-Math.hypot(center(c).x-b.x,center(c).y-b.y))[0];if(target){const tc=center(target),angle=Math.atan2(tc.y-b.y,tc.x-b.x),speed=Math.hypot(b.vx,b.vy);b.vx=move(b.vx,Math.cos(angle)*speed,700*dt);b.vy=move(b.vy,Math.sin(angle)*speed,700*dt);}}
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) continue;
      const box = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
      if (b.hostile) {
        if (overlap(box, this.player)) { this.hurtPlayer(b.damage || 10, Math.sign(b.vx)); b.life = 0; }
      } else {
        for (const e of this.enemies) {
          if (e.hp > 0 && !b.hitIds.has(e.id) && overlap(box, e)) {b.hitIds.add(e.id);if(b.mark)e.marked=5;const crit=this.random()<this.player.crit;this.damageEnemy(e,b.damage*(crit?2:1),Math.sign(b.vx),crit);this.onWeaponHit(e);if(b.slow)e.slow=2.5;if(b.splash){this.effects.push({type:'blast',x:b.x,y:b.y,r:b.splash*this.player.rangeScale,color:b.color,life:.3,maxLife:.3});for(const other of this.enemies)if(other!==e&&other.hp>0&&Math.hypot(center(other).x-b.x,center(other).y-b.y)<b.splash*this.player.rangeScale)this.damageEnemy(other,b.damage*.5,Math.sign(b.vx));}if(b.pierce!==undefined&&--b.pierce<=0){b.life=0;break;}}
        }
      }
    }
    this.projectiles = this.projectiles.filter(b => b.life > 0 && b.x > -50 && b.x < W + 50 && b.y > -50 && b.y < 740);
  }

  updateDrops(dt) {
    const pc = center(this.player);
    for (const d of this.drops) {
      const dx = pc.x - d.x, dy = pc.y - d.y, dist = Math.hypot(dx, dy);
      const magnet = this.cleared ? 1500 : 150;
      if (dist < magnet) {
        const speed = this.cleared ? 650 : 420;
        d.x += dx / Math.max(dist, 1) * Math.min(dist, speed * dt);
        d.y += dy / Math.max(dist, 1) * Math.min(dist, speed * dt);
      }
      if (dist < 28) {
        this.collectDrop(d);
      }
    }
    this.drops = this.drops.filter(d => !d.taken);
  }

  collectDrop(d) {
    if (d.taken) return;
    d.taken = true;
    const pc = center(this.player);
    if (d.type === 'shard') {
      this.currency += d.value;
      this.metaShards += d.value;
      this.texts.push({ x: pc.x, y: this.player.y - 10, text: `+${d.value} ✦`, color: '#d4dfb5', life: 0.8 });
      this.emit('sfx', 'shard');
      this.save();
    } else {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + d.value);
      this.texts.push({ x: pc.x, y: this.player.y - 10, text: `+${d.value}`, color: '#a7dfb8', life: 0.8 });
      this.emit('sfx', 'heal');
    }
  }

  chooseUpgrade(id) {
    if (this.mode !== 'upgrade' || !this.choices.some(c => c.id === id)) return false;
    const p = this.player;
    this.upgrades.push(id);
    if (id === 'edge') p.damage *= 1.3;
    if (id === 'blood') p.hp = Math.min(p.maxHp, p.hp + 20);
    if (id === 'wings') { p.maxJumps = 3; p.speed *= 1.12; }
    if (id === 'rapid') { p.attackSpeed *= 0.75; p.crit += 0.1; }
    if (id === 'vital') { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 40); }
    if (id === 'shell') { p.defense *= 0.75; p.hp = Math.min(p.maxHp, p.hp + 15); }
    if (id === 'storm') p.dashRecovery *= 0.75;
    if (id === 'moon') p.crit += 0.25;
    if(id==='flow')p.cooldownScale*=.7;
    if(id==='reach')p.rangeScale*=1.35;
    if(id==='pulse')p.skillPower*=1.4;
    if(id==='renewal')p.hp=Math.min(p.maxHp,p.hp+25);
    this.choices = [];
    this.stage++;
    this.makeRoom();
    if(this.upgrades.includes('renewal'))p.hp=Math.min(p.maxHp,p.hp+25);
    this.setMode('playing');
    this.emit('sfx', 'upgrade');
    this.emit('notify', `${this.stage === 5 ? '최종 보스' : `구역 ${this.stage}`} · ${this.roomName}`);
    return true;
  }

  burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = this.random() * Math.PI * 2, s = speed * (0.25 + this.random() * 0.75), life = 0.2 + this.random() * 0.4;
      this.particles.push({ x, y, vx: Math.cos(angle) * s, vy: Math.sin(angle) * s, life, maxLife: life, size: 1 + this.random() * 3, color });
    }
    if (this.particles.length > 450) this.particles.splice(0, this.particles.length - 450);
  }

  updateEffects(dt) {
    this.chainTimer=Math.max(0,(this.chainTimer||0)-dt);
    this.effects=this.effects.filter(e=>(e.life-=dt)>0);
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.25, dt); p.vy += 240 * dt; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const t of this.texts) { t.y -= 32 * dt;t.x+=(t.vx||0)*dt; t.life -= dt; }
    this.texts = this.texts.filter(t => t.life > 0);
  }
}
