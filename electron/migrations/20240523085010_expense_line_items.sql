CREATE TABLE IF NOT EXISTS ExpenseLineItems (
    ExpenseLineItemID INTEGER PRIMARY KEY AUTOINCREMENT,
    ExpenseID INTEGER NOT NULL,
    ProductID INTEGER NOT NULL,
    LineQuantity REAL NOT NULL,
    LineUnitPrice REAL NOT NULL,
    EntityID INTEGER,
    IsExcludedFromDiscount INTEGER DEFAULT 0,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ExpenseID) REFERENCES Expenses (ExpenseID) ON DELETE CASCADE,
    FOREIGN KEY (ProductID) REFERENCES Products (ProductID),
    FOREIGN KEY (EntityID) REFERENCES Entities (EntityID)
);

CREATE TRIGGER trigger_expenselineitems_updated_at AFTER UPDATE ON ExpenseLineItems
BEGIN
    UPDATE ExpenseLineItems SET UpdatedAt = CURRENT_TIMESTAMP WHERE ExpenseLineItemID = NEW.ExpenseLineItemID;
END;

CREATE INDEX IF NOT EXISTS idx_expenselineitems_expense_id ON ExpenseLineItems (ExpenseID);
