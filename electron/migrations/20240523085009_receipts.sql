CREATE TABLE IF NOT EXISTS Expenses (
    ExpenseID INTEGER PRIMARY KEY AUTOINCREMENT,
    VendorID INTEGER,
    ExpenseDate TEXT NOT NULL,
    ExpenseNote TEXT,
    PaymentMethodID INTEGER,
    Discount REAL DEFAULT 0,
    Status TEXT DEFAULT 'paid', -- 'paid' or 'unpaid'
    OwedToEntityID INTEGER,
    SplitType TEXT DEFAULT 'none', -- 'none', 'total_split', 'line_item'
    OwnShares REAL,
    TotalShares REAL,
    IsNonItemised INTEGER DEFAULT 0,
    NonItemisedTotal REAL,
    IsTentative INTEGER DEFAULT 0,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (VendorID) REFERENCES Vendors (VendorID),
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID),
    FOREIGN KEY (OwedToEntityID) REFERENCES Entities (EntityID)
);

CREATE TRIGGER trigger_expenses_updated_at AFTER UPDATE ON Expenses
BEGIN
    UPDATE Expenses SET UpdatedAt = CURRENT_TIMESTAMP WHERE ExpenseID = NEW.ExpenseID;
END;

CREATE INDEX IF NOT EXISTS idx_expenses_date ON Expenses (ExpenseDate);
