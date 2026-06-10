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
  autoUpdater.on('download-progress', (p) => sendUpdate({ state: 'downloading', percent: Math.round(p && p.percent || 0) }));
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
}

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
