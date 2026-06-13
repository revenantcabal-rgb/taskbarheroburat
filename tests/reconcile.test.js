'use strict';
/* Committed end-to-end test of the REAL api/progress.js identity reconcile against an in-memory Neon stub
   (promoted out of gitignored test/). Proves the v1.0.28 dup-row fix: duplicate rows of one person collapse into
   one canonical row on their next push, history folds, and no spurious "Joined" fires. */
const test = require('node:test');
const assert = require('node:assert');

// ---- in-memory "database" + fake neon tagged-template (matches the queries progress.js/_lib.js emit) ----
const db = { members: [], history: [], events: [], hseq: 1, eseq: 1 };
let clock = Date.parse('2026-06-13T00:00:00Z');
const tick = () => new Date(clock += 60000);

function fakeSql(strings, ...vals) {
  const q = strings.join('?').replace(/\s+/g, ' ').trim();
  const M = (frag) => q.indexOf(frag) >= 0;
  if (M('CREATE TABLE') || M('CREATE INDEX')) return Promise.resolve([]);
  if (M('INSERT INTO tbh_rate')) return Promise.resolve([{ n: 1 }]);
  if (M('SELECT member_id, name, stats, achievement, updated_at FROM tbh_crew_members')) {
    const code = vals[0];
    return Promise.resolve(db.members.filter((r) => r.crew_code === code)
      .map((r) => ({ member_id: r.member_id, name: r.name, stats: r.stats, achievement: r.achievement, updated_at: r.updated_at })));
  }
  if (M('UPDATE tbh_crew_history SET member_id')) { const [nid, code, oid] = vals; db.history.forEach((h) => { if (h.crew_code === code && h.member_id === oid) h.member_id = nid; }); return Promise.resolve([]); }
  if (M('UPDATE tbh_crew_events SET member_id')) { const [nid, code, oid] = vals; db.events.forEach((e) => { if (e.crew_code === code && e.member_id === oid) e.member_id = nid; }); return Promise.resolve([]); }
  if (M('DELETE FROM tbh_crew_members')) { const [code, mid] = vals; db.members = db.members.filter((r) => !(r.crew_code === code && r.member_id === mid)); return Promise.resolve([]); }
  if (M('INSERT INTO tbh_crew_members')) {
    const [code, mid, name, statsJson, achJson] = vals;
    const row = db.members.find((r) => r.crew_code === code && r.member_id === mid);
    const stats = JSON.parse(statsJson), achievement = achJson ? JSON.parse(achJson) : null;
    if (row) { row.name = name; row.stats = stats; row.achievement = achievement; row.updated_at = tick(); }
    else db.members.push({ crew_code: code, member_id: mid, name, stats, achievement, updated_at: tick() });
    return Promise.resolve([]);
  }
  if (M('INSERT INTO tbh_crew_history')) { const [code, mid, statsJson] = vals; db.history.push({ id: db.hseq++, crew_code: code, member_id: mid, stats: JSON.parse(statsJson) }); return Promise.resolve([]); }
  if (M('INSERT INTO tbh_crew_events')) { const [code, mid, name, kind, text] = vals; db.events.push({ id: db.eseq++, crew_code: code, member_id: mid, name, kind, text }); return Promise.resolve([]); }
  if (M('DELETE FROM tbh_crew_history') || M('DELETE FROM tbh_crew_events')) return Promise.resolve([]);
  throw new Error('UNHANDLED QUERY: ' + q.slice(0, 90));
}

require.cache[require.resolve('@neondatabase/serverless')] = { id: 'neon-stub', exports: { neon: () => fakeSql }, loaded: true };
process.env.DATABASE_URL = 'postgres://stub';
const lib = require('../api/_lib.js');
const progress = require('../api/progress.js');

function call(body) {
  return new Promise((resolve) => {
    const res = { setHeader() {}, _c: 0, status(c) { this._c = c; return this; }, json(o) { resolve({ code: this._c, body: o }); }, end() { resolve({ code: this._c, body: null }); } };
    progress({ method: 'POST', headers: {}, socket: {}, body }, res);
  });
}
const baseStats = (over) => Object.assign({ maxStage: 1110, lifeGold: 100000, kills: 1000, topHeroes: [{ cls: 'Knight', level: 10 }], runesLeveled: 5, runesTotal: 197, trophies: 1, tiers: { LEGENDARY: 1 }, runeStats: [], statList: [], rareDrops: [], playHours: 5, ver: '1.0.28' }, over || {});

test('progress.js folds duplicate rows of one person into one canonical row on their next push', async () => {
  const CODE = 'dads-of-tbh';
  const canon = lib.canonMemberId('Burat');
  db.members.push(
    { crew_code: CODE, member_id: 'a1b2-old-random-uuid', name: 'Burat', stats: baseStats({ maxStage: 1108 }), achievement: { t: 't', text: 'old' }, updated_at: new Date(Date.parse('2026-06-10T00:00:00Z')) },
    { crew_code: CODE, member_id: 'cm_v127codehash', name: 'burat', stats: baseStats({ lifeGold: 150000 }), achievement: null, updated_at: new Date(Date.parse('2026-06-12T00:00:00Z')) },
    { crew_code: CODE, member_id: 'cm_secondPC', name: '  Burat ', stats: baseStats({ lifeGold: 160000 }), achievement: null, updated_at: new Date(Date.parse('2026-06-12T06:00:00Z')) },
    { crew_code: CODE, member_id: 'cm_idle', name: 'IdleQueen', stats: baseStats(), achievement: null, updated_at: new Date(Date.parse('2026-06-12T00:00:00Z')) }
  );
  db.history.push(
    { id: db.hseq++, crew_code: CODE, member_id: 'a1b2-old-random-uuid', stats: baseStats({ maxStage: 1108 }) },
    { id: db.hseq++, crew_code: CODE, member_id: 'cm_v127codehash', stats: baseStats({ lifeGold: 150000 }) }
  );

  const r1 = await call({ code: CODE, member: { id: 'cm_brandNewToday', name: 'Burat' }, stats: baseStats({ maxStage: 1201, lifeGold: 200000 }) });
  const crew = db.members.filter((m) => m.crew_code === CODE);
  const burats = crew.filter((m) => lib.normName(m.name) === 'burat');

  assert.ok(r1.body && r1.body.ok, '/progress ok');
  assert.strictEqual(r1.body.id, canon, 'returns the canonical id');
  assert.strictEqual(r1.body.merged, 3, 'merged the 3 duplicate rows');
  assert.strictEqual(burats.length, 1, 'exactly one Burat row remains');
  assert.strictEqual(burats[0].member_id, canon, 'survivor keyed by canonical id');
  assert.strictEqual(crew.length, 2, 'crew has 2 rows (Burat + IdleQueen), not 5');
  assert.strictEqual(burats[0].stats.maxStage, 1201, 'survivor holds newest stats');
  assert.strictEqual(db.history.filter((h) => h.crew_code === CODE && h.member_id === canon).length, 3, 'history folded onto canon id');
  assert.ok(!(r1.body.events || []).some((e) => e.kind === 'join'), 'no spurious "Joined" on a folded member');

  // a later push with a case/space variant must not create a new row
  const r2 = await call({ code: CODE, member: { id: 'cm_thirdMachine', name: 'BURAT ' }, stats: baseStats({ maxStage: 1201, lifeGold: 210000 }) });
  assert.strictEqual(db.members.filter((m) => m.crew_code === CODE && lib.normName(m.name) === 'burat').length, 1, 'still one Burat row');
  assert.strictEqual(r2.body.merged, 0, 'second push merges nothing (already canonical)');
});
