const { contextBridge, ipcRenderer } = require('electron');

const isDev = process.env.NODE_ENV === 'development';

contextBridge.exposeInMainWorld('electronAPI', {
  queryDb: (sql, params) => ipcRenderer.invoke('query-db', sql, params),
  createTransaction: (transaction) => ipcRenderer.invoke('create-transaction', transaction),
  deleteTransaction: (transaction) => ipcRenderer.invoke('delete-transaction', transaction),
  savePdf: () => ipcRenderer.invoke('save-pdf'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveImage: (datastorePath, imagePath) => ipcRenderer.invoke('save-image', datastorePath, imagePath),
  readFileAsBase64: (filePath) => ipcRenderer.invoke('read-file-base64', filePath),
  onSettingsReverted: (callback) => ipcRenderer.on('settings-reverted', callback),
  removeSettingsRevertedListener: (callback) => ipcRenderer.removeListener('settings-reverted', callback),
  getBackupCount: () => ipcRenderer.invoke('get-backup-count'),
  triggerBackup: () => ipcRenderer.invoke('trigger-backup'),
  openBackupFolder: () => ipcRenderer.invoke('open-backup-folder'),
  isDev: isDev,
});
