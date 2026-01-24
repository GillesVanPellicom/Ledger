CREATE TABLE IF NOT EXISTS ExpenseSplits (
    ExpenseSplitID INTEGER PRIMARY KEY AUTOINCREMENT,
    ExpenseID INTEGER NOT NULL,
    EntityID INTEGER NOT NULL,
    SplitPart REAL NOT NULL,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ExpenseID) REFERENCES Expenses (ExpenseID) ON DELETE CASCADE,
    FOREIGN KEY (EntityID) REFERENCES Entities (EntityID)
);

CREATE TRIGGER trigger_expensesplits_updated_at AFTER UPDATE ON ExpenseSplits
BEGIN
    UPDATE ExpenseSplits SET UpdatedAt = CURRENT_TIMESTAMP WHERE ExpenseSplitID = NEW.ExpenseSplitID;
END;

CREATE INDEX IF NOT EXISTS idx_expensesplits_expense_id ON ExpenseSplits (ExpenseID);
