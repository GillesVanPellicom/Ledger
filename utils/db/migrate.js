import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {fileURLToPath} from 'url';
import chalk from 'chalk';
import {task, info, success, done} from './styling.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB
const dbPath = path.join(__dirname, '../../fin.db');
const db = new Database(dbPath);

async function migrate() {
  info('Starting database migration...');

  await task('Reading schema file', async () => {
    const schemaPath = path.join(__dirname, 'db_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    return 'DONE';
  });

  await task('Applying schema to database', async () => {
    const schemaPath = path.join(__dirname, 'db_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split by semicolon to execute statements individually if needed, 
    // but better-sqlite3's exec handles multiple statements.
    db.exec(schema);

    return 'DONE';
  });

  done('Migration finished');
  success('Database schema applied successfully');
  process.exit(0);
}

migrate().catch(err => {
  console.error(chalk.red.bold('ERROR  Migration failed:'), err.message);
  process.exit(1);
});
