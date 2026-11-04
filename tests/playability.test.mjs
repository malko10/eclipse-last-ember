import assert from 'node:assert/strict';
import { Game } from '../dist/engine.js';

// Replay real input at 60 Hz; do not teleport or grant extra jumps mid-route.
function canJumpBetween(g, source, target) {
  if (target.y >= source.y) return true;
  const targetX = target.x + target.w / 2;
  const startX = Math.max(source.x + 22, Math.min(source.x + source.w - 22, targetX));
  for (const secondJump of [15, 20, 23, 27]) {
    g.resetPlayer();
    Object.assign(g.player, { x: startX - 15, y: source.y - 46, grounded: true });
    for (let frame = 0; frame < 150; frame++) {
      const p = g.player, dx = targetX - (p.x + 15);
      g.updatePlayer(1 / 60, { left: dx < -15, right: dx > 15, jumpPressed: frame === 0 || frame === secondJump, jumpHeld: true });
      if (frame > 3 && p.grounded && Math.abs(p.y + p.h - target.y) < 0.1 && p.x + p.w > target.x && p.x < target.x + target.w) return true;
    }
  }
  return false;
}

let layoutsChecked = 0;
for (let stage = 1; stage <= 5; stage++) {
  for (const random of [0, 0.4, 0.8]) {
    const g = new Game(); g.random = () => random; g.start(); g.stage = stage; g.makeRoom(); g.enemies = [];
    const reached = new Set([0]);
    for (let pass = 0; pass < g.platforms.length; pass++) {
      for (const source of [...reached]) for (let target = 1; target < g.platforms.length; target++) {
        if (!reached.has(target) && canJumpBetween(g, g.platforms[source], g.platforms[target])) reached.add(target);
      }
    }
    assert.equal(reached.size, g.platforms.length, `all stage ${stage} platforms reachable for layout roll ${random}`);
    layoutsChecked++;
  }
}

const inputs = new Game(); inputs.start();
inputs.hitStop = 0.03;
inputs.update(1 / 60, { jumpPressed: true, jumpHeld: true });
inputs.update(1 / 60, { jumpHeld: true });
inputs.update(1 / 60, { jumpHeld: true });
assert.ok(inputs.player.vy < -500, 'jump pressed during hit-stop executes when simulation resumes');

const reward = new Game(); reward.start(); reward.enemies = []; reward.player.x = reward.portal.x;
reward.drops = [{ x: 30, y: 300, type: 'shard', value: 9 }];
const before = reward.metaShards;
reward.update(1 / 60, { interactPressed: true });
assert.equal(reward.mode, 'upgrade');
assert.equal(reward.metaShards, before + 9, 'immediate portal exit preserves uncollected rewards');

const fatal = new Game(); fatal.start(); fatal.player.hp = 1; fatal.player.invuln = 0;
fatal.projectiles = [{ x: fatal.player.x + 15, y: fatal.player.y + 20, vx: 0, vy: 0, r: 8, hostile: true, damage: 20, life: 1 }];
fatal.drops = [{ x: fatal.player.x + 15, y: fatal.player.y + 20, type: 'heal', value: 20 }];
fatal.update(1 / 60, {});
assert.equal(fatal.mode, 'dead');
assert.equal(fatal.player.hp, 0, 'a death frame cannot be followed by drop healing');

// A simple keyboard-input bot fights the final room using base damage and HP.
// It only reacts to existing telegraphs and performs ordinary jumps/dashes.
const fight = new Game(); fight.random = () => 0.5; fight.start(); fight.stage = 5; fight.makeRoom();fight.finishIntro();
fight.player.hp = fight.player.maxHp = 100;
let frames = 0;
for (; frames < 60 * 90 && fight.mode === 'playing' && fight.enemies.length; frames++) {
  const p = fight.player, pcx = p.x + 15, pcy = p.y + 23;
  const e = [...fight.enemies].sort((a, b) => Math.hypot(a.x + a.w / 2 - pcx, a.y + a.h / 2 - pcy) - Math.hypot(b.x + b.w / 2 - pcx, b.y + b.h / 2 - pcy))[0];
  const dx = e.x + e.w / 2 - pcx, dy = e.y + e.h / 2 - pcy;
  const boss = fight.boss;
  const dodgeSlam = boss?.state === 'windup' && boss.attackKind === 'slam' && boss.telegraph < 0.4;
  const dodgeCharge = boss?.state === 'windup' && boss.attackKind === 'charge' && boss.telegraph < 0.08;
  fight.update(1 / 60, {
    left: dx < -45, right: dx > 45,
    attackPressed: frames % 15 === 0,
    jumpPressed: (dodgeSlam && p.grounded) || (dy < -45 && Math.abs(dx) < 170 && (p.grounded || (p.vy > -60 && p.jumps < p.maxJumps))),
    jumpHeld: true, dashPressed: dodgeCharge,
  });
}
assert.ok(fight.boss.hp <= 0 && fight.enemies.length === 0, `final room clear with ordinary inputs (mode=${fight.mode}, bossHP=${fight.boss.hp}, enemies=${fight.enemies.length})`);
assert.ok(fight.player.hp > 0);
console.log(`Playability checks passed: ${layoutsChecked} layout variants reachable, buffered input, retained loot, death integrity; final room defeated with base gear in ${(frames / 60).toFixed(1)}s, ${fight.player.hp} HP left.`);
