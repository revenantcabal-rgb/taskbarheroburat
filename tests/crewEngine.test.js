'use strict';
/* Committed unit tests for the shared crew module (src/engine/crewEngine.js) — run by `node --test` in CI.
   Covers the duplicate-row fix (identity + dedupe) and the PvP Arena math. */
const test = require('node:test');
const assert = require('node:assert');
const CE = require('../src/engine/crewEngine.js');
const lib = require('../api/_lib.js');   // the serverless API keeps its OWN copy of the hash; this test enforces parity

test('identity: crewEngine.crewMemberId is byte-identical to the server canonMemberId', () => {
  for (const n of ['Bob', '  BOB ', 'José', 'JOSÉ', '玩家一号', 'naïve café ☕', 'x', 'a b  c', 'DadOfTBH']) {
    assert.strictEqual(CE.crewMemberId(n), lib.canonMemberId(n), 'client/server id mismatch for ' + JSON.stringify(n));
  }
});

test('identity: case / spacing / unicode variants collapse to one id', () => {
  const id = CE.crewMemberId('Bob');
  for (const v of ['bob', '  Bob  ', 'BOB', 'BoB', 'Bob']) assert.strictEqual(CE.crewMemberId(v), id);
  assert.notStrictEqual(CE.crewMemberId('Bobby'), id);
});

test('dedupeBoard collapses same-name rows, keeps the freshest, carries momentum/spark/achievement', () => {
  const now = Date.now();
  const { rows, merged } = CE.dedupeBoard([
    { id: 'old', name: 'Burat', updatedAt: new Date(now - 5000).toISOString(), stats: {} },
    { id: 'new', name: '  burat ', updatedAt: new Date(now - 1000).toISOString(), stats: {}, momentum: { goldPerHr: 5000 }, spark: [1, 2, 3] },
    { id: 'idle', name: 'IdleQueen', updatedAt: new Date(now).toISOString(), stats: {} },
  ]);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(merged, 1);
  const burat = rows.find((r) => CE.normName(r.name) === 'burat');
  assert.strictEqual(burat.momentum.goldPerHr, 5000, 'kept row carried momentum forward');
  assert.deepStrictEqual(burat.spark, [1, 2, 3]);
});

test('dedupeBoard is a no-op on already-unique boards (merged 0)', () => {
  const { rows, merged } = CE.dedupeBoard([{ name: 'A', stats: {} }, { name: 'B', stats: {} }]);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(merged, 0);
});

const YOU = { name: 'You', stats: { maxStage: 2103, lifeGold: 2455000, kills: 72091, topHeroes: [{ cls: 'Hunter', level: 20 }], runesLeveled: 56, tiers: { LEGENDARY: 5 } }, momentum: { goldPerHr: 96000 } };
const BRO = { name: 'Bro', stats: { maxStage: 2108, lifeGold: 2100400, kills: 80112, topHeroes: [{ cls: 'Slayer', level: 22 }], runesLeveled: 61, tiers: { LEGENDARY: 2, IMMORTAL: 1 } }, momentum: { goldPerHr: 128000 } };

test('arena duel scores by weighted categories and is deterministic', () => {
  const d = CE.duel(YOU, BRO);
  assert.strictEqual(d.winner, 'b');
  assert.strictEqual(d.aWins, 2);   // You wins Wealth + Arsenal
  assert.strictEqual(d.bWins, 5);   // Bro wins Progression/Combat/Heroes/Runes/Momentum
  assert.deepStrictEqual(CE.duel(YOU, BRO), d, 'same inputs -> same result');
});

test('arena power is finite 0..9999 and tiers map to an id + css class', () => {
  for (const m of [YOU, BRO, { name: 'empty', stats: {} }, { name: 'partial', stats: { maxStage: 1110 } }]) {
    const p = CE.arenaPower(m);
    assert.ok(Number.isFinite(p) && p >= 0 && p <= 9999, 'power out of range: ' + p);
    const t = CE.arenaTier(p);
    assert.ok(t.id && t.cl && typeof t.min === 'number');
  }
});

test('identical fighters resolve via the power tiebreak (no crash, points tie)', () => {
  const d = CE.duel({ name: 'a', stats: YOU.stats }, { name: 'b', stats: YOU.stats });
  assert.strictEqual(d.aPts, d.bPts);
  assert.ok(d.winner === 'a' || d.winner === 'b');
});

test('ladder is a round-robin sorted by wins then power', () => {
  const IDLE = { name: 'Idle', stats: { maxStage: 1110, lifeGold: 512000, kills: 31000, topHeroes: [{ cls: 'Sorcerer', level: 16 }], runesLeveled: 30, tiers: { LEGENDARY: 1 } } };
  const L = CE.ladder([YOU, BRO, IDLE]);
  assert.strictEqual(L.length, 3);
  for (let i = 1; i < L.length; i++) assert.ok(L[i - 1].w >= L[i].w, 'ladder not sorted by wins');
  assert.ok(L.every((e) => e.m && typeof e.w === 'number' && typeof e.l === 'number' && e.tier));
});

test('stageIdx decodes difficulty-prefixed keys monotonically', () => {
  assert.strictEqual(CE.stageIdx(1101), 1);    // Normal Act 1-1
  assert.strictEqual(CE.stageIdx(1210), 20);   // Normal Act 2-10
  assert.strictEqual(CE.stageIdx(2209), 49);   // Nightmare Act 2-9
  assert.strictEqual(CE.stageIdx(4310), 120);  // Torment Act 3-10
  assert.strictEqual(CE.stageIdx(999), null);  // invalid
});
