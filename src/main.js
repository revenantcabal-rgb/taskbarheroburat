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

app.whenReady().then(() => {
  createWindow();
  let debounce = null;
  try {
    fs.watch(SAVE_DIR, (evt, file) => {
      if (file && file.indexOf('SaveFile_Live') === 0) {
        clearTimeout(debounce);
        debounce = setTimeout(sendSave, 400);
      }
    });
  } catch (e) { /* directory may not exist until the game runs */ }
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

ipcMain.on('request-save', sendSave);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
