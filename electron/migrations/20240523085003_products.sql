CREATE TABLE IF NOT EXISTS Products (
    ProductID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductName TEXT NOT NULL,
    ProductBrand TEXT,
    ProductSize REAL,
    CategoryID INTEGER,
    ProductUnitID INTEGER,
    ProductIsActive INTEGER NOT NULL DEFAULT 1,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProductUnitID) REFERENCES ProductUnits (ProductUnitID),
    FOREIGN KEY (CategoryID) REFERENCES Categories (CategoryID),
    UNIQUE (ProductName, ProductBrand, ProductSize, ProductUnitID)
);

CREATE TRIGGER trigger_products_updated_at AFTER UPDATE ON Products
BEGIN
    UPDATE Products SET UpdatedAt = CURRENT_TIMESTAMP WHERE ProductID = NEW.ProductID;
END;
