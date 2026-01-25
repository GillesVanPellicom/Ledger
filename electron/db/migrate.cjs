const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function runMigrations(db) {
  await createMigrationsTable(db);

  const appliedMigrations = await getAppliedMigrations(db);
  const allMigrations = await getAllMigrationFiles();

  let migrationsApplied = false;

  for (const migrationFile of allMigrations) {
    const version = migrationFile.split('_')[0];
    const filePath = path.join(MIGRATIONS_DIR, migrationFile);
    let sql = await fs.readFile(filePath, 'utf-8');
    
    // Strip BOM if present (common in Windows files)
    if (sql.charCodeAt(0) === 0xFEFF) {
      sql = sql.slice(1);
    }

    // Normalize line endings to LF to ensure consistent checksums across platforms
    sql = sql.replace(/\r\n/g, '\n');

    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    const applied = appliedMigrations.get(version);

    if (applied) {
      if (applied.checksum !== checksum) {
        console.warn(`[Migration Warning] Checksum mismatch for ${version}.`);
        console.warn(`Expected: ${applied.checksum}`);
        console.warn(`Calculated: ${checksum}`);
        
        // In production, we might want to be lenient if the version is already applied,
        // but strictly speaking, a mismatch means the file changed.
        // For now, we throw, but the logging above helps debug.
        throw new Error(
          `Checksum mismatch for migration ${version}. Expected ${applied.checksum} but got ${checksum}.`);
      }
    } else {
      console.log(`Applying migration ${version}...`);
      await applyMigration(db, version, sql, checksum);
      migrationsApplied = true; // Mark that at least one migration ran
    }
  }

  if (migrationsApplied) {
    console.log(`No schema changes detected, not running migrations.`);
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
