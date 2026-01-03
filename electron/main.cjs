const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

let mainWindow;
let db;

function connectDatabase(filePath) {
  try {
    if (db) db.close();
    db = new Database(filePath);
    db.pragma('journal_mode = WAL');
    console.log(`Connected to database: ${filePath}`);
    return { success: true };
  } catch (error) {
    console.error('Database connection failed:', error);
    return { success: false, error: error.message };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(startUrl);
    // Auto-connect to DB in dev mode
    connectDatabase(path.join(__dirname, '../fin.db'));
    
    // Open DevTools after a short delay to avoid initialization errors
    mainWindow.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        mainWindow.webContents.openDevTools();
      }, 500);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// File Dialog
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }]
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

// SQLite Setup
ipcMain.handle('connect-db', async (event, filePath) => {
  return connectDatabase(filePath);
});

ipcMain.handle('is-db-connected', async () => {
  return !!db && db.open;
});

ipcMain.handle('query-db', async (event, sql, params = []) => {
  try {
    if (!db) throw new Error('Database not connected');
    const stmt = db.prepare(sql);
    if (sql.trim().toLowerCase().startsWith('select')) {
      return stmt.all(params);
    } else {
      return stmt.run(params);
    }
  } catch (error) {
    console.error('Query failed:', error);
    return { error: error.message };
  }
});
