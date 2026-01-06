import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { task, info, success, done } from './styling.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../datastore/fin.db');

async function migrate() {
  info('Starting database migration...');

  const db = await task('Connecting to database', () => {
    return new Promise((resolve, reject) => {
      const dbInstance = new sqlite3.Database(dbPath, (err) => {
        if (err) reject(err);
        else resolve(dbInstance);
      });
    });
  });

  const schema = await task('Reading schema file', () => {
    const schemaPath = path.join(__dirname, '../../electron/db_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    return fs.readFileSync(schemaPath, 'utf-8');
  });

  await task('Applying schema to database', () => {
    return new Promise((resolve, reject) => {
      db.exec(schema, (err) => {
        if (err) reject(err);
        else resolve('DONE');
      });
    });
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
  success('Database schema applied successfully');
}

migrate().catch(err => {
  console.error(chalk.red.bold('ERROR  Migration failed:'), err.message);
  process.exit(1);
});
