CREATE TABLE IF NOT EXISTS PendingIncomes (
    PendingIncomeID INTEGER PRIMARY KEY AUTOINCREMENT,
    IncomeScheduleID INTEGER NOT NULL,
    PlannedDate TEXT NOT NULL,
    Amount REAL,
    Status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, rejected
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (IncomeScheduleID) REFERENCES IncomeSchedules (IncomeScheduleID) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS trigger_pendingincomes_updated_at AFTER UPDATE ON PendingIncomes
BEGIN
    UPDATE PendingIncomes SET UpdatedAt = CURRENT_TIMESTAMP WHERE PendingIncomeID = NEW.PendingIncomeID;
END;
