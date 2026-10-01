-- Widen existing fields without changing account values or deleting rows.
ALTER TABLE `appuser`
    MODIFY COLUMN `username` VARCHAR(255) NOT NULL,
    MODIFY COLUMN `password` VARCHAR(255) NOT NULL;
