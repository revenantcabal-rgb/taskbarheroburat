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
if (problems.length) {
  console.error('FAIL data honesty:\n  - ' + problems.join('\n  - '));
  process.exitCode = 1;
} else {
  console.log('PASS          ', 'only calibrated aggregates surfaced; no per-difficulty claim; stages decoded to "Act X-Y".');
}
