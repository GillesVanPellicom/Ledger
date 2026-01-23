-- Add IncomeSourceID and IncomeCategoryID to TopUps to allow proper SQL filtering
ALTER TABLE TopUps ADD COLUMN IncomeSourceID INTEGER REFERENCES IncomeSources(IncomeSourceID);
ALTER TABLE TopUps ADD COLUMN IncomeCategoryID INTEGER REFERENCES IncomeCategories(IncomeCategoryID);

-- Update existing TopUps based on their notes (best effort)
-- This assumes the legacy note format: [Income] SourceName (CategoryName)
UPDATE TopUps
SET IncomeSourceID = (
    SELECT IncomeSourceID
    FROM IncomeSources
    WHERE IncomeSourceName = SUBSTR(TopUpNote, 10, INSTR(TopUpNote || ' (', ' (') - 10)
)
WHERE TopUpNote LIKE '[Income] %';

UPDATE TopUps
SET IncomeCategoryID = (
    SELECT IncomeCategoryID
    FROM IncomeCategories
    WHERE IncomeCategoryName = SUBSTR(TopUpNote, INSTR(TopUpNote, '(') + 1, INSTR(TopUpNote, ')') - INSTR(TopUpNote, '(') - 1)
)
WHERE TopUpNote LIKE '[Income] %' AND TopUpNote LIKE '%(%';
