import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { task, info, success, done } from './styling.js';

// Reuse the Electron migration system from the Node script
import { runMigrations } from '../../electron/db/migrate.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../datastore/fin.db');

async function migrate() {
  info('Starting database migration using new migration system...');

  const db = await task('Connecting to database', () => {
    return new Promise((resolve, reject) => {
      const dbInstance = new sqlite3.Database(dbPath, (err) => {
        if (err) reject(err);
        else resolve(dbInstance);
      });
    });
  });

  await task('Running migrations', async () => {
    await runMigrations(db);
  });

  await task('Closing database connection', () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  done('Migration finished');
  success('All migrations applied successfully');
}

migrate().catch(err => {
  console.error(chalk.red.bold('ERROR  Migration failed:'), err.message);
  process.exit(1);
});
