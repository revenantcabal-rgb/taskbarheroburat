'use strict';
/* BAN-SAFETY GUARD (committed, runs in CI) — promoted out of the gitignored test/ folder.
   Enforces the three invariants that keep the read-only companion outside the game's anti-cheat scope
   (grounded in DATA-COLLECTION-PROOF.md): never write the game save [Save_Tampered], never read/inject the game
   process, never exfiltrate beyond the calibrated opt-in brag-stats. Static-scans the shipped app + executes the
   real server sanitiser against an adversarial payload. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { return ''; } };

const SHIPPED = ['dashboard.html', 'mini.html', 'index.html', 'src/main.js', 'src/preload.js',
  'src/engine/saveEngine.js', 'src/engine/crewEngine.js',
  'api/_lib.js', 'api/progress.js', 'api/leaderboard.js', 'api/feed.js', 'api/prune.js', 'api/enchant-report.js'];
const SRC = {}; SHIPPED.forEach((f) => { SRC[f] = read(f); });
const allText = SHIPPED.map((f) => SRC[f]).join('\n');

test('invariant 1: no process-memory / code-injection APIs anywhere in the shipped app', () => {
  const MEM_INJECT = /\b(ReadProcessMemory|WriteProcessMemory|OpenProcess|VirtualAllocEx|CreateRemoteThread|NtReadVirtualMemory|NtWriteVirtualMemory|SetWindowsHookEx|ptrace|process_vm_readv|toolhelp|Module32First)\b/;
  assert.ok(!MEM_INJECT.test(allText), 'a process-memory / injection API is referenced');
  assert.ok(!/\brequire\(\s*['"](ffi-napi|ref-napi|memoryjs|@cevek\/ffi)['"]/.test(allText), 'an FFI / memory-reader module is imported');
  assert.ok(!/\bchild_process\b|\bexecFile\(|\bspawn\(|\bexec\(/.test(SRC['src/main.js'] + SRC['src/preload.js']), 'the desktop shell spawns a child process');
});

test('invariant 2: the app never writes the game save (no Save_Tampered risk)', () => {
  const WRITE_API = /\b(writeFile|writeFileSync|createWriteStream|appendFile|createWritable|showSaveFilePicker|FileSystemWritableFileStream)\b/;
  SHIPPED.forEach((f) => {
    SRC[f].split(/\r?\n/).forEach((line, i) => {
      if (!WRITE_API.test(line)) return;
      const touchesSave = /SAVE_FILE|SaveFile_Live|\.es3|LocalLow|TesseractStudio|TaskbarHero/.test(line);
      assert.ok(!touchesSave, f + ':' + (i + 1) + ' a write API targets the game save: ' + line.trim().slice(0, 80));
    });
  });
  assert.ok(!/createWritable|showSaveFilePicker|FileSystemWritableFileStream/.test(SRC['dashboard.html']), 'browser build opened a writable file handle');
});

test('invariant 3: the app talks only to the crew API (never the game / Apps Script endpoints)', () => {
  assert.ok(!/script\.google\.com/.test(allText), 'a Google Apps Script endpoint (the game exfil pipe) is contacted');
  const fetches = (SRC['dashboard.html'].match(/\bfetch\(/g) || []).length;
  const crewFetches = (SRC['dashboard.html'].match(/\bfetch\(\s*CREW_API/g) || []).length;
  assert.strictEqual(fetches, crewFetches, 'a renderer fetch() targets something other than CREW_API');
  assert.ok(!/\bfetch\(\s*['"]https?:|sendBeacon\(|new\s+WebSocket\(/.test(SRC['dashboard.html']), 'a foreign URL fetch / sendBeacon / WebSocket exists in the renderer');
});

test('invariant 4: the crew payload whitelist drops everything but the calibrated brag-stats', () => {
  process.env.DATABASE_URL = '';
  const { cleanStats } = require('../api/_lib.js');
  const ALLOWED = new Set(['maxStage', 'maxStageLabel', 'lifeGold', 'kills', 'gold', 'topHeroes', 'runesLeveled',
    'runesTotal', 'trophies', 'tiers', 'runeStats', 'statList', 'rareDrops', 'playHours', 'ver']);
  const cleaned = cleanStats({
    maxStage: 2103, lifeGold: 1, kills: 1, topHeroes: [{ cls: 'Hunter', level: 20, secretUid: 999 }], runesLeveled: 5,
    tiers: { LEGENDARY: 5 }, ver: '1.0.28',
    steamId: '7656', authTicket: 'x', auth: 'y', ticket: 'z', save: '{raw}', rawSave: 'bytes', password: 'p',
    inventory: [1], itemSaveDatas: [{}], psd: {}, currentStage: 2103, deviceId: 'd',
  });
  assert.strictEqual(Object.keys(cleaned).filter((k) => !ALLOWED.has(k)).length, 0, 'a non-whitelisted key leaked');
  for (const k of ['steamId', 'authTicket', 'auth', 'ticket', 'save', 'rawSave', 'password', 'inventory', 'itemSaveDatas', 'psd', 'currentStage', 'deviceId']) {
    assert.ok(!(k in cleaned), 'smuggled field survived: ' + k);
  }
  assert.ok(cleaned.topHeroes.every((h) => Object.keys(h).every((k) => k === 'cls' || k === 'level')), 'hero uid leaked');
});
