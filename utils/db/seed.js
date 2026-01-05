import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { task, info, success, done } from './styling.js';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../fin.db');

// --- Data Arrays ---
const productUnits = [
    { type: 'mg', description: 'Milligram' },
    { type: 'g', description: 'Gram' },
    { type: 'kg', description: 'Kilogram' },
    { type: 'ml', description: 'Milliliter' },
    { type: 'cl', description: 'Centiliter' },
    { type: 'dl', description: 'Deciliter' },
    { type: 'l', description: 'Liter' },
    { type: 'cm', description: 'Centimeter' },
    { type: 'm', description: 'Meter' },
];

const stores = [
    'Albert Heijn', 'Jumbo', 'Lidl', 'Aldi', 'Plus', 'Hanos', 'Spar', 'Hoogvliet',
    'Vomar', 'Dekamarkt', 'Picnic', 'Ekoplaza', 'Makro', 'Sligro', 'Hema',
    'Kruidvat', 'Etos', 'Action', 'Blokker'
];

const brands = [
    'AH Huismerk', 'Jumbo Huismerk', 'Gwoon', '1 de Beste', 'Perfect', 'Okay',
    'Unilever', 'Nestlé', 'Coca-Cola', 'PepsiCo', 'Danone', 'Kellogg\'s',
    'Heineken', 'Douwe Egberts', 'Campina', 'FrieslandCampina', 'Arla', 'Unox',
    'Knorr', 'Calvé', 'Heinz', 'Barilla', 'Grand\'Italia', 'Honig', 'Hak',
    'Bonduelle', 'Iglo', 'Mora', 'Dr. Oetker', 'Lay\'s', 'Pringles', 'Doritos',
    'Milka', 'Tony\'s Chocolonely', 'Verkade', 'Lu', 'Lotus', 'Peijnenburg',
    'Bolletje', 'Venz', 'De Ruijter', 'Blue Band', 'Becel', 'Remia', 'Grolsch',
    'Amstel', 'Hertog Jan', 'Brand', 'Bavaria', 'Spa', 'Chaudfontaine', 'Sourcy',
    'Dubbelfrisss', 'Appelsientje', 'CoolBest', 'Riedel', 'Pickwick', 'Lipton',
    'Senseo', 'Nespresso', 'Dolce Gusto', 'Aviko', 'McCain', 'Haribo',
    'Red Bull', 'Monster Energy', 'Venco', 'Katja', 'Mentos', 'Chupa Chups',
    'Fanta', 'Sprite', '7Up', 'Robijn', 'Ariel', 'Sunil', 'Persil', 'Witte Reus',
    'Dreft', 'Finish', 'Glorix', 'Cif', 'Andy', 'Ajax', 'Colgate', 'Oral-B',
    'Sensodyne', 'Prodent', 'Elmex', 'Aquafresh', 'Dove', 'Nivea', 'L\'Oréal',
    'Garnier', 'Head & Shoulders', 'Andrélon', 'Sanex', 'Rexona', 'Axe',
    'Old Spice', 'Gillette', 'Wilkinson Sword', 'Bic', 'Tampax', 'Always',
    'Libresse', 'Pampers', 'Huggies', 'Zwitsal',
];

const productNames = [
    'Volle Melk', 'Halfvolle Melk', 'Magentroost Yoghurt', 'Griekse Yoghurt',
    'Sojadrink', 'Haverdrink', 'Amandeldrink', 'Jonge Kaas', 'Belegen Kaas',
    'Oude Kaas', 'Brie', 'Camembert', 'Roomkaas', 'Slagroom', 'Kookroom',
    'Eieren', 'Roomboter', 'Margarine', 'Tomaten', 'Komkommer', 'Paprika',
    'Courgette', 'Aubergine', 'Broccoli', 'Bloemkool', 'Spinazie', 'IJsbergsla',
    'Wortels', 'Uien', 'Knoflook', 'Aardappelen', 'Zoete Aardappel', 'Appels',
    'Bananen', 'Sinaasappels', 'Mandarijnen', 'Druiven', 'Aardbeien',
    'Blauwe Bessen', 'Frambozen', 'Citroen', 'Gember', 'Volkorenbrood',
    'Wit Brood', 'Croissants', 'Afbakbroodjes', 'Crackers', 'Beschuit',
    'Ontbijtkoek', 'Kipfilet', 'Rundergehakt', 'Varkenshaas', 'Speklappen',
    'Zalmfilet', 'Kabeljauw', 'Tonijn in blik', 'Garnalen', 'Rookworst',
    'Knakworst', 'Pasta', 'Rijst', 'Quinoa', 'Wraps', 'Tomatensaus', 'Pesto',
    'Olijfolie', 'Zonnebloemolie', 'Bloem', 'Suiker', 'Zout', 'Peper',
    'Koffiebonen', 'Theezakjes', 'Honing', 'Hagelslag', 'Pindakaas', 'Jam',
    'Bouillonblokjes', 'Azijn', 'Mosterd', 'Mayonaise', 'Ketchup', 'Chilisaus',
    'Naturel Chips', 'Paprika Chips', 'Chocoladereep', 'Drop', 'Winegums',
    'Koekjes', 'Stroopwafels', 'Notenmix', 'Popcorn', 'Cola', 'Sinas',
    'Mineraalwater', 'Appelsap', 'Bier', 'Wijn', 'Energiedrank', 'Toiletpapier',
    'Keukenrol', 'Vaatwastabletten', 'Wasmiddel', 'Allesreiniger',
    'Vuilniszakken', 'Aluminiumfolie', 'Bakpapier',
];

const sizes = [1, 2, 5, 10, 20, 50, 100, 150, 200, 250, 300, 330, 400, 500, 750, 1000, 1500, 2000];

// --- Helper Functions ---
function runQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, function (err) {
        if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes });
    }));
}

function getQuery(db, sql, params = []) {
    return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// --- Main Seeder ---
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

    await task('Seeding Payment Methods', async () => {
        const paymentMethods = ['KBC', 'Knab', 'Paypal', 'Argenta'];
        for (const name of paymentMethods) {
            await runQuery(db, 'INSERT OR IGNORE INTO PaymentMethods (PaymentMethodName, PaymentMethodFunds) VALUES (?, ?)', [name, 0]);
        }
    });

    await task('Generating and Inserting Products', async () => {
        const unitIds = (await getQuery(db, 'SELECT ProductUnitID FROM ProductUnits')).map(u => u.ProductUnitID);
        const insert = 'INSERT OR IGNORE INTO Products (ProductName, ProductBrand, ProductSize, ProductUnitID) VALUES (?, ?, ?, ?)';
        for (let i = 0; i < 10000; i++) {
            const name = getRandomElement(productNames).toLowerCase();
            const brand = getRandomElement(brands);
            await runQuery(db, insert, [name, brand, getRandomElement(sizes), getRandomElement(unitIds)]);
        }
    });

    await task('Generating Receipts with Line Items', async () => {
        const storeIds = (await getQuery(db, 'SELECT StoreID FROM Stores')).map(s => s.StoreID);
        const productIds = (await getQuery(db, 'SELECT ProductID FROM Products')).map(p => p.ProductID);
        const paymentMethodIds = (await getQuery(db, 'SELECT PaymentMethodID FROM PaymentMethods')).map(pm => pm.PaymentMethodID);

        if (productIds.length === 0) throw new Error('No products found. Cannot create receipts.');

        const insertReceipt = 'INSERT INTO Receipts (ReceiptDate, StoreID, ReceiptNote, PaymentMethodID) VALUES (?, ?, ?, ?)';
        const insertLineItem = 'INSERT INTO LineItems (ReceiptID, ProductID, LineQuantity, LineUnitPrice) VALUES (?, ?, ?, ?)';

        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                for (let i = 0; i < 4000; i++) {
                    const date = format(generateRandomDate(new Date(2022, 0, 1), new Date()), 'yyyy-MM-dd');
                    const storeId = getRandomElement(storeIds);
                    const note = Math.random() > 0.8 ? `Grote boodschappen week ${i % 52 + 1}` : null;
                    const paymentMethodId = getRandomElement(paymentMethodIds);

                    db.run(insertReceipt, [date, storeId, note, paymentMethodId], function (err) {
                        if (err) return reject(err);
                        const receiptId = this.lastID;
                        const numItems = getRandomInt(1, 25);
                        for (let j = 0; j < numItems; j++) {
                            db.run(insertLineItem, [receiptId, getRandomElement(productIds), getRandomInt(1, 5), (Math.random() * 20 + 0.5).toFixed(2)]);
                        }
                    });
                }
                db.run('COMMIT', (err) => err ? reject(err) : resolve());
            });
        });
    });

    await task('Generating Role-Based Top-Ups', async () => {
        const methods = await getQuery(db, 'SELECT * FROM PaymentMethods WHERE PaymentMethodName != "cash"');
        const totalSpendingResult = await getQuery(db, 'SELECT SUM(LineQuantity * LineUnitPrice) as total FROM LineItems');
        const TOTAL_SPENT = totalSpendingResult[0].total || 0;
        const NUM_RECEIPTS = (await getQuery(db, 'SELECT COUNT(*) as count FROM Receipts'))[0].count;
        const AVG_SPENT_PER_RECEIPT = TOTAL_SPENT / NUM_RECEIPTS;

        const roles = {
            affluent: { initialFunds: AVG_SPENT_PER_RECEIPT * 10, topUpFreq: 0.8, topUpMultiplier: 5 },
            going_up: { initialFunds: AVG_SPENT_PER_RECEIPT * 5, topUpFreq: 0.5, topUpMultiplier: 2.5 },
            keeping_above_water: { initialFunds: AVG_SPENT_PER_RECEIPT * 2, topUpFreq: 0.3, topUpMultiplier: 1.5 },
            debter: { initialFunds: AVG_SPENT_PER_RECEIPT * 0.5, topUpFreq: 0.1, topUpMultiplier: 0.8 },
        };

        const methodRoles = { 'KBC': 'affluent', 'Knab': 'going_up', 'Paypal': 'keeping_above_water', 'Argenta': 'debter' };

        for (const pm of methods) {
            const roleName = methodRoles[pm.PaymentMethodName];
            if (!roleName) continue;

            const role = roles[roleName];
            await runQuery(db, 'UPDATE PaymentMethods SET PaymentMethodFunds = ? WHERE PaymentMethodID = ?', [role.initialFunds, pm.PaymentMethodID]);

            const numTopUps = Math.floor(NUM_RECEIPTS * role.topUpFreq / 4);
            for (let i = 0; i < numTopUps; i++) {
                const topUpAmount = getRandomInt(AVG_SPENT_PER_RECEIPT * 0.5, AVG_SPENT_PER_RECEIPT * role.topUpMultiplier);
                const topUpDate = format(generateRandomDate(new Date(2022, 0, 1), new Date()), 'yyyy-MM-dd');
                await runQuery(db, 'INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate) VALUES (?, ?, ?)', [pm.PaymentMethodID, topUpAmount, topUpDate]);
            }
        }
    });

    await task('Closing database connection', () => new Promise((resolve, reject) => {
        db.close((err) => err ? reject(err) : resolve());
    }));

    done('Seeding finished');
    success('Database seeded successfully.');
}

seed().catch(err => {
    console.error(chalk.red.bold('ERROR  Seeding failed:'), err.message);
    process.exit(1);
});
