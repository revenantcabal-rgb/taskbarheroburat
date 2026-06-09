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
console.log('perDiff       ', JSON.stringify(snap.aggregates.perDifficultyCompletions));
console.log('maxStage      ', snap.summary.maxCompletedStage, 'cur', snap.summary.currentStage, 'wave', snap.summary.currentWave);
console.log('party         ', JSON.stringify(snap.summary.arrangedParty));
console.log('lastSaved     ', snap.summary.lastSaved);
console.log('heroes        ', snap.heroes.length, 'unlocked,', snap.heroes.filter(h => h.deployed).length, 'deployed');
snap.heroes.forEach(h => console.log('   ', h.cls.padEnd(10), 'L' + h.level, h.gear + '/10 gear', h.deployed ? 'DEPLOYED' : 'bench'));
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
