CREATE TABLE IF NOT EXISTS ProductCategories (
    ProductCategoryID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductCategoryName TEXT NOT NULL UNIQUE,
    ProductCategoryIsActive INTEGER NOT NULL DEFAULT 1,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trigger_productcategories_updated_at AFTER UPDATE ON ProductCategories
BEGIN
    UPDATE ProductCategories SET UpdatedAt = CURRENT_TIMESTAMP WHERE ProductCategoryID = NEW.ProductCategoryID;
END;
