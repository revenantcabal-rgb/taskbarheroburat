'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tbhNative', {
  onSave: (cb) => ipcRenderer.on('save-bytes', (_e, buf, mtimeMs) => cb(buf, mtimeMs)),
  requestSave: () => ipcRenderer.send('request-save'),
  onBackups: (cb) => ipcRenderer.on('backup-bytes', (_e, list) => cb(list)),
  requestBackups: () => ipcRenderer.send('request-backups'),
  onLog: (cb) => ipcRenderer.on('log-text', (_e, texts) => cb(texts)),
  requestLog: () => ipcRenderer.send('request-log'),
  // auto-update: receive updater status (checking/available/none/downloading/downloaded/error),
  // trigger an on-demand check, read the app version, and restart-to-update
  onUpdate: (cb) => ipcRenderer.on('update-status', (_e, payload) => cb(payload)),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  getVersion: () => ipcRenderer.invoke('app-version'),
  restartToUpdate: () => ipcRenderer.send('quit-and-install'),
  // v1.0.16 (P4) — mini-HUD bridge. The dashboard window uses the send/state half; the mini window uses the
  // data/close half. Everything stays read-only: the payload is computed from the already-parsed save.
  miniToggle: () => ipcRenderer.send('mini-toggle'),
  miniClose: () => ipcRenderer.send('mini-close'),
  miniSend: (payload) => ipcRenderer.send('mini-data', payload),
  miniSetOpacity: (v) => ipcRenderer.send('mini-opacity', v),
  miniStateRequest: () => ipcRenderer.send('mini-state-request'),
  onMiniState: (cb) => ipcRenderer.on('mini-state', (_e, s) => cb(s)),
  onMiniData: (cb) => ipcRenderer.on('mini-data', (_e, p) => cb(p)),
  onMiniRequestData: (cb) => ipcRenderer.on('mini-request-data', () => cb())
});
