-- Add optional DebtorID to TopUps and IncomeSchedules to provide extra context for income.
-- NOTE: Income associated with an entity this way is for informational purposes only.
-- It does NOT settle any outstanding debts for that entity.
-- To settle debt, a Repayment must be recorded.

ALTER TABLE TopUps ADD COLUMN DebtorID INTEGER REFERENCES Debtors(DebtorID);
ALTER TABLE IncomeSchedules ADD COLUMN DebtorID INTEGER REFERENCES Debtors(DebtorID);
