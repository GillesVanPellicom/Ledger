CREATE TABLE IF NOT EXISTS ProductUnits (
    ProductUnitID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductUnitType TEXT NOT NULL UNIQUE,
    ProductUnitDescription TEXT,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trigger_productunits_updated_at AFTER UPDATE ON ProductUnits
BEGIN
    UPDATE ProductUnits SET UpdatedAt = CURRENT_TIMESTAMP WHERE ProductUnitID = NEW.ProductUnitID;
END;

CREATE TABLE IF NOT EXISTS Categories (
    CategoryID INTEGER PRIMARY KEY AUTOINCREMENT,
    CategoryName TEXT NOT NULL UNIQUE,
    CategoryIsActive INTEGER NOT NULL DEFAULT 1,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trigger_categories_updated_at AFTER UPDATE ON Categories
BEGIN
    UPDATE Categories SET UpdatedAt = CURRENT_TIMESTAMP WHERE CategoryID = NEW.CategoryID;
END;

CREATE TABLE IF NOT EXISTS Products (
    ProductID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductName TEXT NOT NULL,
    ProductBrand TEXT,
    ProductSize REAL,
    CategoryID INTEGER,
    ProductUnitID INTEGER,
    ProductIsActive INTEGER NOT NULL DEFAULT 1,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProductUnitID) REFERENCES ProductUnits (ProductUnitID),
    FOREIGN KEY (CategoryID) REFERENCES Categories (CategoryID),
    UNIQUE (ProductName, ProductBrand, ProductSize, ProductUnitID)
);

CREATE TRIGGER IF NOT EXISTS trigger_products_updated_at AFTER UPDATE ON Products
BEGIN
    UPDATE Products SET UpdatedAt = CURRENT_TIMESTAMP WHERE ProductID = NEW.ProductID;
END;

CREATE TABLE IF NOT EXISTS Stores (
    StoreID INTEGER PRIMARY KEY AUTOINCREMENT,
    StoreName TEXT NOT NULL UNIQUE,
    StoreIsActive INTEGER NOT NULL DEFAULT 1,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trigger_stores_updated_at AFTER UPDATE ON Stores
BEGIN
    UPDATE Stores SET UpdatedAt = CURRENT_TIMESTAMP WHERE StoreID = NEW.StoreID;
END;

CREATE TABLE IF NOT EXISTS PaymentMethods (
    PaymentMethodID INTEGER PRIMARY KEY AUTOINCREMENT,
    PaymentMethodName TEXT NOT NULL UNIQUE,
    PaymentMethodFunds REAL NOT NULL DEFAULT 0,
    PaymentMethodIsActive INTEGER NOT NULL DEFAULT 1,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trigger_paymentmethods_updated_at AFTER UPDATE ON PaymentMethods
BEGIN
    UPDATE PaymentMethods SET UpdatedAt = CURRENT_TIMESTAMP WHERE PaymentMethodID = NEW.PaymentMethodID;
END;

CREATE TABLE IF NOT EXISTS Debtors (
    DebtorID INTEGER PRIMARY KEY AUTOINCREMENT,
    DebtorName TEXT NOT NULL UNIQUE,
    DebtorIsActive INTEGER NOT NULL DEFAULT 1,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trigger_debtors_updated_at AFTER UPDATE ON Debtors
BEGIN
    UPDATE Debtors SET UpdatedAt = CURRENT_TIMESTAMP WHERE DebtorID = NEW.DebtorID;
END;

CREATE TABLE IF NOT EXISTS Transfers (
    TransferID INTEGER PRIMARY KEY AUTOINCREMENT,
    FromPaymentMethodID INTEGER NOT NULL,
    ToPaymentMethodID INTEGER NOT NULL,
    Amount REAL NOT NULL,
    TransferDate TEXT NOT NULL,
    Note TEXT,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FromPaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID) ON DELETE CASCADE,
    FOREIGN KEY (ToPaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS trigger_transfers_updated_at AFTER UPDATE ON Transfers
BEGIN
    UPDATE Transfers SET UpdatedAt = CURRENT_TIMESTAMP WHERE TransferID = NEW.TransferID;
END;

CREATE TABLE IF NOT EXISTS TopUps (
    TopUpID INTEGER PRIMARY KEY AUTOINCREMENT,
    PaymentMethodID INTEGER NOT NULL,
    TopUpAmount REAL NOT NULL,
    TopUpDate TEXT NOT NULL,
    TopUpNote TEXT,
    TransferID INTEGER,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID) ON DELETE CASCADE,
    FOREIGN KEY (TransferID) REFERENCES Transfers (TransferID) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS trigger_topups_updated_at AFTER UPDATE ON TopUps
BEGIN
    UPDATE TopUps SET UpdatedAt = CURRENT_TIMESTAMP WHERE TopUpID = NEW.TopUpID;
END;

CREATE TABLE IF NOT EXISTS Receipts (
    ReceiptID INTEGER PRIMARY KEY AUTOINCREMENT,
    StoreID INTEGER NOT NULL,
    ReceiptDate TEXT NOT NULL,
    ReceiptNote TEXT,
    PaymentMethodID INTEGER,
    Discount REAL DEFAULT 0,
    Status TEXT DEFAULT 'paid', -- 'paid' or 'unpaid'
    OwedToDebtorID INTEGER,
    SplitType TEXT DEFAULT 'none', -- 'none', 'total_split', 'line_item'
    OwnShares REAL,
    TotalShares REAL,
    IsNonItemised INTEGER DEFAULT 0,
    NonItemisedTotal REAL,
    IsTentative INTEGER DEFAULT 0,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (StoreID) REFERENCES Stores (StoreID),
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID),
    FOREIGN KEY (OwedToDebtorID) REFERENCES Debtors (DebtorID)
);

CREATE TRIGGER IF NOT EXISTS trigger_receipts_updated_at AFTER UPDATE ON Receipts
BEGIN
    UPDATE Receipts SET UpdatedAt = CURRENT_TIMESTAMP WHERE ReceiptID = NEW.ReceiptID;
END;

CREATE TABLE IF NOT EXISTS LineItems (
    LineItemID INTEGER PRIMARY KEY AUTOINCREMENT,
    ReceiptID INTEGER NOT NULL,
    ProductID INTEGER NOT NULL,
    LineQuantity REAL NOT NULL,
    LineUnitPrice REAL NOT NULL,
    DebtorID INTEGER,
    IsExcludedFromDiscount INTEGER DEFAULT 0,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ReceiptID) REFERENCES Receipts (ReceiptID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Products (ProductID),
    FOREIGN KEY (DebtorID) REFERENCES Debtors (DebtorID)
);

CREATE TRIGGER IF NOT EXISTS trigger_lineitems_updated_at AFTER UPDATE ON LineItems
BEGIN
    UPDATE LineItems SET UpdatedAt = CURRENT_TIMESTAMP WHERE LineItemID = NEW.LineItemID;
END;

CREATE TABLE IF NOT EXISTS ReceiptImages (
    ImageID INTEGER PRIMARY KEY AUTOINCREMENT,
    ReceiptID INTEGER NOT NULL,
    ImagePath TEXT NOT NULL,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ReceiptID) REFERENCES Receipts (ReceiptID) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS trigger_receiptimages_updated_at AFTER UPDATE ON ReceiptImages
BEGIN
    UPDATE ReceiptImages SET UpdatedAt = CURRENT_TIMESTAMP WHERE ImageID = NEW.ImageID;
END;

CREATE TABLE IF NOT EXISTS ReceiptSplits (
    SplitID INTEGER PRIMARY KEY AUTOINCREMENT,
    ReceiptID INTEGER NOT NULL,
    DebtorID INTEGER NOT NULL,
    SplitPart REAL NOT NULL,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ReceiptID) REFERENCES Receipts (ReceiptID) ON DELETE CASCADE,
    FOREIGN KEY (DebtorID) REFERENCES Debtors (DebtorID)
);

CREATE TRIGGER IF NOT EXISTS trigger_receiptsplits_updated_at AFTER UPDATE ON ReceiptSplits
BEGIN
    UPDATE ReceiptSplits SET UpdatedAt = CURRENT_TIMESTAMP WHERE SplitID = NEW.SplitID;
END;

CREATE TABLE IF NOT EXISTS ReceiptDebtorPayments (
    PaymentID INTEGER PRIMARY KEY AUTOINCREMENT,
    ReceiptID INTEGER NOT NULL,
    DebtorID INTEGER NOT NULL,
    PaidDate TEXT NOT NULL,
    TopUpID INTEGER,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ReceiptID) REFERENCES Receipts (ReceiptID) ON DELETE CASCADE,
    FOREIGN KEY (DebtorID) REFERENCES Debtors (DebtorID),
    FOREIGN KEY (TopUpID) REFERENCES TopUps (TopUpID) ON DELETE SET NULL
);

CREATE TRIGGER IF NOT EXISTS trigger_receiptdebtorpayments_updated_at AFTER UPDATE ON ReceiptDebtorPayments
BEGIN
    UPDATE ReceiptDebtorPayments SET UpdatedAt = CURRENT_TIMESTAMP WHERE PaymentID = NEW.PaymentID;
END;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_receipts_date ON Receipts (ReceiptDate);
CREATE INDEX IF NOT EXISTS idx_lineitems_receipt_id ON LineItems (ReceiptID);
CREATE INDEX IF NOT EXISTS idx_receiptimages_receipt_id ON ReceiptImages (ReceiptID);
CREATE INDEX IF NOT EXISTS idx_receiptsplits_receipt_id ON ReceiptSplits (ReceiptID);
CREATE INDEX IF NOT EXISTS idx_receiptdebtorpayments_receipt_id ON ReceiptDebtorPayments (ReceiptID);
CREATE INDEX IF NOT EXISTS idx_topups_transfer_id ON TopUps (TransferID);
