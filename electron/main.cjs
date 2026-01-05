const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3');
const fs = require('fs');

let mainWindow;
let db;
let store;

// Dynamic import for electron-store
(async () => {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store();
    console.log('electron-store initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize electron-store:', error);
  }
})();


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

app.on('ready', () => {
  protocol.handle('local-file', (request) => {
    const url = request.url.slice('local-file://'.length);
    return net.fetch(`file://${path.normalize(url)}`);
  });
  createWindow();
});

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
    if (!db) {
      console.error('[IPC query-db] Error: Database not connected.');
      return reject(new Error('Database not connected'));
    }

    const isSelect = sql.trim().toLowerCase().startsWith('select');
    
    if (isSelect) {
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('[IPC query-db] Query failed:', err);
          return reject({ error: err.message });
        }
        resolve(rows);
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) {
          console.error('[IPC query-db] Query failed:', err);
          return reject({ error: err.message });
        }
        resolve({ changes: this.changes, lastID: this.lastID });
      });
    }
  });
});

ipcMain.handle('save-pdf', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save Receipt as PDF',
    defaultPath: 'receipt.pdf',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) return;

  try {
    const data = await win.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    
    fs.writeFileSync(filePath, data);
    console.log('PDF saved successfully:', filePath);
  } catch (error) {
    console.error('Failed to save PDF:', error);
    throw error;
  }
});

ipcMain.handle('get-settings', async () => {
  if (!store) {
    console.error('Store not initialized');
    return {};
  }
  return store.store;
});

ipcMain.handle('save-settings', async (event, settings) => {
  if (!store) {
    console.error('Store not initialized');
    return { success: false, error: 'Store not initialized' };
  }
  try {
    store.set(settings);
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (canceled) {
    return '';
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('save-image', async (event, datastorePath, imagePath) => {
  const { nanoid } = await import('nanoid');
  const imageDir = path.join(datastorePath, 'receipt_images');
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }
  const newFileName = `${nanoid()}${path.extname(imagePath)}`;
  const newPath = path.join(imageDir, newFileName);
  fs.copyFileSync(imagePath, newPath);
  return newPath;
});

ipcMain.handle('read-file-base64', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return data.toString('base64');
  } catch (error) {
    console.error('Failed to read file as base64:', error);
    return null;
  }
});
