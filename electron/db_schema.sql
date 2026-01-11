CREATE TABLE IF NOT EXISTS ProductUnits (
    ProductUnitID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductUnitType TEXT NOT NULL UNIQUE,
    ProductUnitDescription TEXT
);

CREATE TABLE IF NOT EXISTS Products (
    ProductID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductName TEXT NOT NULL,
    ProductBrand TEXT,
    ProductSize REAL,
    ProductUnitID INTEGER,
    ProductIsActive INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (ProductUnitID) REFERENCES ProductUnits (ProductUnitID),
    UNIQUE (ProductName, ProductBrand, ProductSize, ProductUnitID)
);

CREATE TABLE IF NOT EXISTS Stores (
    StoreID INTEGER PRIMARY KEY AUTOINCREMENT,
    StoreName TEXT NOT NULL UNIQUE,
    StoreIsActive INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS PaymentMethods (
    PaymentMethodID INTEGER PRIMARY KEY AUTOINCREMENT,
    PaymentMethodName TEXT NOT NULL UNIQUE,
    PaymentMethodFunds REAL NOT NULL DEFAULT 0,
    PaymentMethodIsActive INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS Debtors (
    DebtorID INTEGER PRIMARY KEY AUTOINCREMENT,
    DebtorName TEXT NOT NULL UNIQUE,
    DebtorIsActive INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS Transfers (
    TransferID INTEGER PRIMARY KEY AUTOINCREMENT,
    FromPaymentMethodID INTEGER NOT NULL,
    ToPaymentMethodID INTEGER NOT NULL,
    Amount REAL NOT NULL,
    TransferDate TEXT NOT NULL,
    Note TEXT,
    FOREIGN KEY (FromPaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID) ON DELETE CASCADE,
    FOREIGN KEY (ToPaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS TopUps (
    TopUpID INTEGER PRIMARY KEY AUTOINCREMENT,
    PaymentMethodID INTEGER NOT NULL,
    TopUpAmount REAL NOT NULL,
    TopUpDate TEXT NOT NULL,
    TopUpNote TEXT,
    TransferID INTEGER,
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID) ON DELETE CASCADE,
    FOREIGN KEY (TransferID) REFERENCES Transfers (TransferID) ON DELETE CASCADE
);

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
    FOREIGN KEY (StoreID) REFERENCES Stores (StoreID),
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID),
    FOREIGN KEY (OwedToDebtorID) REFERENCES Debtors (DebtorID)
);

CREATE TABLE IF NOT EXISTS LineItems (
    LineItemID INTEGER PRIMARY KEY AUTOINCREMENT,
    ReceiptID INTEGER NOT NULL,
    ProductID INTEGER NOT NULL,
    LineQuantity REAL NOT NULL,
    LineUnitPrice REAL NOT NULL,
    DebtorID INTEGER,
    IsExcludedFromDiscount INTEGER DEFAULT 0,
    FOREIGN KEY (ReceiptID) REFERENCES Receipts (ReceiptID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Products (ProductID),
    FOREIGN KEY (DebtorID) REFERENCES Debtors (DebtorID)
);

CREATE TABLE IF NOT EXISTS ReceiptImages (
    ImageID INTEGER PRIMARY KEY AUTOINCREMENT,
    ReceiptID INTEGER NOT NULL,
    ImagePath TEXT NOT NULL,
    FOREIGN KEY (ReceiptID) REFERENCES Receipts (ReceiptID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ReceiptSplits (
    SplitID INTEGER PRIMARY KEY AUTOINCREMENT,
    ReceiptID INTEGER NOT NULL,
    DebtorID INTEGER NOT NULL,
    SplitPart REAL NOT NULL,
    FOREIGN KEY (ReceiptID) REFERENCES Receipts (ReceiptID) ON DELETE CASCADE,
    FOREIGN KEY (DebtorID) REFERENCES Debtors (DebtorID)
);

CREATE TABLE IF NOT EXISTS ReceiptDebtorPayments (
    PaymentID INTEGER PRIMARY KEY AUTOINCREMENT,
    ReceiptID INTEGER NOT NULL,
    DebtorID INTEGER NOT NULL,
    PaidDate TEXT NOT NULL,
    TopUpID INTEGER,
    FOREIGN KEY (ReceiptID) REFERENCES Receipts (ReceiptID) ON DELETE CASCADE,
    FOREIGN KEY (DebtorID) REFERENCES Debtors (DebtorID),
    FOREIGN KEY (TopUpID) REFERENCES TopUps (TopUpID) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_receipts_date ON Receipts (ReceiptDate);
CREATE INDEX IF NOT EXISTS idx_lineitems_receipt_id ON LineItems (ReceiptID);
CREATE INDEX IF NOT EXISTS idx_receiptimages_receipt_id ON ReceiptImages (ReceiptID);
CREATE INDEX IF NOT EXISTS idx_receiptsplits_receipt_id ON ReceiptSplits (ReceiptID);
CREATE INDEX IF NOT EXISTS idx_receiptdebtorpayments_receipt_id ON ReceiptDebtorPayments (ReceiptID);
CREATE INDEX IF NOT EXISTS idx_topups_transfer_id ON TopUps (TransferID);
