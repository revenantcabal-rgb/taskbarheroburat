'use strict';
/* Committed unit tests for the shared crew module (src/engine/crewEngine.js) — run by `node --test` in CI.
   Covers the duplicate-row fix (identity + dedupe) and the stage-index decode. (The PvP Arena math was removed
   in v1.0.30 — the crew is cooperative, not competitive — so its tests are gone with it.) */
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

test('the removed Arena math is gone — no PvP surface remains on the module', () => {
  for (const k of ['duel', 'ladder', 'arenaPower', 'arenaTier', 'CATS', 'gearScore', 'topHeroLv', 'TIERS', 'RARITY']) {
    assert.strictEqual(CE[k], undefined, 'crewEngine still exposes removed Arena export: ' + k);
  }
});

test('stageIdx decodes difficulty-prefixed keys monotonically', () => {
  assert.strictEqual(CE.stageIdx(1101), 1);    // Normal Act 1-1
  assert.strictEqual(CE.stageIdx(1210), 20);   // Normal Act 2-10
  assert.strictEqual(CE.stageIdx(2209), 49);   // Nightmare Act 2-9
  assert.strictEqual(CE.stageIdx(4310), 120);  // Torment Act 3-10
  assert.strictEqual(CE.stageIdx(999), null);  // invalid
});
