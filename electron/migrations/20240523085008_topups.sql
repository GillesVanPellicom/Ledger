CREATE TABLE IF NOT EXISTS Income (
    IncomeID INTEGER PRIMARY KEY AUTOINCREMENT,
    PaymentMethodID INTEGER NOT NULL,
    IncomeAmount REAL NOT NULL,
    IncomeDate TEXT NOT NULL,
    IncomeNote TEXT,
    TransferID INTEGER,
    IncomeSourceID INTEGER,
    IncomeCategoryID INTEGER,
    EntityID INTEGER,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID) ON DELETE CASCADE,
    FOREIGN KEY (TransferID) REFERENCES Transfers (TransferID) ON DELETE CASCADE,
    FOREIGN KEY (IncomeSourceID) REFERENCES IncomeSources (IncomeSourceID),
    FOREIGN KEY (IncomeCategoryID) REFERENCES IncomeCategories (IncomeCategoryID),
    FOREIGN KEY (EntityID) REFERENCES Entities (EntityID)
);

CREATE TRIGGER trigger_income_updated_at AFTER UPDATE ON Income
BEGIN
    UPDATE Income SET UpdatedAt = CURRENT_TIMESTAMP WHERE IncomeID = NEW.IncomeID;
END;

CREATE INDEX IF NOT EXISTS idx_income_transfer_id ON Income (TransferID);
