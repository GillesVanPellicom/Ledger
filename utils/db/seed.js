import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { task, info, success, done } from './styling.js';
import { format } from 'date-fns';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../datastore/fin.db');
const seedImgPath = path.join(__dirname, 'seed-img');
const receiptImgPath = path.join(__dirname, '../../datastore/receipt_images');

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

const entities = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Albert Heijn', 'Jumbo', 'Lidl', 'Aldi', 'Plus', 'Salary', 'Freelance Client A', 'Dividends', 'Birthday Gift', 'Tax Refund'];
const debtEntities = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];
const storeEntities = ['Albert Heijn', 'Jumbo', 'Lidl', 'Aldi', 'Plus'];

const categories = [
    'Foodstuffs', 'Medical', 'Clothing', 'Electronics', 'Household', 
    'Transport', 'Entertainment', 'Personal Care', 'Housing', 'Utilities', 
    'Insurance', 'Education', 'Gifts', 'Work', 'Investment', 'Refund', 'Other'
];

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

function calculateTotalShares(ownShares, splits) {
    const debtorShares = splits.reduce((acc, curr) => acc + Number(curr.part || 0), 0);
    return debtorShares + (Number(ownShares) || 0);
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

    await task('Seeding Entities', async () => {
        const insert = 'INSERT OR IGNORE INTO Entities (EntityName) VALUES (?)';
        for (const entity of entities) await runQuery(db, insert, [entity]);
    });

    await task('Seeding Categories', async () => {
        const insert = 'INSERT OR IGNORE INTO Categories (CategoryName) VALUES (?)';
        for (const cat of categories) await runQuery(db, insert, [cat]);
    });

    await task('Seeding Payment Methods', async () => {
        const paymentMethods = ['KBC', 'Knab', 'Paypal', 'Argenta'];
        for (const name of paymentMethods) {
            await runQuery(db, 'INSERT OR IGNORE INTO PaymentMethods (PaymentMethodName, PaymentMethodFunds) VALUES (?, ?)', [name, 0]);
        }
    });

    await task('Seeding Schedules', async () => {
        const paymentMethods = await getQuery(db, 'SELECT PaymentMethodID FROM PaymentMethods');
        const entities = await getQuery(db, 'SELECT * FROM Entities');
        const categories = await getQuery(db, 'SELECT * FROM Categories');

        if (paymentMethods.length === 0 || entities.length === 0 || categories.length === 0) return;

        const schedulesToSeed = [
            { 
                RecipientName: 'Salary', 
                Category: 'Work', 
                ExpectedAmount: 3200, 
                RecurrenceRule: 'FREQ=MONTHLY;INTERVAL=1', 
                RequiresConfirmation: 1, 
                LookaheadDays: 5, 
                IsActive: 1,
                DayOfMonth: 25 
            },
            { 
                RecipientName: 'Freelance Client A', 
                Category: 'Work', 
                ExpectedAmount: 450, 
                RecurrenceRule: 'FREQ=WEEKLY;INTERVAL=1', 
                RequiresConfirmation: 1, 
                LookaheadDays: 7, 
                IsActive: 1,
                DayOfWeek: 5
            },
            { 
                RecipientName: 'Dividends', 
                Category: 'Investment', 
                ExpectedAmount: 150, 
                RecurrenceRule: 'FREQ=MONTHLY;INTERVAL=3', 
                RequiresConfirmation: 0, 
                LookaheadDays: 10, 
                IsActive: 1,
                DayOfMonth: 1
            }
        ];

        const insert = 'INSERT OR IGNORE INTO Schedules (RecipientID, CategoryID, PaymentMethodID, ExpectedAmount, RecurrenceRule, RequiresConfirmation, LookaheadDays, IsActive, DayOfMonth, DayOfWeek, MonthOfYear) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        
        for (const schedule of schedulesToSeed) {
            const recipient = entities.find(e => e.EntityName === schedule.RecipientName) || getRandomElement(entities);
            const category = categories.find(c => c.CategoryName === schedule.Category) || getRandomElement(categories);
            
            await runQuery(db, insert, [
                recipient.EntityID,
                category.CategoryID,
                getRandomElement(paymentMethods).PaymentMethodID,
                schedule.ExpectedAmount,
                schedule.RecurrenceRule,
                schedule.RequiresConfirmation,
                schedule.LookaheadDays,
                schedule.IsActive,
                schedule.DayOfMonth || null,
                schedule.DayOfWeek || null,
                schedule.MonthOfYear || null
            ]);
        }
    });

    await task('Generating and Inserting Products', async () => {
        const unitIds = (await getQuery(db, 'SELECT ProductUnitID FROM ProductUnits')).map(u => u.ProductUnitID);
        const categoryIds = (await getQuery(db, 'SELECT CategoryID FROM Categories')).map(c => c.CategoryID);
        const insert = 'INSERT OR IGNORE INTO Products (ProductName, ProductBrand, ProductSize, ProductUnitID, CategoryID) VALUES (?, ?, ?, ?, ?)';
        for (let i = 0; i < 10000; i++) {
            const name = getRandomElement(productNames).toLowerCase();
            const brand = getRandomElement(brands);
            const categoryId = Math.random() < 0.95 ? getRandomElement(categoryIds) : null;
            await runQuery(db, insert, [name, brand, getRandomElement(sizes), getRandomElement(unitIds), categoryId]);
        }
    });

    await task('Generating Expenses with Line Items and Debt', async () => {
        if (!fs.existsSync(receiptImgPath)) {
            fs.mkdirSync(receiptImgPath, { recursive: true });
        }
        const storeEntityIds = (await getQuery(db, `SELECT EntityID FROM Entities WHERE EntityName IN ('${storeEntities.join("','")}')`)).map(e => e.EntityID);
        const debtEntityIds = (await getQuery(db, `SELECT EntityID FROM Entities WHERE EntityName IN ('${debtEntities.join("','")}')`)).map(e => e.EntityID);
        const productIds = (await getQuery(db, 'SELECT ProductID FROM Products')).map(p => p.ProductID);
        const paymentMethodIds = (await getQuery(db, 'SELECT PaymentMethodID FROM PaymentMethods')).map(pm => pm.PaymentMethodID);
        const seedImages = fs.readdirSync(seedImgPath).filter(f => f.endsWith('.webp'));

        if (productIds.length === 0) throw new Error('No products found. Cannot create receipts.');

        const insertReceipt = 'INSERT INTO Expenses (ExpenseDate, RecipientID, ExpenseNote, PaymentMethodID, SplitType, Status, OwedToEntityID, IsNonItemised, NonItemisedTotal, IsTentative, OwnShares, TotalShares, Discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const insertLineItem = 'INSERT INTO ExpenseLineItems (ExpenseID, ProductID, LineQuantity, LineUnitPrice, EntityID, IsExcludedFromDiscount) VALUES (?, ?, ?, ?, ?, ?)';
        const insertReceiptSplit = 'INSERT INTO ExpenseSplits (ExpenseID, EntityID, SplitPart) VALUES (?, ?, ?)';
        const insertPayment = 'INSERT INTO ExpenseEntityPayments (ExpenseID, EntityID, PaidDate) VALUES (?, ?, ?)';
        const insertImage = 'INSERT INTO ExpenseImages (ExpenseID, ImagePath) VALUES (?, ?)';

        const paymentMethods = await getQuery(db, 'SELECT * FROM PaymentMethods');
        const pmMap = {};
        paymentMethods.forEach(pm => pmMap[pm.PaymentMethodID] = pm.PaymentMethodName);

        const pmRoles = { 'KBC': 'affluent', 'Knab': 'going_up', 'Paypal': 'keeping_above_water', 'Argenta': 'debter' };
        const roles = {
            affluent: { debtProb: 0.8, unpaidProb: 0.05 },
            going_up: { debtProb: 0.5, unpaidProb: 0.1 },
            keeping_above_water: { debtProb: 0.2, unpaidProb: 0.2 },
            debter: { debtProb: 0.05, unpaidProb: 0.4 },
        };

        await new Promise((resolve, reject) => {
             db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                for (let i = 0; i < 4000; i++) {
                    const date = format(generateRandomDate(new Date(2022, 0, 1), new Date()), 'yyyy-MM-dd');
                    const recipientId = getRandomElement(storeEntityIds);
                    const note = Math.random() > 0.8 ? `Grote boodschappen week ${i % 52 + 1}` : null;
                    const paymentMethodId = getRandomElement(paymentMethodIds);

                    const pmName = pmMap[paymentMethodId];
                    const roleName = pmRoles[pmName];
                    const role = roles[roleName] || { debtProb: 0.1, unpaidProb: 0.1 };

                    const isPaidBySomeoneElse = Math.random() < role.unpaidProb;
                    const isRepaid = isPaidBySomeoneElse && Math.random() > 0.5;
                    
                    const status = (isPaidBySomeoneElse && !isRepaid) ? 'unpaid' : 'paid';
                    const owedToEntityID = isPaidBySomeoneElse ? getRandomElement(debtEntityIds) : null;
                    const receiptPaymentMethodId = (isPaidBySomeoneElse && !isRepaid) ? null : paymentMethodId;

                    const isTentative = Math.random() < 0.05;
                    const isNonItemised = Math.random() < 0.1;
                    
                    const hasDiscount = Math.random() < 0.2;
                    const discount = hasDiscount ? getRandomInt(5, 20) : 0;

                    const hasDebt = !isPaidBySomeoneElse && Math.random() < role.debtProb;
                    let splitType = 'none';
                    if (hasDebt) {
                        splitType = Math.random() > 0.5 ? 'line_item' : 'total_split';
                    }
                    
                    let ownShares = null;
                    let totalShares = null;

                    db.run(insertReceipt, [date, recipientId, note, receiptPaymentMethodId, splitType, status, owedToEntityID, isNonItemised ? 1 : 0, null, isTentative ? 1 : 0, ownShares, totalShares, discount], function (err) {
                        if (err) return reject(err);
                        const receiptId = this.lastID;

                        if (Math.random() < 0.1 && seedImages.length > 0) {
                            const numImages = getRandomInt(1, 3);
                            for (let k = 0; k < numImages; k++) {
                                const img = getRandomElement(seedImages);
                                const newName = `${receiptId}_${k + 1}.webp`;
                                fs.copyFileSync(path.join(seedImgPath, img), path.join(receiptImgPath, newName));
                                db.run(insertImage, [receiptId, newName]);
                            }
                        }
                        
                        if (isNonItemised) {
                            const total = (Math.random() * 100 + 5).toFixed(2);
                            db.run('UPDATE Expenses SET NonItemisedTotal = ? WHERE ExpenseID = ?', [total, receiptId]);
                        } else {
                            const numItems = getRandomInt(1, 25);
                            const lineItemsToInsert = [];
                            let receiptDebtors = new Set();

                            for (let j = 0; j < numItems; j++) {
                                let debtorId = null;
                                if (splitType === 'line_item' && Math.random() > 0.3) {
                                    debtorId = getRandomElement(debtEntityIds);
                                    if(debtorId) receiptDebtors.add(debtorId);
                                }
                                lineItemsToInsert.push({
                                    productId: getRandomElement(productIds),
                                    qty: getRandomInt(1, 5),
                                    price: (Math.random() * 20 + 0.5).toFixed(2),
                                    debtorId: debtorId
                                });
                            }

                            if (splitType === 'total_split') {
                                const numDebtors = getRandomInt(1, 3);
                                const selectedDebtors = [];
                                while (selectedDebtors.length < numDebtors) {
                                    const d = getRandomElement(debtEntityIds);
                                    if (!selectedDebtors.includes(d)) selectedDebtors.push(d);
                                }
                                
                                const ownSharePart = Math.random() > 0.3 ? getRandomInt(1, 3) : 0;
                                const splits = [];

                                selectedDebtors.forEach(debtorId => {
                                    const part = getRandomInt(1, 3);
                                    splits.push({ part });
                                    db.run(insertReceiptSplit, [receiptId, debtorId, part]);
                                    receiptDebtors.add(debtorId);
                                });
                                
                                const currentTotalShares = calculateTotalShares(ownSharePart, splits);
                                db.run('UPDATE Expenses SET OwnShares = ?, TotalShares = ? WHERE ExpenseID = ?', [ownSharePart, currentTotalShares, receiptId]);
                            }

                            const hasExclusions = hasDiscount && Math.random() < 0.3;
                            const exclusionCount = hasExclusions ? getRandomInt(1, Math.floor(numItems / 2)) : 0;
                            const excludedIndexes = new Set();
                            while(excludedIndexes.size < exclusionCount) {
                                excludedIndexes.add(getRandomInt(0, numItems - 1));
                            }

                            lineItemsToInsert.forEach((item, index) => {
                                const isExcluded = excludedIndexes.has(index) ? 1 : 0;
                                db.run(insertLineItem, [receiptId, item.productId, item.qty, item.price, item.debtorId, isExcluded]);
                            });

                            if (receiptDebtors.size > 0 && Math.random() < 0.15) {
                                const paymentDate = format(generateRandomDate(new Date(date), new Date()), 'yyyy-MM-dd');
                                receiptDebtors.forEach(debtorId => {
                                    db.run(insertPayment, [receiptId, debtorId, paymentDate]);
                                });
                            }
                        }
                    });
                }
                db.run('COMMIT', (err) => err ? reject(err) : resolve());
            });
        });
    });

    await task('Generating Role-Based Income', async () => {
        const methods = await getQuery(db, 'SELECT * FROM PaymentMethods WHERE PaymentMethodName != "cash"');
        const totalSpendingResult = await getQuery(db, 'SELECT SUM(LineQuantity * LineUnitPrice) as total FROM ExpenseLineItems');
        const TOTAL_SPENT = totalSpendingResult[0].total || 0;
        const NUM_RECEIPTS = (await getQuery(db, 'SELECT COUNT(*) as count FROM Expenses'))[0].count;
        const AVG_SPENT_PER_RECEIPT = TOTAL_SPENT / NUM_RECEIPTS;

        const roles = {
            affluent: { initialFunds: AVG_SPENT_PER_RECEIPT * 10, topUpFreq: 0.8, topUpMultiplier: 5 },
            going_up: { initialFunds: AVG_SPENT_PER_RECEIPT * 5, topUpFreq: 0.5, topUpMultiplier: 2.5 },
            keeping_above_water: { initialFunds: AVG_SPENT_PER_RECEIPT * 2, topUpFreq: 0.3, topUpMultiplier: 1.5 },
            debter: { initialFunds: AVG_SPENT_PER_RECEIPT * 0.5, topUpFreq: 0.1, topUpMultiplier: 0.8 },
        };

        const methodRoles = { 'KBC': 'affluent', 'Knab': 'going_up', 'Paypal': 'keeping_above_water', 'Argenta': 'debter' };
        const topUpNotes = ['Monthly salary', 'Bonus', 'Gift', 'Project payment', 'Stock dividend', null];
        
        const entities = await getQuery(db, 'SELECT * FROM Entities');
        const categories = await getQuery(db, 'SELECT * FROM Categories');

        for (const pm of methods) {
            const roleName = methodRoles[pm.PaymentMethodName];
            if (!roleName) continue;

            const role = roles[roleName];
            await runQuery(db, 'UPDATE PaymentMethods SET PaymentMethodFunds = ? WHERE PaymentMethodID = ?', [role.initialFunds, pm.PaymentMethodID]);

            const numTopUps = Math.floor(NUM_RECEIPTS * role.topUpFreq / 4);
            for (let i = 0; i < numTopUps; i++) {
                const topUpAmount = getRandomInt(AVG_SPENT_PER_RECEIPT * 0.5, AVG_SPENT_PER_RECEIPT * role.topUpMultiplier);
                const topUpDate = format(generateRandomDate(new Date(2022, 0, 1), new Date()), 'yyyy-MM-dd');
                const topUpNote = Math.random() > 0.5 ? getRandomElement(topUpNotes) : null;
                
                const recipientId = Math.random() > 0.2 ? getRandomElement(entities).EntityID : null;
                const categoryId = Math.random() > 0.2 ? getRandomElement(categories).CategoryID : null;

                await runQuery(db, 'INSERT INTO Income (PaymentMethodID, IncomeAmount, IncomeDate, IncomeNote, RecipientID, CategoryID) VALUES (?, ?, ?, ?, ?, ?)', 
                    [pm.PaymentMethodID, topUpAmount, topUpDate, topUpNote, recipientId, categoryId]);
            }
        }
    });

    await task('Generating Transfers', async () => {
        const methods = await getQuery(db, 'SELECT * FROM PaymentMethods WHERE PaymentMethodName != "cash"');
        if (methods.length < 2) return;

        const insertTransfer = 'INSERT INTO Transfers (FromPaymentMethodID, ToPaymentMethodID, Amount, TransferDate, Note) VALUES (?, ?, ?, ?, ?)';
        const insertTopUp = 'INSERT INTO Income (PaymentMethodID, IncomeAmount, IncomeDate, IncomeNote, TransferID) VALUES (?, ?, ?, ?, ?)';

        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                for (let i = 0; i < 50; i++) {
                    const fromMethod = getRandomElement(methods);
                    let toMethod = getRandomElement(methods);
                    while (toMethod.PaymentMethodID === fromMethod.PaymentMethodID) {
                        toMethod = getRandomElement(methods);
                    }

                    const amount = getRandomInt(50, 1000);
                    const date = format(generateRandomDate(new Date(2023, 0, 1), new Date()), 'yyyy-MM-dd');
                    const note = Math.random() > 0.5 ? 'Savings transfer' : 'Covering expenses';

                    db.run(insertTransfer, [fromMethod.PaymentMethodID, toMethod.PaymentMethodID, amount, date, note], function(err) {
                        if (err) return reject(err);
                        const transferId = this.lastID;

                        db.run(insertTopUp, [fromMethod.PaymentMethodID, -amount, date, `Transfer to ${toMethod.PaymentMethodName}`, transferId]);
                        db.run(insertTopUp, [toMethod.PaymentMethodID, amount, date, `Transfer from ${fromMethod.PaymentMethodName}`, transferId]);
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
    success('Database seeded successfully.');
}

seed().catch(err => {
    console.error(chalk.red.bold('ERROR  Seeding failed:'), err.message);
    process.exit(1);
});
