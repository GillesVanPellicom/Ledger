PRAGMA foreign_keys = ON;

CREATE TABLE ProductUnits
(
  ProductUnitID          INTEGER PRIMARY KEY,
  ProductUnitType        TEXT NOT NULL,
  ProductUnitDescription TEXT
);

CREATE TABLE Stores
(
  StoreID       INTEGER PRIMARY KEY,
  StoreName     TEXT    NOT NULL,
  StoreIsActive INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE Products
(
  ProductID       INTEGER PRIMARY KEY,
  ProductName     TEXT    NOT NULL,
  ProductBrand    TEXT    NOT NULL,
  ProductSize     INTEGER NOT NULL,
  ProductUnitID   INTEGER NOT NULL,
  ProductIsActive INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (ProductUnitID) REFERENCES ProductUnits (ProductUnitID),
  UNIQUE (ProductName, ProductBrand, ProductSize)
);

CREATE TABLE Receipts
(
  ReceiptID        INTEGER PRIMARY KEY,
  ReceiptDate      TEXT    NOT NULL,
  StoreID          INTEGER NOT NULL,
  ReceiptNote      TEXT,
  ReceiptEntryDate TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (StoreID) REFERENCES Stores (StoreID)
);

CREATE TABLE ReceiptImages
(
  ImageID   INTEGER PRIMARY KEY,
  ReceiptID INTEGER NOT NULL,
  ImagePath TEXT    NOT NULL,
  FOREIGN KEY (ReceiptID) REFERENCES Receipts (ReceiptID) ON DELETE CASCADE
);

CREATE TABLE LineItems
(
  LineItemID    INTEGER PRIMARY KEY,
  ReceiptID     INTEGER NOT NULL,
  ProductID     INTEGER NOT NULL,
  LineQuantity  INTEGER NOT NULL,
  LineUnitPrice NUMERIC NOT NULL,
  FOREIGN KEY (ReceiptID) REFERENCES Receipts (ReceiptID) ON DELETE CASCADE,
  FOREIGN KEY (ProductID) REFERENCES Products (ProductID)
);

-- Indexes

CREATE INDEX idx_products_unit
  ON Products (ProductUnitID);

CREATE INDEX idx_receipts_store
  ON Receipts (StoreID);

CREATE INDEX idx_lineitems_receipt
  ON LineItems (ReceiptID);

CREATE INDEX idx_lineitems_product
  ON LineItems (ProductID);

CREATE INDEX idx_products_active
  ON Products (ProductIsActive);

CREATE INDEX idx_stores_active
  ON Stores (StoreIsActive);

CREATE INDEX idx_receipts_date
  ON Receipts (ReceiptDate);

CREATE INDEX idx_receipt_images_receipt
  ON ReceiptImages (ReceiptID);