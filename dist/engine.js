const W = 1280, FLOOR = 660;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const move = (v, target, amount) => v < target ? Math.min(target, v + amount) : Math.max(target, v - amount);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const center = (e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
const ROOMS = ['잊힌 숲', '푸른 잔향', '침묵의 성채', '별이 잠든 곳', '월식의 심장'];

export const UPGRADE_POOL = [
  { id: 'edge', name: '새벽의 칼날', subtitle: '공격력 강화', description: '모든 검격의 피해량이 30% 증가합니다.', icon: 'sword', rarity: 'RARE' },
  { id: 'blood', name: '붉은 맹세', subtitle: '생명 흡수', description: '검으로 적을 맞힐 때 체력을 2 회복합니다. 즉시 체력 20 회복.', icon: 'heart', rarity: 'EPIC' },
  { id: 'wings', name: '바람의 깃', subtitle: '트리플 점프', description: '공중에서 한 번 더 점프할 수 있습니다. 이동 속도 +12%.', icon: 'wing', rarity: 'RARE' },
  { id: 'rapid', name: '번개의 맥박', subtitle: '빠른 검격', description: '공격 대기시간이 25% 감소합니다. 치명타 확률 +10%.', icon: 'bolt', rarity: 'RARE' },
  { id: 'ember', name: '꺼지지 않는 불씨', subtitle: '화염 검', description: '검격이 적을 불태워 3초 동안 추가 피해를 줍니다.', icon: 'flame', rarity: 'EPIC' },
  { id: 'vital', name: '오래된 생명', subtitle: '체력 강화', description: '최대 체력이 30 증가하고 체력을 40 회복합니다.', icon: 'heart', rarity: 'RARE' },
  { id: 'echo', name: '달빛의 잔상', subtitle: '검기 발사', description: '세 번째 연속 공격이 적을 관통하는 달빛 검기를 발사합니다.', icon: 'moon', rarity: 'EPIC' },
  { id: 'shell', name: '별의 가호', subtitle: '피해 감소', description: '받는 피해가 25% 감소합니다. 즉시 체력 15 회복.', icon: 'shield', rarity: 'RARE' },
  { id: 'storm', name: '섬광의 발걸음', subtitle: '공격 대시', description: '대시가 닿은 적에게 피해를 줍니다. 대시 대기시간 -25%.', icon: 'bolt', rarity: 'EPIC' },
  { id: 'moon', name: '운명의 파편', subtitle: '치명타 강화', description: '치명타 확률이 25% 증가합니다. 치명타는 2배 피해를 줍니다.', icon: 'gem', rarity: 'EPIC' },
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
    this.cleared = false;
    this.attackBox = null;
    this.id = 0;
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
    this.player = {
      x: 135, y: FLOOR - 46, w: 30, h: 46, vx: 0, vy: 0, face: 1,
      hp: 100 + memory, maxHp: 100 + memory, grounded: true,
      damage: 22, speed: 350, jumps: 0, maxJumps: 2, coyote: 0.1,
      jumpBuffer: 0, attackTime: 0, attackCooldown: 0, attackSpeed: 1,
      dashTime: 0, dashCooldown: 0, dashRecovery: 0.85, invuln: 0,
      combo: 0, comboWindow: 0, crit: 0.05, defense: 1,
      hitIds: new Set(), dashHitIds: new Set(), trail: [], memory,
    };
  }

  start() {
    this.stage = 1;
    this.runTime = 0;
    this.kills = 0;
    this.currency = 0;
    this.upgrades = [];
    this.choices = [];
    this.resetPlayer();
    this.makeRoom();
    this.setMode('playing');
    this.emit('notify', this.player.memory > 0 ? `기억의 힘 · 최대 체력 +${this.player.memory}` : '검을 들고, 마지막 불씨를 지켜라.');
    this.emit('sfx', 'start');
  }

  restart() { this.start(); }
  pause() { if (this.mode === 'playing') this.setMode('paused'); }
  resume() { if (this.mode === 'paused') this.setMode('playing'); }

  makeRoom(title = false) {
    this.roomName = ROOMS[this.stage - 1];
    this.platforms = [{ x: 0, y: FLOOR, w: W, h: 80, kind: 'ground' }];
    const layouts = [
      [[235, 530, 210], [530, 430, 210], [825, 535, 225], [1040, 345, 150]],
      [[170, 520, 180], [420, 410, 190], [700, 510, 200], [985, 395, 180]],
      [[220, 535, 180], [485, 440, 200], [760, 340, 185], [970, 535, 180]],
      [[165, 525, 200], [435, 375, 195], [710, 510, 200], [995, 390, 180]],
      [[210, 500, 180], [515, 380, 230], [890, 500, 180]],
    ];
    const layout = layouts[title ? 0 : (this.stage - 1 + Math.floor(this.random() * 3)) % 4];
    const chosenLayout = this.stage === 5 ? layouts[4] : layout;
    chosenLayout.forEach(([x, y, w]) => this.platforms.push({ x, y, w, h: 23, kind: 'ledge' }));
    this.enemies = [];
    this.particles = [];
    this.texts = [];
    this.projectiles = [];
    this.drops = [];
    this.boss = null;
    this.shake = 0;
    this.flash = 0;
    this.hitStop = 0;
    this.pendingActions = {};
    this.attackBox = null;
    this.cleared = false;
    this.portal = { x: 1150, y: FLOOR - 112, w: 62, h: 112, active: false };
    const p = this.player;
    Object.assign(p, { x: 110, y: FLOOR - p.h, vx: 0, vy: 0, face: 1, grounded: true, jumps: 0, coyote: 0.1, jumpBuffer: 0, attackTime: 0, attackCooldown: 0, dashTime: 0, dashCooldown: 0, invuln: 1.2, combo: 0, comboWindow: 0, trail: [] });
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
      for (const action of ['jumpPressed', 'attackPressed', 'dashPressed', 'interactPressed']) {
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
    for (const timer of ['attackTime', 'attackCooldown', 'dashTime', 'dashCooldown', 'invuln', 'comboWindow', 'jumpBuffer']) p[timer] = Math.max(0, p[timer] - dt);
    p.coyote = p.grounded ? 0.1 : Math.max(0, p.coyote - dt);
    if (input.jumpPressed) p.jumpBuffer = 0.13;
    if (input.attackPressed && p.attackCooldown <= 0 && p.dashTime <= 0) this.attack();
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
    if (p.dashTime > 0) {
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
    if (p.attackTime > 0) {
      const reach = p.combo === 3 ? 118 : 96;
      this.attackBox = { x: p.face > 0 ? p.x + 10 : p.x + p.w - reach - 10, y: p.y - 18, w: reach, h: p.h + 38 };
      this.enemies.forEach(e => {
        if (e.hp > 0 && !p.hitIds.has(e.id) && overlap(this.attackBox, e)) {
          p.hitIds.add(e.id);
          const crit = this.random() < p.crit;
          this.damageEnemy(e, p.damage * (p.combo === 3 ? 1.65 : 1) * (crit ? 2 : 1), p.face, crit);
          if (this.upgrades.includes('blood')) p.hp = Math.min(p.maxHp, p.hp + 2);
          if (this.upgrades.includes('ember') && e.hp > 0) { e.burn = 3; e.burnTick = 0; }
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
    p.combo = p.comboWindow > 0 ? (p.combo % 3) + 1 : 1;
    p.comboWindow = 0.8;
    p.attackTime = p.combo === 3 ? 0.21 : 0.17;
    p.attackCooldown = (p.combo === 3 ? 0.35 : 0.24) * p.attackSpeed;
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

  updateEnemy(e, dt) {
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
          this.projectiles.push({ x: ec.x + e.face * 18, y: ec.y, vx: dx / len * 285, vy: dy / len * 285, r: 6, hostile: true, color: '#f4a58d', life: 4, damage: 9 + this.stage });
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
        e.vx = Math.abs(dx) > 48 ? e.face * (76 + this.stage * 6) : 0;
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

  damageEnemy(e, amount, direction = 0, crit = false, dot = false) {
    if (e.hp <= 0) return;
    const damage = Math.round(amount);
    e.hp -= damage;
    e.hitFlash = 0.12;
    if (!dot) {
      e.stun = e.type === 'boss' ? 0 : 0.17;
      if (e.type !== 'boss') { e.vx = direction * 180; e.vy = -90; }
      this.shake = Math.max(this.shake, crit ? 7 : 4);
      this.hitStop = crit ? 0.045 : 0.026;
      this.emit('sfx', 'hit');
    }
    this.texts.push({ x: e.x + e.w / 2, y: e.y - 7, text: String(damage) + (crit ? '!' : ''), color: dot ? '#eea078' : crit ? '#f6d699' : '#e9f5ee', life: 0.7 });
    this.burst(e.x + e.w / 2, e.y + e.h * 0.45, dot ? '#ed9262' : '#d8e8c4', dot ? 3 : 12, dot ? 75 : 220);
    if (e.hp <= 0) {
      this.kills++;
      this.burst(e.x + e.w / 2, e.y + e.h / 2, e.type === 'boss' ? '#f1c394' : '#759eae', e.type === 'boss' ? 80 : 25, 200);
      const amountShards = e.type === 'boss' ? 12 : 2 + Math.floor(this.random() * 3);
      this.drops.push({ x: e.x + e.w / 2, y: Math.min(FLOOR - 15, e.y + e.h / 2), type: 'shard', value: amountShards, phase: this.random() * 6 });
      if (e.type === 'boss' || this.random() < 0.32 || this.player.hp < this.player.maxHp * 0.35) this.drops.push({ x: e.x + e.w / 2 + 24, y: Math.min(FLOOR - 15, e.y + e.h / 2), type: 'heal', value: e.type === 'boss' ? 30 : 12, phase: this.random() * 6 });
      if (e.type === 'boss') { this.shake = 18; this.flash = 0.6; this.projectiles = this.projectiles.filter(b => !b.hostile); this.emit('sfx', 'bossdeath'); }
      this.save();
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
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) continue;
      const box = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
      if (b.hostile) {
        if (overlap(box, this.player)) { this.hurtPlayer(b.damage || 10, Math.sign(b.vx)); b.life = 0; }
      } else {
        for (const e of this.enemies) {
          if (e.hp > 0 && !b.hitIds.has(e.id) && overlap(box, e)) { b.hitIds.add(e.id); this.damageEnemy(e, b.damage, Math.sign(b.vx)); }
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
    this.choices = [];
    this.stage++;
    this.makeRoom();
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
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.25, dt); p.vy += 240 * dt; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const t of this.texts) { t.y -= 32 * dt; t.life -= dt; }
    this.texts = this.texts.filter(t => t.life > 0);
  }
}
