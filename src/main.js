'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Auto-update from GitHub releases (electron-updater). READ-ONLY w.r.t. the game — only updates THIS app.
// Wrapped in try/catch so `npm start` works in dev before the dependency/installed-app context exists.
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.autoDownload = true;            // pull a newer release in the background as soon as it's found
  autoUpdater.autoInstallOnAppQuit = true;    // and apply it the next time the app quits, even without a click
  // v1.0.15: differential ("patch") downloads are DISABLED. Diagnosed on a real install: our NSIS exe is
  // solid-compressed, so any source change ripples through the whole archive — the "diff" is ~the full 79 MB,
  // and electron-updater fetches it as thousands of small sequential range requests against GitHub's CDN
  // (~68 ms each measured) = many minutes, vs ~76 s for one full stream on the same line. Full download wins.
  autoUpdater.disableDifferentialDownload = true;
} catch (e) { /* dev: not installed */ }
// Relay updater progress to the renderer so the UI can show a friendly "update ready — restart" banner.
function sendUpdate(payload) { if (win && !win.isDestroyed()) win.webContents.send('update-status', payload); }
function checkForUpdatesNow() {
  if (!autoUpdater) { sendUpdate({ state: 'error' }); return; }
  try { autoUpdater.checkForUpdates(); } catch (e) { sendUpdate({ state: 'error' }); }
}
function wireUpdater() {
  if (!autoUpdater) return;
  autoUpdater.on('checking-for-update', () => sendUpdate({ state: 'checking' }));
  autoUpdater.on('update-available', (i) => sendUpdate({ state: 'available', version: i && i.version }));
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'none', version: app.getVersion() }));
  autoUpdater.on('download-progress', (p) => sendUpdate({
    state: 'downloading', percent: Math.round(p && p.percent || 0),
    // v1.0.15: surface size + speed so a download never looks silently stuck
    transferred: p && p.transferred || 0, total: p && p.total || 0, bps: p && p.bytesPerSecond || 0,
  }));
  autoUpdater.on('update-downloaded', (i) => sendUpdate({ state: 'downloaded', version: i && i.version }));
  autoUpdater.on('error', () => sendUpdate({ state: 'error' }));
  checkForUpdatesNow();
  // v1.0.5: the HUD often runs for days next to the game — a launch-only check would never see new releases
  // (and a release published minutes earlier can be missed while GitHub's CDN propagates). Re-check every 4h;
  // the renderer's "Check for updates" button triggers the same path on demand.
  setInterval(checkForUpdatesNow, 4 * 3600 * 1000);
}

const SAVE_DIR = path.join(process.env.USERPROFILE || os.homedir(), 'AppData', 'LocalLow', 'TesseractStudio', 'TaskbarHero');
const SAVE_FILE = path.join(SAVE_DIR, 'SaveFile_Live.es3');
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 840, backgroundColor: '#0b0e18',
    title: 'TBH HUD',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'dashboard.html'));
  // the mini-HUD is a companion of the main window — never an orphan
  win.on('closed', () => { win = null; if (miniWin && !miniWin.isDestroyed()) miniWin.close(); });
}

// v1.0.16 (P4) — compact always-on-top mini-HUD. A second small frameless BrowserWindow showing gold /
// session gold-per-hour / current stage / offline timer / next affordable rune, fed by the SAME save-read
// pipeline through the dashboard renderer (the renderer computes the payload and relays it here — no new
// data lane, provably read-only). Bounds + opacity persist in the HUD's own userData dir, never the game's.
let miniWin = null;
const miniCfgPath = () => path.join(app.getPath('userData'), 'mini-hud.json');
function miniCfgLoad() { try { return JSON.parse(fs.readFileSync(miniCfgPath(), 'utf8')); } catch (e) { return {}; } }
function miniCfgSave(patch) { try { fs.writeFileSync(miniCfgPath(), JSON.stringify(Object.assign(miniCfgLoad(), patch))); } catch (e) { /* ignore */ } }
function miniSendState() { if (win && !win.isDestroyed()) win.webContents.send('mini-state', { open: !!(miniWin && !miniWin.isDestroyed()), opacity: (miniCfgLoad().opacity != null ? miniCfgLoad().opacity : 1) }); }
function createMini() {
  if (miniWin && !miniWin.isDestroyed()) { miniWin.focus(); return; }
  const cfg = miniCfgLoad();
  miniWin = new BrowserWindow({
    width: cfg.width || 332, height: cfg.height || 178, x: cfg.x, y: cfg.y,
    frame: false, alwaysOnTop: true, skipTaskbar: true, resizable: true,
    minWidth: 250, minHeight: 124, maximizable: false, fullscreenable: false,
    backgroundColor: '#10141f', title: 'TBH HUD mini',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  miniWin.setMenuBarVisibility(false);
  miniWin.setAlwaysOnTop(true, 'screen-saver');   // stays above a borderless-fullscreen game window
  if (cfg.opacity != null) { try { miniWin.setOpacity(Math.min(1, Math.max(0.3, cfg.opacity))); } catch (e) { /* ignore */ } }
  miniWin.loadFile(path.join(__dirname, '..', 'mini.html'));
  const saveBounds = () => { try { const b = miniWin.getBounds(); miniCfgSave({ x: b.x, y: b.y, width: b.width, height: b.height }); } catch (e) { /* ignore */ } };
  let bT = null;
  miniWin.on('move', () => { clearTimeout(bT); bT = setTimeout(saveBounds, 400); });
  miniWin.on('resize', () => { clearTimeout(bT); bT = setTimeout(saveBounds, 400); });
  miniWin.on('closed', () => { miniWin = null; miniSendState(); });
  // when the mini (re)opens, ask the dashboard to resend the latest payload
  miniWin.webContents.on('did-finish-load', () => { miniSendState(); if (win && !win.isDestroyed()) win.webContents.send('mini-request-data'); });
}
ipcMain.on('mini-toggle', () => { if (miniWin && !miniWin.isDestroyed()) miniWin.close(); else createMini(); });
ipcMain.on('mini-close', () => { if (miniWin && !miniWin.isDestroyed()) miniWin.close(); });
ipcMain.on('mini-data', (_e, payload) => { if (miniWin && !miniWin.isDestroyed()) miniWin.webContents.send('mini-data', payload); });
ipcMain.on('mini-opacity', (_e, v) => {
  const op = Math.min(1, Math.max(0.3, +v || 1));
  miniCfgSave({ opacity: op });
  if (miniWin && !miniWin.isDestroyed()) { try { miniWin.setOpacity(op); } catch (e) { /* ignore */ } }
});
ipcMain.on('mini-state-request', miniSendState);

function sendSave() {
  fs.readFile(SAVE_FILE, (err, data) => {
    if (err || !win || win.isDestroyed()) return;
    // include the file's true UTC mtime so the offline-rewards timer anchors on it (the .es3
    // lastSavedTime field is LOCAL .NET ticks; mtime is the authoritative last-save instant).
    let mtimeMs = null; try { mtimeMs = fs.statSync(SAVE_FILE).mtimeMs; } catch (e) { /* keep null */ }
    win.webContents.send('save-bytes', data, mtimeMs);
  });
}

// Read every save snapshot (live + rolling/timestamped backups) for History/Trends. Read-only.
function sendBackups() {
  fs.readdir(SAVE_DIR, (err, files) => {
    if (err || !win || win.isDestroyed()) return;
    const list = [];
    for (const name of files.filter(f => /\.es3(\.bak)?$/i.test(f))) {
      try { list.push({ name, buf: fs.readFileSync(path.join(SAVE_DIR, name)) }); } catch (e) { /* skip */ }
    }
    if (win && !win.isDestroyed()) win.webContents.send('backup-bytes', list);
  });
}

// Read Player.log + Player-prev.log (offline-reward gold + Steam-box counts). Read-only.
function sendLog() {
  const texts = [];
  for (const f of ['Player.log', 'Player-prev.log']) {
    try { texts.push(fs.readFileSync(path.join(SAVE_DIR, f), 'utf8')); } catch (e) { /* skip */ }
  }
  if (texts.length && win && !win.isDestroyed()) win.webContents.send('log-text', texts);
}

app.whenReady().then(() => {
  createWindow();
  let debounce = null, bDebounce = null;
  try {
    let lDebounce = null;
    fs.watch(SAVE_DIR, (evt, file) => {
      if (file && file.indexOf('SaveFile_Live') === 0) {
        clearTimeout(debounce);
        debounce = setTimeout(sendSave, 400);
        clearTimeout(bDebounce);             // refresh trends less often than the live render
        bDebounce = setTimeout(sendBackups, 8000);
      } else if (file && file.indexOf('Player') === 0 && file.endsWith('.log')) {
        clearTimeout(lDebounce);
        lDebounce = setTimeout(sendLog, 4000);
      }
    });
  } catch (e) { /* directory may not exist until the game runs */ }
  // v1.0.19 — WATCHDOG: fs.watch can silently die on Windows (sleep/resume, handle loss) and a long-running
  // HUD would then freeze with no error — stale gold, no new loot, "nothing refreshes". A cheap mtime poll
  // guarantees save reads keep flowing even with a dead watcher (read-only; same debounced send paths).
  let polledSaveMtime = 0, polledLogMtime = 0, pollTick = 0;
  setInterval(() => {
    fs.stat(SAVE_FILE, (err, st) => {
      if (err || !st) return;
      if (st.mtimeMs !== polledSaveMtime) {
        const first = polledSaveMtime === 0;
        polledSaveMtime = st.mtimeMs;
        if (!first) { clearTimeout(debounce); debounce = setTimeout(sendSave, 400); }
      }
    });
    if (++pollTick % 6 === 0) {              // Player.log every ~30s
      fs.stat(path.join(SAVE_DIR, 'Player.log'), (err, st) => {
        if (err || !st) return;
        if (st.mtimeMs !== polledLogMtime) {
          const first = polledLogMtime === 0;
          polledLogMtime = st.mtimeMs;
          if (!first) sendLog();
        }
      });
    }
  }, 5000);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  // check GitHub releases for a newer HUD; events drive the in-app banner (no-op in dev / if offline)
  wireUpdater();
});

ipcMain.on('request-save', sendSave);
ipcMain.on('request-backups', sendBackups);
ipcMain.on('request-log', sendLog);
// Renderer "Check for updates" button → run the same check the app does at launch (with visible feedback).
ipcMain.on('check-for-updates', checkForUpdatesNow);
ipcMain.handle('app-version', () => app.getVersion());
// User clicked "Restart now" on the update banner → install the downloaded update and relaunch.
ipcMain.on('quit-and-install', () => { if (autoUpdater) { try { autoUpdater.quitAndInstall(); } catch (e) { /* ignore */ } } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
