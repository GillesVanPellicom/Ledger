import Database from 'better-sqlite3';
import path from 'path';
import {fileURLToPath} from 'url';
import chalk from 'chalk';
import {task, info, success, done} from './styling.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB
const dbPath = path.join(__dirname, '../../fin.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * SEED DATA
 */

const productUnits = [
  {type: 'mg', description: 'Milligram'},
  {type: 'g', description: 'Gram'},
  {type: 'kg', description: 'Kilogram'},
  {type: 'ml', description: 'Milliliter'},
  {type: 'cl', description: 'Centiliter'},
  {type: 'dl', description: 'Deciliter'},
  {type: 'l', description: 'Liter'},
];

const stores = [
  'Albert Heijn',
  'Jumbo',
  'Lidl',
  'Aldi',
  'Plus',
  'Dirk',
  'Coop',
  'Spar',
  'Hoogvliet',
  'Vomar',
  'Dekamarkt',
  'Picnic',
  'Ekoplaza',
  'Makro',
  'Sligro',
  'Hema',
  'Kruidvat',
  'Etos',
  'Action',
  'Blokker',
];

const brands = [
  'AH Huismerk',
  'Jumbo Huismerk',
  'Unilever',
  'Nestlé',
  'Coca-Cola',
  'PepsiCo',
  'Danone',
  'Kellogg\'s',
  'Heineken',
  'Douwe Egberts',
  'Campina',
  'Unox',
  'Knorr',
  'Calvé',
  'Heinz',
  'Barilla',
  'Grand Italia',
  'Hak',
  'Bonduelle',
  'Iglo',
  'Mora',
  'Dr. Oetker',
  'Lay\'s',
  'Pringles',
  'Doritos',
  'Milka',
  'Tony\'s Chocolonely',
  'Verkade',
  'Lu',
  'Lotus',
  'Peijnenburg',
  'Bolletje',
  'Venz',
  'De Ruijter',
  'Blue Band',
  'Becel',
  'Remia',
  'Grolsch',
  'Amstel',
  'Hertog Jan',
  'Brand',
  'Bavaria',
  'Spa',
  'Chaudfontaine',
  'Sourcy',
  'Dubbelfrisss',
  'Appelsientje',
  'CoolBest',
  'Riedel',
  'Pickwick',
  'Lipton',
  'Senseo',
  'Nespresso',
  'Dolce Gusto',
];

const productNames = [
  'Milk',
  'Bread',
  'Cheese',
  'Eggs',
  'Butter',
  'Yogurt',
  'Chicken Breast',
  'Ground Beef',
  'Pork Chops',
  'Salmon',
  'Tuna',
  'Pasta',
  'Rice',
  'Potatoes',
  'Tomatoes',
  'Cucumbers',
  'Lettuce',
  'Spinach',
  'Broccoli',
  'Cauliflower',
  'Carrots',
  'Onions',
  'Garlic',
  'Apples',
  'Bananas',
  'Oranges',
  'Grapes',
  'Strawberries',
  'Blueberries',
  'Raspberries',
  'Coffee',
  'Tea',
  'Sugar',
  'Salt',
  'Pepper',
  'Olive Oil',
  'Vegetable Oil',
  'Flour',
  'Baking Powder',
  'Chocolate',
  'Cookies',
  'Chips',
  'Soda',
  'Beer',
  'Wine',
  'Toilet Paper',
  'Paper Towels',
  'Dish Soap',
  'Laundry Detergent',
  'Shampoo',
  'Toothpaste',
  'Deodorant',
  'Shower Gel',
  'Hand Soap',
  'Cleaning Spray',
  'Sponges',
  'Trash Bags',
  'Aluminum Foil',
  'Plastic Wrap',
];

const sizes = [
  1,
  2,
  5,
  10,
  20,
  50,
  100,
  200,
  250,
  300,
  400,
  500,
  750,
  1000,
  1500,
  2000];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() *
    (end.getTime() - start.getTime())).toISOString().split('T')[0];
}

async function seed() {
  info('Starting seeding process...');

  // -------------------- Product Units --------------------
  info('Seeding Product Units...');
  const insertUnit = db.prepare(
    'INSERT OR IGNORE INTO ProductUnits (ProductUnitType, ProductUnitDescription) VALUES (?, ?)');

  await task('Inserting Product Units', async () => {
    let count = 0;
    for (const unit of productUnits) {
      const result = insertUnit.run(unit.type, unit.description);
      if (result.changes > 0) count++;
    }
    return count > 0 ? 'CREATED' : 'EXISTS';
  });
  done('Product Units seeding finished');

  // -------------------- Stores --------------------
  info('Seeding Stores...');
  const insertStore = db.prepare(
    'INSERT OR IGNORE INTO Stores (StoreName) VALUES (?)');

  await task('Inserting Stores', async () => {
    let count = 0;
    for (const store of stores) {
      const result = insertStore.run(store);
      if (result.changes > 0) count++;
    }
    return count > 0 ? 'CREATED' : 'EXISTS';
  });
  done('Stores seeding finished');

  // -------------------- Products --------------------
  info('Seeding Products...');
  const unitIds = db.prepare('SELECT ProductUnitID FROM ProductUnits').
    all().
    map(u => u.ProductUnitID);
  const insertProduct = db.prepare(
    'INSERT OR IGNORE INTO Products (ProductName, ProductBrand, ProductSize, ProductUnitID) VALUES (?, ?, ?, ?)');

  await task('Generating and Inserting 500 Products', async () => {
    let count = 0;
    const usedCombinations = new Set();

    // Fetch existing to avoid unique constraint violations in memory check if needed, 
    // but INSERT OR IGNORE handles it at DB level.

    for (let i = 0; i < 500; i++) {
      const name = getRandomElement(productNames);
      const brand = getRandomElement(brands);
      const size = getRandomElement(sizes);
      const unitId = getRandomElement(unitIds);

      // Simple check to avoid excessive DB calls if we were doing individual checks, 
      // but here we just blast it with INSERT OR IGNORE
      const result = insertProduct.run(name, brand, size, unitId);
      if (result.changes > 0) count++;
    }
    return count > 0 ? 'CREATED' : 'EXISTS';
  });
  done('Products seeding finished');

  // -------------------- Receipts & Line Items --------------------
  info('Seeding Receipts and Line Items...');

  const storeIds = db.prepare('SELECT StoreID FROM Stores').
    all().
    map(s => s.StoreID);
  const productIds = db.prepare('SELECT ProductID FROM Products').
    all().
    map(p => p.ProductID);

  const insertReceipt = db.prepare(
    'INSERT INTO Receipts (ReceiptDate, StoreID, ReceiptNote) VALUES (?, ?, ?)');
  const insertLineItem = db.prepare(
    'INSERT INTO LineItems (ReceiptID, ProductID, LineQuantity, LineUnitPrice) VALUES (?, ?, ?, ?)');

  await task('Generating 100 Receipts with Line Items', async () => {
    const startDate = new Date(2023, 0, 1);
    const endDate = new Date();

    const transaction = db.transaction(() => {
      for (let i = 0; i < 100; i++) {
        const date = generateRandomDate(startDate, endDate);
        const storeId = getRandomElement(storeIds);
        const note = Math.random() > 0.7 ? `Note for receipt ${i}` : null;

        const receiptResult = insertReceipt.run(date, storeId, note);
        const receiptId = receiptResult.lastInsertRowid;

        const numItems = getRandomInt(1, 15);
        for (let j = 0; j < numItems; j++) {
          const productId = getRandomElement(productIds);
          const quantity = getRandomInt(1, 5);
          const price = (Math.random() * 10 + 0.5).toFixed(2); // Random price between 0.50 and 10.50

          insertLineItem.run(receiptId, productId, quantity, price);
        }
      }
    });

    transaction();
    return 'CREATED';
  });
  done('Receipts seeding finished');

  success('Seeding completed successfully');
}

seed().catch(err => {
  console.error(chalk.red.bold('ERROR  Seeding failed:'), err.message);
  process.exit(1);
});
