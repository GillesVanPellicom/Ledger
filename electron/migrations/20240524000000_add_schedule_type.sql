-- Add Type column to IncomeSchedules to distinguish between income and expense
ALTER TABLE IncomeSchedules ADD COLUMN Type TEXT NOT NULL DEFAULT 'income';

-- Add StoreID for expense schedules
ALTER TABLE IncomeSchedules ADD COLUMN StoreID INTEGER REFERENCES Stores(StoreID);

-- Add CategoryID for expense schedules (referencing general Categories table)
ALTER TABLE IncomeSchedules ADD COLUMN CategoryID INTEGER REFERENCES Categories(CategoryID);

-- Make IncomeSourceID nullable since expense schedules won't have it
-- SQLite doesn't support altering column nullability directly easily,
-- but we can just allow NULLs in practice if the constraint wasn't strict or by recreating.
-- However, the original CREATE TABLE had `IncomeSourceID INTEGER NOT NULL`.
-- We need to recreate the table to remove the NOT NULL constraint or just leave it and put a dummy value for expenses?
-- Recreating is cleaner but harder in a migration script without losing data.
-- A common workaround in SQLite for "making a column nullable" is complex.
-- For now, let's see if we can just use a dummy IncomeSourceID for expenses or if we should recreate.
-- Recreating table approach:

CREATE TABLE IncomeSchedules_New (
    IncomeScheduleID INTEGER PRIMARY KEY AUTOINCREMENT,
    Type TEXT NOT NULL DEFAULT 'income',
    IncomeSourceID INTEGER, -- Removed NOT NULL
    IncomeCategoryID INTEGER,
    PaymentMethodID INTEGER,
    ExpectedAmount REAL,
    RecurrenceRule TEXT NOT NULL,
    RequiresConfirmation INTEGER NOT NULL DEFAULT 1,
    LookaheadDays INTEGER NOT NULL DEFAULT 7,
    IsActive INTEGER NOT NULL DEFAULT 1,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    DayOfMonth INTEGER,
    DayOfWeek INTEGER,
    MonthOfYear INTEGER,
    DebtorID INTEGER,
    StoreID INTEGER,
    CategoryID INTEGER,
    Note TEXT,
    FOREIGN KEY (IncomeSourceID) REFERENCES IncomeSources (IncomeSourceID),
    FOREIGN KEY (IncomeCategoryID) REFERENCES IncomeCategories (IncomeCategoryID),
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID),
    FOREIGN KEY (DebtorID) REFERENCES Debtors(DebtorID),
    FOREIGN KEY (StoreID) REFERENCES Stores(StoreID),
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
);

INSERT INTO IncomeSchedules_New (
    IncomeScheduleID, IncomeSourceID, IncomeCategoryID, PaymentMethodID,
    ExpectedAmount, RecurrenceRule, RequiresConfirmation, LookaheadDays,
    IsActive, CreationTimestamp, UpdatedAt, DayOfMonth, DayOfWeek,
    MonthOfYear, DebtorID, Note
)
SELECT
    IncomeScheduleID, IncomeSourceID, IncomeCategoryID, PaymentMethodID,
    ExpectedAmount, RecurrenceRule, RequiresConfirmation, LookaheadDays,
    IsActive, CreationTimestamp, UpdatedAt, DayOfMonth, DayOfWeek,
    MonthOfYear, DebtorID, Note
FROM IncomeSchedules;

DROP TABLE IncomeSchedules;
ALTER TABLE IncomeSchedules_New RENAME TO IncomeSchedules;

CREATE TRIGGER IF NOT EXISTS trigger_incomeschedules_updated_at AFTER UPDATE ON IncomeSchedules
BEGIN
    UPDATE IncomeSchedules SET UpdatedAt = CURRENT_TIMESTAMP WHERE IncomeScheduleID = NEW.IncomeScheduleID;
END;
