CREATE TABLE IF NOT EXISTS ExpenseImages (
    ExpenseImageID INTEGER PRIMARY KEY AUTOINCREMENT,
    ExpenseID INTEGER NOT NULL,
    ImagePath TEXT NOT NULL,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ExpenseID) REFERENCES Expenses (ExpenseID) ON DELETE CASCADE
);

CREATE TRIGGER trigger_expenseimages_updated_at AFTER UPDATE ON ExpenseImages
BEGIN
    UPDATE ExpenseImages SET UpdatedAt = CURRENT_TIMESTAMP WHERE ExpenseImageID = NEW.ExpenseImageID;
END;

CREATE INDEX IF NOT EXISTS idx_expenseimages_expense_id ON ExpenseImages (ExpenseID);
