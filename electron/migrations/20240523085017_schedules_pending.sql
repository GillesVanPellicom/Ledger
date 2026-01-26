CREATE TABLE IF NOT EXISTS SchedulesPending (
    SchedulePendingID INTEGER PRIMARY KEY AUTOINCREMENT,
    ScheduleID INTEGER NOT NULL,
    PlannedDate TEXT NOT NULL,
    Amount REAL,
    Status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, rejected
    CreationTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ScheduleID) REFERENCES Schedules (ScheduleID) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS trigger_schedulespending_updated_at AFTER UPDATE ON SchedulesPending
BEGIN
    UPDATE SchedulesPending SET UpdatedAt = CURRENT_TIMESTAMP WHERE SchedulePendingID = NEW.SchedulePendingID;
END;
