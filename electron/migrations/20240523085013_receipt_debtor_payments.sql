CREATE TABLE IF NOT EXISTS ExpenseEntityPayments (
    ExpenseEntityPaymentID INTEGER PRIMARY KEY AUTOINCREMENT,
    ExpenseID INTEGER NOT NULL,
    EntityID INTEGER NOT NULL,
    PaidDate TEXT NOT NULL,
    IncomeID INTEGER,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ExpenseID) REFERENCES Expenses (ExpenseID) ON DELETE CASCADE,
    FOREIGN KEY (EntityID) REFERENCES Entities (EntityID),
    FOREIGN KEY (IncomeID) REFERENCES Income (IncomeID) ON DELETE SET NULL
);

CREATE TRIGGER trigger_expenseentitypayments_updated_at AFTER UPDATE ON ExpenseEntityPayments
BEGIN
    UPDATE ExpenseEntityPayments SET UpdatedAt = CURRENT_TIMESTAMP WHERE ExpenseEntityPaymentID = NEW.ExpenseEntityPaymentID;
END;

CREATE INDEX IF NOT EXISTS idx_expenseentitypayments_expense_id ON ExpenseEntityPayments (ExpenseID);
