'use strict';
/* Committed tests for the crew API shared lib (api/_lib.js) — the server-side data gate. */
const test = require('node:test');
const assert = require('node:assert');
process.env.DATABASE_URL = '';   // these helpers need no database
const { cleanStats, stageIndex, canonMemberId, normName } = require('../api/_lib.js');

test('cleanStats whitelist: only the calibrated brag-stat keys survive (ban-safety payload gate)', () => {
  const allowed = new Set(['maxStage', 'maxStageLabel', 'curStage', 'lifeGold', 'kills', 'gold', 'topHeroes', 'runesLeveled',
    'runesTotal', 'trophies', 'tiers', 'runeStats', 'statList', 'rareDrops', 'playHours', 'ver']);
  const out = cleanStats({
    maxStage: 2103, curStage: 2101, lifeGold: 1, kills: 1, topHeroes: [{ cls: 'Hunter', level: 20, uid: 9, equippedItemIds: [1] }],
    runesLeveled: 5, tiers: { LEGENDARY: 1, HACK_TIER: 9999 }, statList: [{ k: 'IncreaseExpAmount', v: 7 }], ver: '1.0.30',
    // smuggled — must all be dropped:
    steamId: '76561190000000000', authTicket: 'deadbeef', save: '{raw}', password: 'emuMqG3bLYJ938ZDCfieWJ', inventory: [1, 2, 3], psd: {},
  });
  for (const k of Object.keys(out)) assert.ok(allowed.has(k), 'leaked non-whitelisted key: ' + k);
  for (const k of ['steamId', 'authTicket', 'save', 'password', 'inventory', 'psd']) assert.ok(!(k in out), 'smuggled field survived: ' + k);
  assert.ok(out.tiers && !('HACK_TIER' in out.tiers), 'unknown tier name was stored');
  assert.ok(out.topHeroes.every((h) => Object.keys(h).every((k) => k === 'cls' || k === 'level')), 'hero uid/equipped leaked');
});

test('cleanStats rejects a non-object payload', () => {
  assert.strictEqual(cleanStats(null), null);
  assert.strictEqual(cleanStats('nope'), null);
});

test('stageIndex: difficulty-prefixed monotonic decode (matches the game StageInfoData)', () => {
  assert.strictEqual(stageIndex(1101), 1);
  assert.strictEqual(stageIndex(1210), 20);
  assert.strictEqual(stageIndex(2209), 49);
  assert.strictEqual(stageIndex(3310), 90);
  assert.strictEqual(stageIndex(4101), 91);
  assert.strictEqual(stageIndex(4310), 120);
  assert.strictEqual(stageIndex(0), null);
});

test('canonMemberId / normName normalise consistently', () => {
  assert.strictEqual(canonMemberId('Bob'), canonMemberId('  BOB '));
  assert.strictEqual(normName('  Foo   Bar '), 'foo bar');
});
