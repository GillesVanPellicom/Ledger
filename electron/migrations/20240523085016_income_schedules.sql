CREATE TABLE IF NOT EXISTS Schedules (
    ScheduleID INTEGER PRIMARY KEY AUTOINCREMENT,
    Type TEXT NOT NULL DEFAULT 'income', -- 'income' or 'expense'
    IncomeSourceID INTEGER,
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
    Note TEXT NOT NULL DEFAULT '',
    EntityID INTEGER,
    VendorID INTEGER,
    ProductCategoryID INTEGER,
    FOREIGN KEY (IncomeSourceID) REFERENCES IncomeSources (IncomeSourceID),
    FOREIGN KEY (IncomeCategoryID) REFERENCES IncomeCategories (IncomeCategoryID),
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID),
    FOREIGN KEY (EntityID) REFERENCES Entities (EntityID),
    FOREIGN KEY (VendorID) REFERENCES Vendors (VendorID),
    FOREIGN KEY (ProductCategoryID) REFERENCES ProductCategories (ProductCategoryID)
);

CREATE TRIGGER IF NOT EXISTS trigger_schedules_updated_at AFTER UPDATE ON Schedules
BEGIN
    UPDATE Schedules SET UpdatedAt = CURRENT_TIMESTAMP WHERE ScheduleID = NEW.ScheduleID;
END;
