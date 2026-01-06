PRAGMA foreign_keys = ON;

--------------------------------------------------
-- Product units
--------------------------------------------------

CREATE TABLE ProductUnits
(
  ProductUnitID          INTEGER PRIMARY KEY,
  ProductUnitType        TEXT NOT NULL,
  ProductUnitDescription TEXT
);

INSERT INTO ProductUnits (ProductUnitType, ProductUnitDescription)
VALUES
  ('mg', 'Milligram'),
  ('g',  'Gram'),
  ('kg', 'Kilogram'),
  ('ml', 'Milliliter'),
  ('cl', 'Centiliter'),
  ('dl', 'Deciliter'),
  ('l',  'Liter'),
  ('cm', 'Centimeter'),
  ('m',  'Meter');

--------------------------------------------------
-- Stores
--------------------------------------------------

CREATE TABLE Stores
(
  StoreID       INTEGER PRIMARY KEY,
  StoreName     TEXT    NOT NULL,
  StoreIsActive INTEGER NOT NULL DEFAULT 1
);

--------------------------------------------------
-- Products
--------------------------------------------------

CREATE TABLE Products
(
  ProductID       INTEGER PRIMARY KEY,
  ProductName     TEXT    NOT NULL,
  ProductBrand    TEXT    NOT NULL,
  ProductSize     INTEGER NOT NULL,
  ProductUnitID   INTEGER NOT NULL,
  ProductIsActive INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (ProductUnitID)
    REFERENCES ProductUnits (ProductUnitID),
  UNIQUE (ProductName, ProductBrand, ProductSize)
);

--------------------------------------------------
-- People (who owe you money)
--------------------------------------------------

CREATE TABLE People
(
  PersonID   INTEGER PRIMARY KEY,
  PersonName TEXT NOT NULL UNIQUE
);

--------------------------------------------------
-- Debt Entities (for Debt Tracking module)
--------------------------------------------------

CREATE TABLE DebtEntities
(
  EntityID       INTEGER PRIMARY KEY,
  EntityName     TEXT    NOT NULL UNIQUE,
  EntityIsActive INTEGER NOT NULL DEFAULT 1
);

--------------------------------------------------
-- Payment methods (cash, bank, card, etc.)
--------------------------------------------------

CREATE TABLE PaymentMethods
(
  PaymentMethodID    INTEGER PRIMARY KEY,
  PaymentMethodName  TEXT NOT NULL UNIQUE,
  PaymentMethodFunds NUMERIC NOT NULL
);

INSERT INTO PaymentMethods
  (PaymentMethodID, PaymentMethodName, PaymentMethodFunds)
VALUES
  (1, 'Cash', 0);

--------------------------------------------------
-- Receipts
--------------------------------------------------

CREATE TABLE Receipts
(
  ReceiptID        INTEGER PRIMARY KEY,
  ReceiptDate      TEXT    NOT NULL,
  StoreID          INTEGER NOT NULL,
  PaymentMethodID  INTEGER NOT NULL DEFAULT 1,
  ReceiptNote      TEXT,
  ReceiptEntryDate TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (StoreID)
    REFERENCES Stores (StoreID),
  FOREIGN KEY (PaymentMethodID)
    REFERENCES PaymentMethods (PaymentMethodID)
);

--------------------------------------------------
-- Receipt images
--------------------------------------------------

CREATE TABLE ReceiptImages
(
  ImageID   INTEGER PRIMARY KEY,
  ReceiptID INTEGER NOT NULL,
  ImagePath TEXT    NOT NULL,
  FOREIGN KEY (ReceiptID)
    REFERENCES Receipts (ReceiptID)
    ON DELETE CASCADE
);

--------------------------------------------------
-- Line items (per-product, per-person)
--------------------------------------------------

CREATE TABLE LineItems
(
  LineItemID    INTEGER PRIMARY KEY,
  ReceiptID     INTEGER NOT NULL,
  ProductID     INTEGER NOT NULL,
  PersonID      INTEGER DEFAULT NULL,
  LineQuantity  INTEGER NOT NULL,
  LineUnitPrice NUMERIC NOT NULL,
  FOREIGN KEY (ReceiptID)
    REFERENCES Receipts (ReceiptID)
    ON DELETE CASCADE,
  FOREIGN KEY (ProductID)
    REFERENCES Products (ProductID),
  FOREIGN KEY (PersonID)
    REFERENCES People (PersonID)
);

--------------------------------------------------
-- Top-ups (adding money to payment methods)
--------------------------------------------------

CREATE TABLE TopUps
(
  TopUpID          INTEGER PRIMARY KEY,
  PaymentMethodID  INTEGER NOT NULL,
  TopUpAmount      NUMERIC NOT NULL,
  TopUpDate        TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  TopUpNote        TEXT,
  FOREIGN KEY (PaymentMethodID)
    REFERENCES PaymentMethods (PaymentMethodID)
    ON DELETE CASCADE
);

--------------------------------------------------
-- Indexes
--------------------------------------------------

CREATE INDEX idx_products_unit
  ON Products (ProductUnitID);

CREATE INDEX idx_products_active
  ON Products (ProductIsActive);

CREATE INDEX idx_stores_active
  ON Stores (StoreIsActive);

CREATE INDEX idx_receipts_store
  ON Receipts (StoreID);

CREATE INDEX idx_receipts_paymentmethod
  ON Receipts (PaymentMethodID);

CREATE INDEX idx_receipts_date
  ON Receipts (ReceiptDate);

CREATE INDEX idx_receipt_images_receipt
  ON ReceiptImages (ReceiptID);

CREATE INDEX idx_lineitems_receipt
  ON LineItems (ReceiptID);

CREATE INDEX idx_lineitems_product
  ON LineItems (ProductID);

CREATE INDEX idx_lineitems_person
  ON LineItems (PersonID);

CREATE INDEX idx_topups_paymentmethod
  ON TopUps (PaymentMethodID);

CREATE INDEX idx_topups_date
  ON TopUps (TopUpDate);

CREATE INDEX idx_debtentities_active
  ON DebtEntities (EntityIsActive);
