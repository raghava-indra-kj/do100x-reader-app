-- Additive only: existing model settings remain unchanged.
ALTER TABLE `model_config`
    ADD COLUMN `formatModelId` VARCHAR(255) NULL,
    ADD COLUMN `formatSystemPrompt` TEXT NULL;
