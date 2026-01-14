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

CREATE TRIGGER trigger_lineitems_updated_at AFTER UPDATE ON LineItems
BEGIN
    UPDATE LineItems SET UpdatedAt = CURRENT_TIMESTAMP WHERE LineItemID = NEW.LineItemID;
END;

CREATE INDEX IF NOT EXISTS idx_lineitems_receipt_id ON LineItems (ReceiptID);
