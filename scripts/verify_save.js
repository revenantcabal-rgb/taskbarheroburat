'use strict';
/* Read-only Node verification harness: decrypt+parse a real .es3 with saveEngine.js
   and print a calibrated snapshot. Usage:
     node scripts/verify_save.js [path-to.es3]
   Defaults to the live save. NEVER writes to the game or save. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const eng = require('../src/engine/saveEngine.js');

const DB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'engine', 'gamedata.min.json'), 'utf8'));
eng.setDB(DB);

const SAVE = process.argv[2] || path.join(process.env.USERPROFILE || os.homedir(),
  'AppData', 'LocalLow', 'TesseractStudio', 'TaskbarHero', 'SaveFile_Live.es3');

const buf = fs.readFileSync(SAVE);
const psd = eng.loadSave(buf);
const snap = eng.snapshotFromPsd(psd);
const owned = eng.ownedItems(psd);

console.log('=== SAVE:', SAVE, '(' + buf.length + ' bytes) ===');
console.log('version       ', snap.summary.version);
console.log('playTimeHours ', snap.summary.playTimeHours);
console.log('gold          ', snap.gold.toLocaleString());
console.log('lifetimeGold  ', snap.aggregates.lifetimeGold && snap.aggregates.lifetimeGold.toLocaleString());
console.log('totalKills    ', snap.aggregates.totalKills && snap.aggregates.totalKills.toLocaleString());
console.log('maxStage      ', snap.summary.maxStageLabel, '(key ' + snap.summary.maxCompletedStage + ')');
console.log('curStage      ', snap.summary.currentStageLabel, '(key ' + snap.summary.currentStage + ') wave', snap.summary.currentWave);
console.log('party         ', JSON.stringify(snap.summary.arrangedParty));
console.log('lastSaved     ', snap.summary.lastSaved);
console.log('heroes        ', snap.heroes.length, 'unlocked,', snap.heroes.filter(h => h.deployed).length, 'deployed');
snap.heroes.forEach(h => console.log('   ', h.cls.padEnd(10), 'L' + h.level, h.gear + '/10 gear', h.deployed ? 'DEPLOYED' : 'bench',
  h.xpPct != null ? ('| XP→L' + (h.level + 1) + ': ' + h.xpRemaining.toLocaleString() + ' left (' + Math.round(h.xpPct * 100) + '%)') : '| XP: max'));
console.log('inventory     ', JSON.stringify(snap.inventory));
console.log('byRarity      ', JSON.stringify(snap.byRarity));
console.log('runes         ', snap.runes.leveled + '/' + snap.runes.total, 'leveled');
console.log('trophies      ', snap.trophies.length, '(Legendary+)');

// Coverage / fabrication audit: how many owned items resolved to a real name vs fallback?
const unnamed = owned.filter(o => /^#\d+$/.test(o.name));
console.log('owned items   ', owned.length, '| unresolved names:', unnamed.length);
if (unnamed.length) console.log('   unresolved keys:', [...new Set(unnamed.map(o => o.key))].slice(0, 20).join(', '));
// icon coverage
const noIcon = owned.filter(o => !o.icon);
console.log('icon coverage ', (owned.length - noIcon.length) + '/' + owned.length, noIcon.length ? '(missing: ' + noIcon.slice(0, 10).map(o => o.key).join(',') + ')' : '(100%)');
// enchant resolution sample
const ench = owned.filter(o => o.mods && o.mods.length);
console.log('items w/ mods ', ench.length);
ench.slice(0, 5).forEach(o => console.log('   ', o.name, '->', o.mods.map(m => m.name + ' +' + m.value + (m.tier ? ' T' + m.tier : '')).join(', ')));

// --- Offline rewards (Phase B): calibrated from Player.log + save lastSavedTime ---
const logPath = path.join(path.dirname(SAVE), 'Player.log');
let logTxt = ''; try { logTxt = fs.readFileSync(logPath, 'utf8'); } catch (e) {}
const offEvents = eng.parseOfflineEvents(logTxt);
// The .es3 lastSavedTime field is LOCAL .NET ticks; the file's UTC mtime is the authoritative last-save instant
// (and TZ-independent — correct even when this Node process runs in UTC but the game saved in another TZ).
const mtimeMs = fs.statSync(SAVE).mtimeMs;
const ticksMs = snap.summary.lastSaved ? +new Date(snap.summary.lastSaved) : null;
const savedMs = mtimeMs;
const off = eng.offlineStatus(savedMs, offEvents, Date.now());
console.log('--- offline ---');
if (ticksMs != null) console.log('tz check      ', 'ticks=' + new Date(ticksMs).toISOString() + ' vs mtime=' + new Date(mtimeMs).toISOString() + ' (offset ' + ((ticksMs - mtimeMs) / 3600000).toFixed(1) + 'h => save ticks are LOCAL; idle anchored on UTC mtime)');
if (!off) { console.log('offline       (no lastSavedTime)'); }
else {
  console.log('idle          ', Math.floor(off.idleSec) + 's (' + (off.idleSec / 3600).toFixed(2) + 'h) since last save');
  console.log('log events    ', off.count, '| cap learned from logs:', off.capSec != null ? (off.capSec + 's') : 'not yet observed (no reward<delta) — no assumed cap');
  if (off.last) console.log('last reward   ', '+' + (off.last.gold || 0) + ' gold over ' + off.last.reward + 's' + (off.rate ? (' (~' + off.rate.toFixed(2) + ' gold/s)') : '') + ' [delta=' + off.last.delta + 's, ' + (off.last.delta > off.last.reward ? 'CAPPED' : 'uncapped') + ']');
  if (off.capSec != null) console.log('time-to-cap   ', off.atCap ? 'CAPPED — collect now' : (Math.floor(off.timeToCapSec) + 's'), off.bankedEst != null ? ('| est banked ~' + off.bankedEst + ' gold') : '');
}

// --- Data-honesty assertions (P1): nothing the app surfaces may claim progress the save doesn't support ---
console.log('--- data honesty ---');
const problems = [];
// 1) The fabricated "per-difficulty completions" must NOT be surfaced by the engine anymore.
if ('perDifficultyCompletions' in snap.aggregates) problems.push('aggregates still exposes perDifficultyCompletions (uncalibrated Type 16)');
// 2) Only CALIBRATED aggregates may appear. Whitelist: lifetimeGold (Type2/Sub0, delta-matched a gold gain),
//    totalKills (Type0/Sub0, sum-validated by per-monster sub-counters). Any other key = an uncalibrated leak.
const allowedAgg = ['lifetimeGold', 'totalKills', 'goldBySource'];
const extraAgg = Object.keys(snap.aggregates).filter(k => allowedAgg.indexOf(k) < 0);
if (extraAgg.length) problems.push('aggregates exposes uncalibrated key(s): ' + extraAgg.join(', '));
// 3) Show WHY Type 16 is omitted: max progress decodes to the FIRST difficulty band (an early act), yet
//    Type 16 read as per-difficulty would claim Nightmare/Hell/Torment completions => self-contradicting => omit.
const raw16 = (psd.aggregateSaveDatas || []).filter(x => x.Type === 16).sort((a, b) => a.SubKey - b.SubKey).map(x => x.Value);
const maxAct = Math.floor((snap.summary.maxCompletedStage || 0) / 100) - 10;
if (raw16.length >= 2 && raw16.slice(1).some(v => (v || 0) > 0) && maxAct <= 3) {
  console.log('type16 raw    ', JSON.stringify(raw16), '— NOT shown. As per-difficulty it would claim Nightmare/Hell/Torment > 0, but max progress is "' + snap.summary.maxStageLabel + '" (first difficulty band) => disproven, omitted (golden rule).');
}
// 4) The one calibrated multi-counter we DO show (kills-by-monster) must sum EXACTLY to total kills.
const km = eng.killsByMonster(psd);
const kmSum = km.reduce((s, m) => s + (m.kills || 0), 0);
if (snap.aggregates.totalKills != null && kmSum !== snap.aggregates.totalKills) {
  problems.push('kills-by-monster sum ' + kmSum + ' != totalKills ' + snap.aggregates.totalKills);
} else {
  console.log('kills check   ', 'per-monster sum ' + kmSum.toLocaleString() + ' == totalKills (' + km.length + ' monster types) ✓');
}
// 5) Gold-by-source: the displayed split must sum EXACTLY to lifetime gold (only shown when it does).
const gs = snap.aggregates.goldBySource;
if (gs) {
  if (gs.combat + gs.other !== gs.total) problems.push('goldBySource ' + gs.combat + '+' + gs.other + ' != total ' + gs.total);
  else console.log('gold sources  ', 'combat ' + gs.combat.toLocaleString() + ' + other ' + gs.other.toLocaleString() + ' == lifetime ' + gs.total.toLocaleString() + ' ✓ (combat ' + Math.round(gs.combat / gs.total * 100) + '%; "other" bundles offline+Cube+misc, not split)');
}
// --- v1.0.4 engine fns: invariant assertions (work on ANY save, not just the committed test one) ---
console.log('--- v1.0.4 ---');
// trendPoint: lean history point must carry the calibrated combat counter + the active stage.
const tp = eng.trendPoint(psd);
if (tp.t == null) problems.push('trendPoint.t is null (no lastSavedTime)');
if (tp.combat != null && tp.lifeGold != null && tp.combat > tp.lifeGold) problems.push('trendPoint.combat > lifeGold (partition broken)');
if (String(tp.cur) !== String(snap.summary.currentStage)) problems.push('trendPoint.cur != currentStageKey');
// xp = sum of every hero's cumulative XP (calibrated level curve) — must match a manual re-sum exactly
const manualXp = (psd.heroSaveDatas || []).reduce((s, h) => s + eng.cumXp(h.HeroLevel, h.HeroExp), 0);
if (tp.xp !== manualXp) problems.push('trendPoint.xp ' + tp.xp + ' != manual hero-XP sum ' + manualXp);
console.log('trendPoint    ', JSON.stringify(tp));

// perStageRates: combat-gold deltas over CLEAN intervals from backups (sibling backups/ dir, or the save\'s own folder).
const bdirs = [path.join(path.dirname(SAVE), 'backups'), path.dirname(SAVE)];
let bfiles = [];
for (const d of bdirs) {
  try { bfiles = fs.readdirSync(d).filter(f => /\.es3(\.bak)?$/i.test(f)).map(f => path.join(d, f)); } catch (e) { continue; }
  if (bfiles.length) break;
}
const tpoints = [tp];
for (const f of bfiles) { try { tpoints.push(eng.trendPoint(eng.loadSave(fs.readFileSync(f)))); } catch (e) {} }
const psr = eng.perStageRates(tpoints);
psr.forEach(r => {
  // r.hours is display-rounded to 2dp; the engine divides by the exact hours -> compare with 1% tolerance.
  if (r.hours > 0.01 && Math.abs(r.goldPerHr - r.combatGold / r.hours) > Math.max(1, r.goldPerHr * 0.01)) problems.push('perStageRates ' + r.stage + ': goldPerHr inconsistent with combatGold/hours');
  if (!(r.intervals > 0)) problems.push('perStageRates ' + r.stage + ': no intervals');
  if (r.xpPerHr != null && r.xpPerHr < 0) problems.push('perStageRates ' + r.stage + ': negative xpPerHr');
});
console.log('perStageRates ', psr.length + ' stage(s) measured over ' + (tpoints.length - 1) + ' backup(s):');
psr.forEach(r => console.log('   ', String(r.label || r.stage).padEnd(32), (r.goldPerHr != null ? r.goldPerHr.toLocaleString() : '—') + ' gold/hr,', (r.killsPerHr != null ? r.killsPerHr.toLocaleString() : '—') + ' kills/hr,', (r.xpPerHr != null ? r.xpPerHr.toLocaleString() : '—') + ' xp/hr', '(' + r.hours + 'h, ' + r.intervals + ' clean interval(s))'));

// gearGaps: every suggestion must be PROVABLE — same GEARTYPE, strictly better, the upgrade not equipped by
// anyone, each spare offered at most once (greedy 1:1) — and (v1.0.7) EQUIP-GATED: advised (!locked) upgrades
// must satisfy the level requirement (item.lvl <= hero level); locked notices must exceed it.
// Calibration printout: count equipped instances vs the level rule (43/43 held across both real saves).
let lvlTotal = 0, lvlOk = 0;
{ const byUidL = {}; owned.forEach(o => byUidL[o.uid] = o);
  (psd.heroSaveDatas || []).forEach(h => (h.equippedItemIds || []).forEach(u => {
    if (!u || u === 0 || u === '0') return; const o = byUidL[String(u)]; if (!o || o.lvl == null) return;
    lvlTotal++; if (o.lvl <= h.HeroLevel) lvlOk++; })); }
console.log('level rule    ', 'equipped items satisfying lvl<=heroLevel: ' + lvlOk + '/' + lvlTotal + (lvlOk === lvlTotal ? ' ✓ (equip-requirement reading holds)' : ' — COUNTEREXAMPLE, re-examine the equip rule!'));
if (lvlOk !== lvlTotal) problems.push('level-requirement reading contradicted by the save (' + lvlOk + '/' + lvlTotal + ')');
const gg = eng.gearGaps(psd);
const eqUidSet = {};
(psd.heroSaveDatas || []).forEach(h => (h.equippedItemIds || []).forEach(u => { if (u && u !== 0 && u !== '0') eqUidSet[String(u)] = 1; }));
const rr = g => eng.RARITY.indexOf(g);
const upSeen = {};
gg.forEach(g => {
  if (g.gt == null) problems.push('gearGaps: missing gt on a suggestion');
  if (eqUidSet[g.up.uid]) problems.push('gearGaps: suggested upgrade ' + g.up.name + ' is already equipped');
  if (upSeen[g.up.uid]) problems.push('gearGaps: spare ' + g.up.name + ' offered twice');
  upSeen[g.up.uid] = 1;
  const better = rr(g.up.grade) > rr(g.cur.grade) || (rr(g.up.grade) === rr(g.cur.grade) && (g.up.lvl || 0) > (g.cur.lvl || 0));
  if (!better) problems.push('gearGaps: ' + g.up.name + ' is not strictly better than ' + g.cur.name);
  if (!g.locked && (g.up.lvl || 0) > (g.heroLevel || 0)) problems.push('gearGaps: advised ' + g.up.name + ' L' + g.up.lvl + ' exceeds ' + g.hero + ' level ' + g.heroLevel);
  if (g.locked && (g.up.lvl || 0) <= (g.heroLevel || 0)) problems.push('gearGaps: ' + g.up.name + ' marked locked but is equippable');
});
const adv = gg.filter(g => !g.locked), lock = gg.filter(g => g.locked);
console.log('gearGaps      ', adv.length + ' equippable upgrade(s), ' + lock.length + ' level-locked notice(s)' + (gg.length ? ':' : ''));
gg.forEach(g => console.log('   ', (g.locked ? '🔒' : '✓ ') + ' ' + g.hero.padEnd(9), (g.deployed ? 'DEPLOYED' : 'bench').padEnd(8), g.cur.name + ' (' + g.cur.grade + ' L' + g.cur.lvl + ') -> ' + g.up.name + ' (' + g.up.grade + ' L' + g.up.lvl + ')' + (g.locked ? (' [needs Lv ' + g.needLevel + ', is Lv ' + g.heroLevel + ']') : (' [' + g.reason + ']'))));
// enchantStones: every stone must be an owned fx-bearing material (the calibrated enchant ingredients)
const stones = eng.enchantStones(psd);
console.log('enchantStones ', stones.length + ' kind(s) owned' + (stones.length ? (': ' + stones.map(s => s.name + (s.count > 1 ? (' ×' + s.count) : '')).join(', ')) : ' (none — honest empty state in the UI)'));

// onlineOffline (v1.0.9): the measured time/gold split must be internally consistent — away time only from
// gaps beyond the jitter threshold, and the gold split must re-sum to the lifetime-gold growth over the window.
const oo = eng.onlineOffline(tpoints);
if (oo.intervals > 0) {
  if (oo.awayH < 0 || oo.playedH < 0) problems.push('onlineOffline: negative hours');
  oo.gaps.forEach(g => { if (!(g.awayH > 0.25)) problems.push('onlineOffline: gap below threshold leaked in'); });
  console.log('online/offline', oo.playedH + 'h played vs ' + oo.awayH + 'h away | gold: ' + oo.goldCombat.toLocaleString() + ' farmed + ' + oo.goldOther.toLocaleString() + ' offline/misc | ' + oo.gaps.length + ' away gap(s)');
}

// trophies/tiers (v1.0.8): GEAR ONLY — a material (e.g. a rarity-NAMED stone) must never count; the per-tier
// breakdown must sum exactly to the trophy count.
const troph = eng.trophies(psd);
if (troph.some(t => t.mat || !t.gt)) problems.push('trophies contains a non-gear item (material leaked into flex counts)');
const tiersV = eng.tierCounts(psd);
const tierSum = Object.keys(tiersV).reduce((s, k) => s + tiersV[k], 0);
if (tierSum !== troph.length) problems.push('tierCounts sum ' + tierSum + ' != trophies ' + troph.length);
console.log('tiers         ', JSON.stringify(tiersV), '== ' + troph.length + ' Legendary+ gear pieces ✓ (gear-only, stones excluded)');

// runePlan: steps must price from the rune cost table, never exceed the budget, and sum exactly to spent.
const rp = eng.runePlan(psd, snap.gold);
const stepSum = rp.steps.reduce((s, x) => s + x.cost, 0);
if (stepSum !== rp.spent) problems.push('runePlan: step costs ' + stepSum + ' != spent ' + rp.spent);
if (rp.spent > snap.gold) problems.push('runePlan: spent ' + rp.spent + ' > gold ' + snap.gold);
if (rp.cheapestNext && rp.cheapestNext.cost <= rp.remaining) problems.push('runePlan: save-for is already affordable');
console.log('runePlan      ', rp.steps.length + ' affordable step(s), spend ' + rp.spent.toLocaleString() + ' of ' + snap.gold.toLocaleString() +
  (rp.cheapestNext ? (' | save for: ' + rp.cheapestNext.name + ' L' + (rp.cheapestNext.level + 1) + ' (' + rp.cheapestNext.cost.toLocaleString() + 'g)') : ''));

// enchantStatus: only DEPLOYED heroes' equipped gear, only open slots (used < 3).
const es = eng.enchantStatus(psd);
es.forEach(e => { if (!(e.used < 3) || e.open !== 3 - e.used) problems.push('enchantStatus: bad slot math on ' + e.name); });
console.log('enchantStatus ', es.length + ' equipped item(s) with open enchant slots on the deployed party');

// statTotals: must equal base+gear+tree re-summed per stat (no fabricated composite).
const dep = (psd.heroSaveDatas || []).find(h => ((psd.commonSaveData || {}).arrangedHeroKey || []).map(String).indexOf(String(h.heroKey)) >= 0);
if (dep) {
  const byUid2 = {}; owned.forEach(o => byUid2[o.uid] = o);
  const eq2 = (dep.equippedItemIds || []).filter(v => v && v !== 0 && v !== '0').map(u => byUid2[String(u)]).filter(Boolean);
  const src2 = eng.heroSources(dep, eq2, psd.attributeSaveDatas);
  const tot2 = eng.statTotals(src2);
  const expect = eng.sumStats([].concat(src2.base || [], src2.gear || [], src2.tree || []));
  if (JSON.stringify(tot2) !== JSON.stringify(expect)) problems.push('statTotals != sum(base,gear,tree)');
  console.log('statTotals    ', eng.heroClass(dep.heroKey) + ': ' + tot2.length + ' summed stat line(s) == base+gear+tree ✓');
}

if (problems.length) {
  console.error('FAIL data honesty:\n  - ' + problems.join('\n  - '));
  process.exitCode = 1;
} else {
  console.log('PASS          ', 'only calibrated aggregates surfaced; no per-difficulty claim; stages decoded to "Act X-Y"; v1.0.4 fns hold their invariants.');
}
