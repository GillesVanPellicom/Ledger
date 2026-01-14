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

CREATE TRIGGER trigger_receiptdebtorpayments_updated_at AFTER UPDATE ON ReceiptDebtorPayments
BEGIN
    UPDATE ReceiptDebtorPayments SET UpdatedAt = CURRENT_TIMESTAMP WHERE PaymentID = NEW.PaymentID;
END;

CREATE INDEX IF NOT EXISTS idx_receiptdebtorpayments_receipt_id ON ReceiptDebtorPayments (ReceiptID);
