import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { task, info, success, done } from './styling.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../fin.db');

// Helper to run a single query
function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Helper to get all results
function getQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

const productUnits = [
  { type: 'mg', description: 'Milligram' },
  { type: 'g', description: 'Gram' },
  { type: 'kg', description: 'Kilogram' },
  { type: 'ml', description: 'Milliliter' },
  { type: 'cl', description: 'Centiliter' },
  { type: 'dl', description: 'Deciliter' },
  { type: 'l', description: 'Liter' },
];

const stores = ['Albert Heijn', 'Jumbo', 'Lidl', 'Aldi', 'Plus', 'Dirk', 'Coop', 'Spar', 'Hoogvliet', 'Vomar'];
const brands = ['AH Huismerk', 'Jumbo Huismerk', 'Unilever', 'Nestlé', 'Coca-Cola', 'PepsiCo', 'Danone', 'Kellogg\'s'];
const productNames = ['Milk', 'Bread', 'Cheese', 'Eggs', 'Butter', 'Yogurt', 'Chicken Breast', 'Ground Beef', 'Pasta', 'Rice', 'Tomatoes', 'Apples', 'Bananas', 'Coffee', 'Tea'];
const sizes = [1, 2, 5, 10, 20, 50, 100, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000];

function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function generateRandomDate(start, end) { return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0]; }

async function seed() {
  info('Starting seeding process...');

  const db = await task('Connecting to database', () => new Promise((resolve, reject) => {
    const dbInstance = new sqlite3.Database(dbPath, (err) => err ? reject(err) : resolve(dbInstance));
  }));

  await runQuery(db, 'PRAGMA foreign_keys = ON;');

  await task('Seeding Product Units', async () => {
    const insert = 'INSERT OR IGNORE INTO ProductUnits (ProductUnitType, ProductUnitDescription) VALUES (?, ?)';
    for (const unit of productUnits) await runQuery(db, insert, [unit.type, unit.description]);
  });

  await task('Seeding Stores', async () => {
    const insert = 'INSERT OR IGNORE INTO Stores (StoreName) VALUES (?)';
    for (const store of stores) await runQuery(db, insert, [store]);
  });

  await task('Generating and Inserting 500 Products', async () => {
    const unitIds = (await getQuery(db, 'SELECT ProductUnitID FROM ProductUnits')).map(u => u.ProductUnitID);
    const insert = 'INSERT OR IGNORE INTO Products (ProductName, ProductBrand, ProductSize, ProductUnitID) VALUES (?, ?, ?, ?)';
    for (let i = 0; i < 500; i++) {
      await runQuery(db, insert, [getRandomElement(productNames), getRandomElement(brands), getRandomElement(sizes), getRandomElement(unitIds)]);
    }
  });

  await task('Generating 100 Receipts with Line Items', async () => {
    const storeIds = (await getQuery(db, 'SELECT StoreID FROM Stores')).map(s => s.StoreID);
    const productIds = (await getQuery(db, 'SELECT ProductID FROM Products')).map(p => p.ProductID);
    
    const insertReceipt = 'INSERT INTO Receipts (ReceiptDate, StoreID, ReceiptNote) VALUES (?, ?, ?)';
    const insertLineItem = 'INSERT INTO LineItems (ReceiptID, ProductID, LineQuantity, LineUnitPrice) VALUES (?, ?, ?, ?)';

    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        for (let i = 0; i < 100; i++) {
          const date = generateRandomDate(new Date(2023, 0, 1), new Date());
          const storeId = getRandomElement(storeIds);
          const note = Math.random() > 0.7 ? `Note for receipt ${i}` : null;

          db.run(insertReceipt, [date, storeId, note], function(err) {
            if (err) return reject(err);
            const receiptId = this.lastID;
            const numItems = getRandomInt(1, 15);
            for (let j = 0; j < numItems; j++) {
              db.run(insertLineItem, [receiptId, getRandomElement(productIds), getRandomInt(1, 5), (Math.random() * 10 + 0.5).toFixed(2)]);
            }
          });
        }
        db.run('COMMIT', (err) => err ? reject(err) : resolve());
      });
    });
  });

  await task('Closing database connection', () => new Promise((resolve, reject) => {
    db.close((err) => err ? reject(err) : resolve());
  }));

  done('Seeding finished');
  success('Database seeded successfully');
}

seed().catch(err => {
  console.error(chalk.red.bold('ERROR  Seeding failed:'), err.message);
  process.exit(1);
});
