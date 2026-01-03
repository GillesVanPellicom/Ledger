const { contextBridge, ipcRenderer } = require('electron');

const isDev = process.env.NODE_ENV === 'development';

contextBridge.exposeInMainWorld('electronAPI', {
  queryDb: (sql, params) => ipcRenderer.invoke('query-db', sql, params),
  isDev: isDev,
});
