CREATE TABLE IF NOT EXISTS Receipts (
    ReceiptID INTEGER PRIMARY KEY AUTOINCREMENT,
    StoreID INTEGER,
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

CREATE TRIGGER trigger_receipts_updated_at AFTER UPDATE ON Receipts
BEGIN
    UPDATE Receipts SET UpdatedAt = CURRENT_TIMESTAMP WHERE ReceiptID = NEW.ReceiptID;
END;

CREATE INDEX IF NOT EXISTS idx_receipts_date ON Receipts (ReceiptDate);
