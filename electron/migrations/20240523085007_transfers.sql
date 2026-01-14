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

CREATE TRIGGER trigger_transfers_updated_at AFTER UPDATE ON Transfers
BEGIN
    UPDATE Transfers SET UpdatedAt = CURRENT_TIMESTAMP WHERE TransferID = NEW.TransferID;
END;
