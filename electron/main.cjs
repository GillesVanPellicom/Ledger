const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  protocol,
  net,
  shell,
  session,
} = require(
  'electron');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const fs = require('node:fs');
const {runMigrations} = require('./db/migrate.cjs');
const Store = require('./store.cjs');

// Global error handlers for main process
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Application Error',
    `An unexpected error occurred in the main process:\n\n${error.stack ||
    error.message}`);
});

let mainWindow;
let db;
let store;
let dbConnectionError = null;

const dev = process.env.NODE_ENV === 'development';

if (dev) {
  console.log('Running in development mode. Telemetry enabled.');
}

// Initialize store
function initializeStore() {
  try {
    store = new Store({
      userDataPath: app.getPath('userData'),
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
      },
    });
    console.log('Store initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize store:', error);
    dialog.showErrorBox('Store Initialization Failed', error.message);
  }
}

function connectDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    dbConnectionError = null;
    if (db) {
      db.close((err) => {
        if (err) console.error('Failed to close existing DB connection:', err);
        db = null;
      });
    }

    if (!dbPath) {
      console.log('No database path provided. DB is disconnected.');
      return resolve({success: true, disconnected: true});
    }

    const dbDir = path.dirname(dbPath);

    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, {recursive: true});
      }
    } catch (error) {
      console.error('Failed to create database directory:', error);
      dbConnectionError = `Failed to create directory: ${error.message}`;
      return reject(new Error(dbConnectionError));
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Database connection failed:', err);
        dbConnectionError = err.message;
        db = null;
        return reject(new Error(err.message));
      }

      db.run('PRAGMA foreign_keys = ON;', (fkErr) => {
        if (fkErr) console.error('Failed to enable foreign keys:', fkErr);
      });

      db.run('PRAGMA journal_mode = WAL;', async (walErr) => {
        if (walErr) {
          console.error('Failed to set WAL mode:', walErr);
          dbConnectionError = walErr.message;
          return reject(new Error(walErr.message));
        }

        try {
          await runMigrations(db);
          console.log(`Connected to database: ${dbPath}`);
          dbConnectionError = null;
          resolve({success: true});
        } catch (migrationError) {
          console.error('Failed to run migrations:', migrationError);
          dbConnectionError = migrationError.message;
          return reject(new Error(migrationError.message));
        }
      });
    });
  });
}

function installDevTools() {
  const {default: install, REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS} = require(
    'electron-devtools-installer');

  const extensions = [REACT_DEVELOPER_TOOLS, REDUX_DEVTOOLS];
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;

  return Promise.all(extensions.map(ext => install(ext, forceDownload))).
    then((names) => console.log(`Added Extension: ${names.join(', ')}`)).
    catch((err) => console.log('An error occurred: ', err));
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

  const startUrl = process.env.ELECTRON_START_URL;

  if (startUrl) {
    mainWindow.loadURL(startUrl);
    mainWindow.webContents.on('did-finish-load', () => {
      if (dev) {
        setTimeout(() => mainWindow.webContents.openDevTools(), 500);
      }
    });
  } else {
    setTimeout(() => mainWindow.webContents.openDevTools(), 500);

    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  initializeStore();

  // Disable dev tools extensions for now as they cause issues with Electron 38
  // if (dev) {
  //   await installDevTools();
  // }

  // Clear Service Workers to avoid conflicts
  if (dev || process.env.ELECTRON_START_URL) {
    try {
      if (session && session.defaultSession) {
        await session.defaultSession.clearStorageData(
          {storages: ['serviceworkers']});
        console.log('Service workers cleared');
      }
    } catch (e) {
      console.error('Failed to clear service workers:', e);
    }
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
      console.error('Initial database connection failed:', error);
      // Error is stored in dbConnectionError and can be queried via IPC
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
ipcMain.handle('get-db-status', () => {
  return {
    connected: !!db,
    error: dbConnectionError,
  };
});

ipcMain.handle('query-db', (event, sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      const errorMsg = dbConnectionError
        ? `Database not connected: ${dbConnectionError}`
        : 'Database not connected';
      console.error(`[IPC query-db] Error: ${errorMsg}`);
      return reject(new Error(errorMsg));
    }

    const isSelect = sql.trim().toLowerCase().startsWith('select');

    if (isSelect) {
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('[IPC query-db] Query failed:', err);
          return reject(new Error(err.message));
        }
        resolve(rows);
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) {
          console.error('[IPC query-db] Query failed:', err);
          return reject(new Error(err.message));
        }
        resolve({changes: this.changes, lastID: this.lastID});
      });
    }
  });
});

const {promisify} = require('node:util');

ipcMain.handle('create-transaction',
  async (event, {type, from, to, amount, date, note}) => {
    if (!db) throw new Error('Database not connected');

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        if (type === 'deposit') {
          db.run(
            'INSERT INTO Income (PaymentMethodID, IncomeAmount, IncomeDate, IncomeNote) VALUES (?, ?, ?, ?)',
            [from, amount, date, note],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
            },
          );
        } else if (type === 'transfer') {
          db.run(
            'INSERT INTO Transfers (FromPaymentMethodID, ToPaymentMethodID, Amount, TransferDate, Note) VALUES (?, ?, ?, ?, ?)',
            [from, to, amount, date, note],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return reject(err);
              }
              const transferId = this.lastID;
              const fromNote = `Transfer to method ${to}`;
              const toNote = `Transfer from method ${from}`;

              db.run(
                'INSERT INTO Income (PaymentMethodID, IncomeAmount, IncomeDate, IncomeNote, TransferID) VALUES (?, ?, ?, ?, ?)',
                [from, -amount, date, fromNote, transferId],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                  }
                },
              );
              db.run(
                'INSERT INTO Income (PaymentMethodID, IncomeAmount, IncomeDate, IncomeNote, TransferID) VALUES (?, ?, ?, ?, ?)',
                [to, amount, date, toNote, transferId],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                  }
                },
              );
            },
          );
        }

        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          resolve({success: true});
        });
      });
    });
  });

ipcMain.handle('delete-transaction', async (event, {topUpId}) => {
  if (!db) throw new Error('Database not connected');
  return new Promise((resolve, reject) => {
    db.get('SELECT TransferID FROM Income WHERE IncomeID = ?', [topUpId],
      (err, row) => {
        if (err) return reject(err);

        if (row && row.TransferID) {
          // It's a transfer, delete the whole transfer record
          db.run('DELETE FROM Transfers WHERE TransferID = ?', [row.TransferID],
            function(err) {
              if (err) return reject(err);
              resolve({success: true, changes: this.changes});
            });
        } else {
          // It's a simple deposit or other top-up, delete just this one
          db.run('DELETE FROM Income WHERE IncomeID = ?', [topUpId],
            function(err) {
              if (err) return reject(err);
              resolve({success: true, changes: this.changes});
            });
        }
      });
  });
});

ipcMain.handle('save-pdf', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  const {canceled, filePath} = await dialog.showSaveDialog(win, {
    title: 'Save Receipt as PDF',
    defaultPath: 'receipt.pdf',
    filters: [{name: 'PDF Files', extensions: ['pdf']}],
  });

  if (canceled || !filePath) return;

  try {
    const data = await win.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
      margins: {top: 0, bottom: 0, left: 0, right: 0},
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
    return {success: false, error: 'Store not initialized'};
  }

  const oldDatastorePath = store.get('datastore.folderPath');
  const newDatastorePath = settings.datastore?.folderPath;

  if (oldDatastorePath === newDatastorePath) {
    store.set(settings);
  } else {
    try {
      console.log('Datastore path changed. Reconnecting database...');
      await connectDatabase(
        newDatastorePath ? path.join(newDatastorePath, 'fin.db') : null);
      store.set(settings);
    } catch (error) {
      // Send error to renderer instead of showing dialog
      // Revert to old settings
      mainWindow.webContents.send('settings-reverted', store.store);
      return {success: false, error: error.message};
    }
  }

  return {success: true};
});

ipcMain.handle('reset-settings', async () => {
  if (!store) {
    console.error('Store not initialized');
    return {success: false, error: 'Store not initialized'};
  }
  store.clear();
  return {success: true};
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

ipcMain.handle('select-directory', async () => {
  const {canceled, filePaths} = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (canceled) {
    return '';
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('save-image', async (event, datastorePath, imagePath) => {
  const {nanoid} = await import('nanoid');
  const imageDir = path.join(datastorePath, 'receipt_images');
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, {recursive: true});
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
    fs.mkdirSync(backupDir, {recursive: true});
  }

  const dbPath = path.join(datastorePath, 'fin.db');
  if (!fs.existsSync(dbPath)) throw new Error('Database file not found.');

  const now = new Date();
  const timestamp = `${now.getSeconds()}-${now.getMinutes()}-${now.getHours()}-${now.getDate()}-${now.getMonth() +
  1}-${now.getFullYear()}`;
  const backupPath = path.join(backupDir, `${timestamp}.db.bak`);

  fs.copyFileSync(dbPath, backupPath);

  // Manage backup rotation
  const maxBackups = store.get('backup.maxBackups', 5);
  const backups = fs.readdirSync(backupDir).
    filter(f => f.endsWith('.bak')).
    map(f => ({
      name: f,
      time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
    })).
    sort((a, b) => b.time - a.time);

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
    fs.mkdirSync(backupDir, {recursive: true});
  }
  shell.openPath(backupDir);
});
