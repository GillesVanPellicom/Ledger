const { app, BrowserWindow, ipcMain, dialog, protocol, net, shell } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3');
const fs = require('fs');
const { runMigrations } = require('./db/migrate.cjs');

let mainWindow;
let db;
let store;

// Initialize electron-store
async function initializeStore() {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store({
      defaults: {
        theme: 'light',
        modules: {
          paymentMethods: {
            enabled: false,
          },
          debt: {
            enabled: false,
          },
        },
        pdf: {
          showUniqueItems: false,
          showTotalQuantity: false,
          showPaymentMethod: false,
          addSummaryPage: false,
          addReceiptImages: false,
        },
        backup: {
          maxBackups: 5,
          interval: 5,
          editsSinceLastBackup: 0,
        },
        paymentMethodStyles: {},
        datastore: {
          folderPath: '',
        },
      }
    });
    console.log('electron-store initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize electron-store:', error);
  }
}

function connectDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) console.error('Failed to close existing DB connection:', err);
        db = null;
      });
    }

    if (!dbPath) {
      console.log('No database path provided. DB is disconnected.');
      return resolve({ success: true, disconnected: true });
    }

    const dbDir = path.dirname(dbPath);
    
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create database directory:', error);
      return reject({ success: false, error: `Failed to create directory: ${error.message}` });
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection failed:', err);
        return reject({ success: false, error: err.message });
      }
      
      db.run('PRAGMA foreign_keys = ON;', (fkErr) => {
        if (fkErr) console.error('Failed to enable foreign keys:', fkErr);
      });

      db.run('PRAGMA journal_mode = WAL;', async (walErr) => {
        if (walErr) {
           console.error('Failed to set WAL mode:', walErr);
           return reject({ success: false, error: walErr.message });
        }

        try {
          await runMigrations(db);
          console.log('Migrations run successfully');
          console.log(`Connected to database: ${dbPath}`);
          resolve({ success: true });
        } catch (migrationError) {
          console.error('Failed to run migrations:', migrationError);
          return reject({ success: false, error: migrationError.message });
        }
      });
    });
  });
}

function installDevTools() {
  const { default: install, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS } = require('electron-devtools-installer');
  
  const extensions = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;

  return Promise.all(extensions.map(ext => install(ext, forceDownload)))
    .then((names) => console.log(`Added Extension: ${names.join(', ')}`))
    .catch((err) => console.log('An error occurred: ', err));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (process.platform === 'win32') {
    mainWindow.setMenu(null);
  }

  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(startUrl);
    mainWindow.webContents.on('did-finish-load', () => {
      setTimeout(() => mainWindow.webContents.openDevTools(), 500);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  await initializeStore();

  if (process.env.NODE_ENV === 'development') {
    await installDevTools();
  }

  protocol.handle('local-file', (request) => {
    const url = request.url.slice('local-file://'.length);
    return net.fetch(`file://${path.normalize(url)}`);
  });

  const datastorePath = store.get('datastore.folderPath');
  if (datastorePath) {
    try {
      await connectDatabase(path.join(datastorePath, 'fin.db'));
    } catch (error) {
      // Send error to renderer instead of showing dialog
      if (mainWindow) {
        mainWindow.webContents.send('database-error', error.message);
      } else {
        // Fallback if window isn't ready yet, though unlikely with current flow
         dialog.showErrorBox(
          'Database Connection Error',
          `Failed to connect to the database at "${datastorePath}". Please check your folder permissions and try again.\n\nError: ${error.error}`
        );
      }
    }
  }

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

ipcMain.handle('create-transaction', async (event, { type, from, to, amount, date, note }) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      if (type === 'deposit') {
        db.run('INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, TopUpNote) VALUES (?, ?, ?, ?)', [from, amount, date, note], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          db.run('COMMIT', (err) => err ? reject(err) : resolve({ success: true }));
        });
      } else if (type === 'transfer') {
        db.run('INSERT INTO Transfers (FromPaymentMethodID, ToPaymentMethodID, Amount, TransferDate, Note) VALUES (?, ?, ?, ?, ?)', [from, to, amount, date, note], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          const transferId = this.lastID;
          const fromNote = `Transfer to method ${to}`;
          const toNote = `Transfer from method ${from}`;

          db.run('INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, TopUpNote, TransferID) VALUES (?, ?, ?, ?, ?)', [from, -amount, date, fromNote, transferId], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            db.run('INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, TopUpNote, TransferID) VALUES (?, ?, ?, ?, ?)', [to, amount, date, toNote, transferId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
              db.run('COMMIT', (err) => err ? reject(err) : resolve({ success: true }));
            });
          });
        });
      }
    });
  });
});

ipcMain.handle('delete-transaction', async (event, { topUpId }) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT TransferID FROM TopUps WHERE TopUpID = ?', [topUpId], (err, row) => {
      if (err) return reject(err);

      if (row && row.TransferID) {
        // It's a transfer, delete the whole transfer record
        db.run('DELETE FROM Transfers WHERE TransferID = ?', [row.TransferID], function(err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        });
      } else {
        // It's a simple deposit or other top-up, delete just this one
        db.run('DELETE FROM TopUps WHERE TopUpID = ?', [topUpId], function(err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        });
      }
    });
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
  
  const oldDatastorePath = store.get('datastore.folderPath');
  const newDatastorePath = settings.datastore?.folderPath;

  if (oldDatastorePath !== newDatastorePath) {
    try {
      console.log('Datastore path changed. Reconnecting database...');
      await connectDatabase(newDatastorePath ? path.join(newDatastorePath, 'fin.db') : null);
      store.set(settings);
    } catch (error) {
      // Send error to renderer instead of showing dialog
      // Revert to old settings
      mainWindow.webContents.send('settings-reverted', store.store);
      return { success: false, error: error.message };
    }
  } else {
    store.set(settings);
  }

  return { success: true };
});

ipcMain.handle('reset-settings', async () => {
  if (!store) {
    console.error('Store not initialized');
    return { success: false, error: 'Store not initialized' };
  }
  store.clear();
  return { success: true };
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
  return newFileName;
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

// Backup Handlers
ipcMain.handle('get-backup-count', async () => {
  const datastorePath = store.get('datastore.folderPath');
  if (!datastorePath) return 0;
  const backupDir = path.join(datastorePath, 'backups');
  if (!fs.existsSync(backupDir)) return 0;
  return fs.readdirSync(backupDir).filter(f => f.endsWith('.bak')).length;
});

ipcMain.handle('trigger-backup', async () => {
  const datastorePath = store.get('datastore.folderPath');
  if (!datastorePath) throw new Error('Datastore path not set.');

  const backupDir = path.join(datastorePath, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dbPath = path.join(datastorePath, 'fin.db');
  if (!fs.existsSync(dbPath)) throw new Error('Database file not found.');

  const now = new Date();
  const timestamp = `${now.getSeconds()}-${now.getMinutes()}-${now.getHours()}-${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
  const backupPath = path.join(backupDir, `${timestamp}.db.bak`);

  fs.copyFileSync(dbPath, backupPath);

  // Manage backup rotation
  const maxBackups = store.get('backup.maxBackups', 5);
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.bak'))
    .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  if (backups.length > maxBackups) {
    for (let i = maxBackups; i < backups.length; i++) {
      fs.unlinkSync(path.join(backupDir, backups[i].name));
    }
  }
  return true;
});

ipcMain.handle('open-backup-folder', async () => {
  const datastorePath = store.get('datastore.folderPath');
  if (!datastorePath) return;
  const backupDir = path.join(datastorePath, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  shell.openPath(backupDir);
});
