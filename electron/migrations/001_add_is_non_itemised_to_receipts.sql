ALTER TABLE Receipts ADD COLUMN IsNonItemised INTEGER NOT NULL DEFAULT 0;
ALTER TABLE Receipts ADD COLUMN NonItemisedTotal NUMERIC;

CREATE INDEX idx_receipts_is_non_itemised
ON Receipts (IsNonItemised);
