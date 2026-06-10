'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tbhNative', {
  onSave: (cb) => ipcRenderer.on('save-bytes', (_e, buf, mtimeMs) => cb(buf, mtimeMs)),
  requestSave: () => ipcRenderer.send('request-save'),
  onBackups: (cb) => ipcRenderer.on('backup-bytes', (_e, list) => cb(list)),
  requestBackups: () => ipcRenderer.send('request-backups'),
  onLog: (cb) => ipcRenderer.on('log-text', (_e, texts) => cb(texts)),
  requestLog: () => ipcRenderer.send('request-log'),
  // auto-update: receive updater status (available/downloading/downloaded) + trigger the restart-to-update
  onUpdate: (cb) => ipcRenderer.on('update-status', (_e, payload) => cb(payload)),
  restartToUpdate: () => ipcRenderer.send('quit-and-install')
});
