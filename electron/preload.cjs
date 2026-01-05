const { contextBridge, ipcRenderer } = require('electron');

const isDev = process.env.NODE_ENV === 'development';

contextBridge.exposeInMainWorld('electronAPI', {
  queryDb: (sql, params) => ipcRenderer.invoke('query-db', sql, params),
  savePdf: () => ipcRenderer.invoke('save-pdf'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  isDev: isDev,
});
