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

CREATE TRIGGER trigger_receiptsplits_updated_at AFTER UPDATE ON ReceiptSplits
BEGIN
    UPDATE ReceiptSplits SET UpdatedAt = CURRENT_TIMESTAMP WHERE SplitID = NEW.SplitID;
END;

CREATE INDEX IF NOT EXISTS idx_receiptsplits_receipt_id ON ReceiptSplits (ReceiptID);
