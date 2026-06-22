'use strict';
/* FARMING OPTIMIZER — proves our engine reproduces taskbarhero.wiki/tools/farming EXACTLY.
   The expected numbers below were derived INDEPENDENTLY by re-implementing the live wiki bundle
   (route node 72.* + chunk D5oM4w2X.*) in Python and running it — they are the reference tool's
   own output, not our engine's. If these pass, the HUD's Farming tab matches the wiki 1:1.
   Stage rows are the wiki's datamined values (farm_stages.json / StageInfoData v1.00.14). */
const test = require('node:test');
const assert = require('node:assert');
const { farmExpKept, farmSolveModel, farmStageTime, farmRank } = require('../src/engine/saveEngine.js');

// key -> wiki-exact stage (includes one act boss, 4310, to prove it's excluded)
const S = {
  1101: { key: 1101, di: 0, act: 1, no: 1,  lvl: 1,  hp: 56,        waves: 10, spawns: 10,  exp: 16,       gold: 14 },
  1206: { key: 1206, di: 0, act: 2, no: 6,  lvl: 18, hp: 68058,     waves: 15, spawns: 120, exp: 35242,    gold: 2593 },
  2305: { key: 2305, di: 1, act: 3, no: 5,  lvl: 50, hp: 2920129,   waves: 23, spawns: 322, exp: 563858,   gold: 36213 },
  4309: { key: 4309, di: 3, act: 3, no: 9,  lvl: 95, hp: 20894480,  waves: 31, spawns: 651, exp: 14396303, gold: 725995 },
  4310: { key: 4310, di: 3, act: 3, no: 10, lvl: 95, hp: 1360608,   waves: 0,  spawns: 0,   exp: 783,      gold: 19830 },
};
const ALL = Object.values(S);
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

test('farmExpKept == the wiki Ht() (agent-verified spot values)', () => {
  const cases = [[85,85,1.0],[85,80,0.9082],[85,95,0.9156],[85,50,0.0138],[65,50,0.1692],
                 [31,1,0.01],[50,50,1.0],[95,95,1.0],[95,50,0.01],[31,28,0.986],[31,39,0.9625]];
  for (const [h, s, exp] of cases) {
    const got = farmExpKept(h, s);
    assert.ok(Math.abs(got - exp) <= 0.002, `Ht(${h},${s})=${got.toFixed(4)} expected ~${exp}`);
  }
  assert.strictEqual(farmExpKept(0, 50), 1, 'no hero level -> 1.0 (no penalty applied)');
});

test('farmSolveModel needs >=2 clears and reproduces them (OLS over hp+waves)', () => {
  assert.strictEqual(farmSolveModel([{ hp: 56, waves: 10, sec: 8 }]), null, '1 point -> null (cannot separate dps from wave overhead)');
  const m = farmSolveModel([{ hp: 56, waves: 10, sec: 8 }, { hp: 2920129, waves: 23, sec: 120 }]);
  assert.ok(rel(m.hpSeconds, 3.47945e-5) < 0.01, 'hpSeconds');
  assert.ok(rel(m.waveSeconds, 0.799805) < 0.01, 'waveSeconds');
  assert.ok(rel(m.dps, 28740.16) < 0.01, 'dps');
  assert.ok(Math.abs(farmStageTime(m, S[1101]) - 8) < 0.05, 'reproduces 1-1 @ 8s');
  assert.ok(Math.abs(farmStageTime(m, S[2305]) - 120) < 0.05, 'reproduces 3-5 NM @ 120s');
});

test('worked example 1 — hero 85, EXP +190% — matches wiki EXP/hr & Gold/hr', () => {
  const m = farmSolveModel([{ hp: 56, waves: 10, sec: 8 }, { hp: 2920129, waves: 23, sec: 120 }]);
  const rows = farmRank(ALL, { model: m, hero: 85, expStats: { pct: 190 }, metric: 'exp' });
  const r35 = rows.find(r => r.key === 2305), r26 = rows.find(r => r.key === 1206);
  assert.ok(rel(r35.kept, 0.013801) < 0.01, 'kept Ht(85,50) ' + r35.kept);
  assert.ok(rel(r35.expHr, 677024.2) < 0.005, '3-5 NM EXP/hr ' + r35.expHr);
  assert.ok(rel(r35.goldHr, 1086390) < 0.005, '3-5 NM Gold/hr ' + r35.goldHr);
  assert.ok(rel(r26.expHr, 256124.9) < 0.01, '2-6 N EXP/hr ' + r26.expHr);
  assert.ok(rel(r26.goldHr, 649823.9) < 0.01, '2-6 N Gold/hr ' + r26.goldHr);
});

test('worked example 2 — hero 50, EXP +100%, 3 calibration points — on-level keeps 100%', () => {
  const m = farmSolveModel([{ hp: 56, waves: 10, sec: 5 }, { hp: 2920129, waves: 23, sec: 60 }, { hp: 68058, waves: 15, sec: 9 }]);
  assert.ok(rel(m.dps, 60702.15) < 0.01, 'dps ' + m.dps);
  const rows = farmRank(ALL, { model: m, hero: 50, expStats: { pct: 100 }, metric: 'exp' });
  const r35 = rows.find(r => r.key === 2305);
  assert.strictEqual(r35.kept, 1, 'hero 50 on a L50 stage keeps 100% EXP');
  assert.ok(rel(r35.expHr, 67659811) < 0.005, '3-5 NM EXP/hr ' + r35.expHr);
});

test('worked example 3 — hero 95, EXP +250% — top Torment stage', () => {
  const m = farmSolveModel([{ hp: 56, waves: 10, sec: 6 }, { hp: 20894480, waves: 31, sec: 200 }]);
  const rows = farmRank(ALL, { model: m, hero: 95, expStats: { pct: 250 }, metric: 'exp' });
  const r39 = rows.find(r => r.key === 4309);
  assert.ok(rel(r39.expHr, 906967089) < 0.005, '3-9 T EXP/hr ' + r39.expHr);
  assert.ok(rel(r39.goldHr, 13067910) < 0.005, '3-9 T Gold/hr ' + r39.goldHr);
});

test('act-boss stages (stageNo 10) are EXCLUDED, exactly as the wiki omits them', () => {
  const m = farmSolveModel([{ hp: 56, waves: 10, sec: 8 }, { hp: 2920129, waves: 23, sec: 120 }]);
  const rows = farmRank(ALL, { model: m, hero: 95, expStats: {}, metric: 'exp' });
  assert.ok(!rows.some(r => r.key === 4310), '4-10 act boss must not appear in the ranking');
});

test('gold has NO level penalty (kept never touches goldHr)', () => {
  const m = farmSolveModel([{ hp: 56, waves: 10, sec: 8 }, { hp: 2920129, waves: 23, sec: 120 }]);
  const hi = farmRank(ALL, { model: m, hero: 95, expStats: {}, metric: 'gold' }).find(r => r.key === 2305);
  const lo = farmRank(ALL, { model: m, hero: 50, expStats: {}, metric: 'gold' }).find(r => r.key === 2305);
  assert.strictEqual(hi.goldHr, lo.goldHr, 'gold/hr identical regardless of hero level');
});

test('flat rune EXP (Mt) adds per-kill EXP across spawns + the stage boss', () => {
  const m = farmSolveModel([{ hp: 56, waves: 10, sec: 8 }, { hp: 2920129, waves: 23, sec: 120 }]);
  // +1 AdditionalExp on 1-1 (spawns 10) -> +11 EXP/clear (10 normal mobs + 1 stage boss)
  const base = farmRank([S[1101]], { model: m, hero: 1, expStats: {}, metric: 'exp' })[0];
  const boost = farmRank([S[1101]], { model: m, hero: 1, expStats: { addExp: 1 }, metric: 'exp' })[0];
  const perBase = base.expHr * base.sec / 3600, perBoost = boost.expHr * boost.sec / 3600;
  assert.ok(Math.abs((perBoost - perBase) - 11) < 1e-6, 'AdditionalExp +1 adds 11 EXP/clear on 1-1');
});
