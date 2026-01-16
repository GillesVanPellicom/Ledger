CREATE TABLE IF NOT EXISTS IncomeSchedules (
    IncomeScheduleID INTEGER PRIMARY KEY AUTOINCREMENT,
    IncomeSourceID INTEGER NOT NULL,
    IncomeCategoryID INTEGER,
    PaymentMethodID INTEGER,
    ExpectedAmount REAL,
    RecurrenceRule TEXT NOT NULL,
    RequiresConfirmation INTEGER NOT NULL DEFAULT 1,
    LookaheadDays INTEGER NOT NULL DEFAULT 7,
    IsActive INTEGER NOT NULL DEFAULT 1,
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (IncomeSourceID) REFERENCES IncomeSources (IncomeSourceID),
    FOREIGN KEY (IncomeCategoryID) REFERENCES IncomeCategories (IncomeCategoryID),
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID)
);

CREATE TRIGGER IF NOT EXISTS trigger_incomeschedules_updated_at AFTER UPDATE ON IncomeSchedules
BEGIN
    UPDATE IncomeSchedules SET UpdatedAt = CURRENT_TIMESTAMP WHERE IncomeScheduleID = NEW.IncomeScheduleID;
END;
