-- Merged into 20240523085008_topups.sql
-- This file is kept for migration history but its content is now part of the main table definition.
-- Original content:
-- ALTER TABLE TopUps ADD COLUMN IncomeSourceID INTEGER REFERENCES IncomeSources(IncomeSourceID);
-- ALTER TABLE TopUps ADD COLUMN IncomeCategoryID INTEGER REFERENCES IncomeCategories(IncomeCategoryID);

-- Update existing Income based on their notes (best effort)
-- This assumes the legacy note format: [Income] SourceName (CategoryName)
UPDATE Income
SET IncomeSourceID = (
    SELECT IncomeSourceID
    FROM IncomeSources
    WHERE IncomeSourceName = SUBSTR(IncomeNote, 10, INSTR(IncomeNote || ' (', ' (') - 10)
)
WHERE IncomeNote LIKE '[Income] %';

UPDATE Income
SET IncomeCategoryID = (
    SELECT IncomeCategoryID
    FROM IncomeCategories
    WHERE IncomeCategoryName = SUBSTR(IncomeNote, INSTR(IncomeNote, '(') + 1, INSTR(IncomeNote, ')') - INSTR(IncomeNote, '(') - 1)
)
WHERE IncomeNote LIKE '[Income] %' AND IncomeNote LIKE '%(%';
