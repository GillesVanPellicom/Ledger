CREATE TABLE IF NOT EXISTS Schedules (
    ScheduleID INTEGER PRIMARY KEY AUTOINCREMENT,
    Type TEXT NOT NULL DEFAULT 'income', -- 'income' or 'expense'
    RecipientID INTEGER,
    CategoryID INTEGER,
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
    FOREIGN KEY (RecipientID) REFERENCES Entities (EntityID),
    FOREIGN KEY (CategoryID) REFERENCES Categories (CategoryID),
    FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods (PaymentMethodID),
    FOREIGN KEY (EntityID) REFERENCES Entities (EntityID)
);

CREATE TRIGGER IF NOT EXISTS trigger_schedules_updated_at AFTER UPDATE ON Schedules
BEGIN
    UPDATE Schedules SET UpdatedAt = CURRENT_TIMESTAMP WHERE ScheduleID = NEW.ScheduleID;
END;
