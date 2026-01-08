const fs = require('fs/promises');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

const runMigrations = async (db) => {
  await createMigrationsTable(db);

  const appliedMigrations = await getAppliedMigrations(db);
  const allMigrations = await getAllMigrations();

  for (const migration of allMigrations) {
    if (!appliedMigrations.includes(migration)) {
      await applyMigration(db, migration);
    }
  }
};

const createMigrationsTable = async (db) => {
  return new Promise((resolve, reject) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const getAppliedMigrations = async (db) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT name FROM migrations', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => row.name));
      }
    });
  });
};

const getAllMigrations = async () => {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files.filter(file => file.endsWith('.sql')).sort();
};

const applyMigration = async (db, migration) => {
  const migrationPath = path.join(MIGRATIONS_DIR, migration);
  const sql = await fs.readFile(migrationPath, 'utf-8');

  return new Promise((resolve, reject) => {
    db.exec(sql, async (err) => {
      if (err) {
        reject(err);
      } else {
        await recordMigration(db, migration);
        resolve();
      }
    });
  });
};

const recordMigration = async (db, migration) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO migrations (name) VALUES (?)', [migration], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

module.exports = { runMigrations };
