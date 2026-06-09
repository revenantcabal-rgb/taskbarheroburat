'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tbhNative', {
  onSave: (cb) => ipcRenderer.on('save-bytes', (_e, buf) => cb(buf)),
  requestSave: () => ipcRenderer.send('request-save')
});
