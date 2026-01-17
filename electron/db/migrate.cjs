const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function runMigrations(db) {
  await createMigrationsTable(db);

  const appliedMigrations = await getAppliedMigrations(db);
  const allMigrations = await getAllMigrationFiles();

  for (const migrationFile of allMigrations) {
    const version = migrationFile.split('_')[0];
    const filePath = path.join(MIGRATIONS_DIR, migrationFile);
    const sql = await fs.readFile(filePath, 'utf-8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    const applied = appliedMigrations.get(version);

    if (applied) {
      if (applied.checksum !== checksum) {
        throw new Error(
          `Checksum mismatch for migration ${version}. Expected ${applied.checksum} but got ${checksum}.`);
      }
    } else {
      console.log(`Applying migration ${version}...`);
      await applyMigration(db, version, sql, checksum);
    }
  }
}

function createMigrationsTable(db) {
  return new Promise((resolve, reject) => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS migrations
        (
            version    TEXT PRIMARY KEY,
            checksum   TEXT NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getAppliedMigrations(db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT version, checksum FROM migrations', (err, rows) => {
      if (err) return reject(err);
      const applied = new Map(
        rows.map(row => [row.version, {checksum: row.checksum}]));
      resolve(applied);
    });
  });
}

async function getAllMigrationFiles() {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files.filter(file => file.endsWith('.sql')).sort();
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Migrations directory might not exist, which is fine.
      return [];
    }
    throw error;
  }
}

const {promisify} = require('util');

async function applyMigration(db, version, sql, checksum) {
  const run = promisify(db.run.bind(db));
  const exec = promisify(db.exec.bind(db));

  try {
    await run('BEGIN TRANSACTION');

    await exec(sql);

    await run('INSERT INTO migrations (version, checksum) VALUES (?, ?)',
      [version, checksum]);

    await run('COMMIT');
  } catch (err) {
    try {
      await run('ROLLBACK');
    } catch (rollbackErr) {
      // optional: log rollback error, but original error is more important
      console.error('Rollback failed:', rollbackErr);
    }
    throw err; // propagate original error
  }
}

module.exports = {runMigrations};
