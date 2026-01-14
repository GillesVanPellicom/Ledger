CREATE TABLE IF NOT EXISTS ProductUnits (
    ProductUnitID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductUnitType TEXT NOT NULL UNIQUE,
    ProductUnitDescription TEXT,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trigger_productunits_updated_at AFTER UPDATE ON ProductUnits
BEGIN
    UPDATE ProductUnits SET UpdatedAt = CURRENT_TIMESTAMP WHERE ProductUnitID = NEW.ProductUnitID;
END;

-- Default product units
INSERT OR IGNORE INTO ProductUnits (ProductUnitType, ProductUnitDescription) VALUES
  ('mg', 'Milligram'),
  ('g', 'Gram'),
  ('kg', 'Kilogram'),
  ('ml', 'Milliliter'),
  ('cl', 'Centiliter'),
  ('dl', 'Deciliter'),
  ('l', 'Liter'),
  ('cm', 'Centimeter'),
  ('m', 'Meter');
