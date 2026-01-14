CREATE TABLE IF NOT EXISTS PaymentMethods (
    PaymentMethodID INTEGER PRIMARY KEY AUTOINCREMENT,
    PaymentMethodName TEXT NOT NULL UNIQUE,
    PaymentMethodFunds REAL NOT NULL DEFAULT 0,
    PaymentMethodIsActive INTEGER NOT NULL DEFAULT 1,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trigger_paymentmethods_updated_at AFTER UPDATE ON PaymentMethods
BEGIN
    UPDATE PaymentMethods SET UpdatedAt = CURRENT_TIMESTAMP WHERE PaymentMethodID = NEW.PaymentMethodID;
END;

-- Default payment method
INSERT OR IGNORE INTO PaymentMethods (PaymentMethodName, PaymentMethodFunds) VALUES ('Cash', 0);
