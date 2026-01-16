CREATE TABLE IF NOT EXISTS IncomeCategories (
    IncomeCategoryID INTEGER PRIMARY KEY AUTOINCREMENT,
    IncomeCategoryName TEXT NOT NULL UNIQUE,
    IncomeCategoryIsActive INTEGER NOT NULL DEFAULT 1,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trigger_incomecategories_updated_at AFTER UPDATE ON IncomeCategories
BEGIN
    UPDATE IncomeCategories SET UpdatedAt = CURRENT_TIMESTAMP WHERE IncomeCategoryID = NEW.IncomeCategoryID;
END;
