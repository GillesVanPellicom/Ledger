const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3');

let mainWindow;
let db;

function connectDatabase(filePath) {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) console.error('Failed to close existing DB connection:', err);
        db = null;
      });
    }

    db = new sqlite3.Database(filePath, (err) => {
      if (err) {
        console.error('Database connection failed:', err);
        return reject({ success: false, error: err.message });
      }
      
      // Use WAL mode for better concurrency
      db.run('PRAGMA journal_mode = WAL;', (walErr) => {
        if (walErr) {
           console.error('Failed to set WAL mode:', walErr);
           return reject({ success: false, error: walErr.message });
        }
        console.log(`Connected to database: ${filePath}`);
        resolve({ success: true });
      });
    });
  });
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
    connectDatabase(path.join(app.getAppPath(), 'fin.db')).catch(console.error);
    
    mainWindow.webContents.on('did-finish-load', () => {
      setTimeout(() => mainWindow.webContents.openDevTools(), 500);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    connectDatabase(path.join(app.getAppPath(), 'fin.db')).catch(console.error);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('quit', () => {
  if (db) {
    db.close((err) => {
      if (err) console.error('Failed to close database on quit:', err.message);
    });
  }
});

// IPC Handlers
ipcMain.handle('query-db', (event, sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not connected'));

    const isSelect = sql.trim().toLowerCase().startsWith('select');
    
    if (isSelect) {
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Query failed:', err);
          return reject({ error: err.message });
        }
        resolve(rows);
      });
    } else {
      db.run(sql, params, function(err) { // Use function() to get `this`
        if (err) {
          console.error('Query failed:', err);
          return reject({ error: err.message });
        }
        resolve({ changes: this.changes, lastID: this.lastID });
      });
    }
  });
});
