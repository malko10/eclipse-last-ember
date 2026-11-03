import assert from 'node:assert/strict';
import { Game, UPGRADE_POOL, CLASSES } from '../dist/engine.js';

const saved = new Map();
globalThis.localStorage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) };
const tick = (g, seconds, input = {}) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60, input); };

const game = new Game();
assert.equal(game.mode, 'title');
assert.ok(game.platforms.length >= 4 && game.enemies.length >= 3);
game.start();
assert.equal(game.mode, 'playing');
const startY = game.player.y;
game.update(1 / 60, { jumpPressed: true, jumpHeld: true });
tick(game, 0.22, { jumpHeld: true });
assert.ok(game.player.y < startY - 80, 'jump rises smoothly');
game.update(1 / 60, { jumpPressed: true, jumpHeld: true });
assert.equal(game.player.jumps, 2);
assert.ok(game.player.vy < -500, 'double jump resets vertical speed');
game.update(1 / 60, { jumpPressed: true, jumpHeld: true });
assert.equal(game.player.jumps, 2, 'a third jump is unavailable without upgrade');
tick(game, 1.5, {});
assert.ok(game.player.grounded);
assert.equal(game.player.y + game.player.h, 660);

game.player.invuln = 0;
const hp = game.player.hp;
game.update(1 / 60, { dashPressed: true, right: true });
game.hurtPlayer(20, -1);
assert.equal(game.player.hp, hp, 'dash grants invulnerability');
assert.ok(game.player.vx > 900);
game.pause();
const pausedX = game.player.x;
tick(game, 1, { right: true });
assert.equal(game.player.x, pausedX);
game.resume();

game.restart();
const target = game.enemies[0];
game.player.x = target.x - 45;
game.player.y = target.y - 6;
game.update(1 / 60, { attackPressed: true });
assert.ok(target.hp < target.maxHp, 'nearby sword strike damages an enemy');
const firstHit = target.hp;
tick(game, 0.1);
assert.equal(target.hp, firstHit, 'one attack cannot hit same enemy repeatedly');
tick(game, 0.3);
game.player.x = target.x - 45;
game.update(1 / 60, { attackPressed: true });
assert.ok(target.hp <= 0, 'two connected strikes defeat first-room crawler');
assert.equal(game.kills, 1);

game.restart();
for (let stage = 1; stage <= 5; stage++) {
  assert.equal(game.stage, stage);
  if (stage === 5) assert.equal(game.boss.type, 'boss');
  for (const e of [...game.enemies]) game.damageEnemy(e, 10000);
  tick(game, 0.2);
  assert.ok(game.portal.active, 'cleared room opens portal');
  game.player.x = game.portal.x;
  game.player.y = 614;
  game.update(1 / 60, { interactPressed: true });
  if (stage < 5) {
    assert.equal(game.mode, 'upgrade');
    assert.equal(game.choices.length, 3);
    assert.equal(game.chooseUpgrade('missing'), false);
    const choice = game.choices[0];
    assert.equal(game.chooseUpgrade(choice.id), true);
    assert.ok(game.upgrades.includes(choice.id));
    assert.equal(game.mode, 'playing');
  } else assert.equal(game.mode, 'won');
}
assert.equal(game.victories, 1);
assert.equal(game.bestStage, 5);

// Every choice can be applied; transient room reset must preserve the selected build.
for (const upgrade of UPGRADE_POOL) {
  const g = new Game();
  g.start();
  g.choices = [upgrade];
  g.mode = 'upgrade';
  assert.equal(g.chooseUpgrade(upgrade.id), true);
  assert.ok(g.upgrades.includes(upgrade.id));
  if (upgrade.id === 'wings') assert.equal(g.player.maxJumps, 3);
  if (upgrade.id === 'vital') assert.ok(g.player.maxHp >= 130);
}

const survival = new Game();
survival.start();
survival.player.maxHp = survival.player.hp = 100000;
for (let frame = 0; frame < 6000; frame++) {
  survival.update(1 / 60, { right: frame % 300 < 150, left: frame % 300 >= 150, jumpPressed: frame % 50 === 0, jumpHeld: true, dashPressed: frame % 65 === 0, attackPressed: frame % 16 === 0 });
  assert.ok(Number.isFinite(survival.player.x) && Number.isFinite(survival.player.y));
  assert.ok(survival.player.x >= 22 && survival.player.x + survival.player.w <= 1258);
  assert.ok(survival.player.y + survival.player.h <= 660.01);
}
survival.metaShards = 80;
survival.save();
const persisted = new Game();
assert.equal(persisted.metaShards, 80);
assert.equal(persisted.metaBonus, 20);
assert.equal(persisted.player.maxHp, CLASSES.warrior.hp + 20);
console.log('Engine checks passed: physics, double jump, dash, pause, melee, all five stages, upgrades, simulation, persistence.');
