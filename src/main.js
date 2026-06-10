'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

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
    win.webContents.send('save-bytes', data);
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

app.whenReady().then(() => {
  createWindow();
  let debounce = null, bDebounce = null;
  try {
    fs.watch(SAVE_DIR, (evt, file) => {
      if (file && file.indexOf('SaveFile_Live') === 0) {
        clearTimeout(debounce);
        debounce = setTimeout(sendSave, 400);
        clearTimeout(bDebounce);             // refresh trends less often than the live render
        bDebounce = setTimeout(sendBackups, 8000);
      }
    });
  } catch (e) { /* directory may not exist until the game runs */ }
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

ipcMain.on('request-save', sendSave);
ipcMain.on('request-backups', sendBackups);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
