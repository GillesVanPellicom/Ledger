const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

contextBridge.exposeInMainWorld('electronAPI', {
  connectDb: (filePath) => ipcRenderer.invoke('connect-db', filePath),
  queryDb: (sql, params) => ipcRenderer.invoke('query-db', sql, params),
  selectFile: () => ipcRenderer.invoke('dialog:openFile'),
  isDbConnected: () => ipcRenderer.invoke('is-db-connected'),
  isDev: isDev,
  defaultDbPath: isDev ? path.resolve(__dirname, '../fin.db') : null,
});
