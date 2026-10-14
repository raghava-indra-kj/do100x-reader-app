-- Additive only. Existing pages remain permanent (captureExpiresAt = NULL).
-- Prepared locally; do not apply to production as part of a frontend release.
ALTER TABLE `page`
  ADD COLUMN `captureExpiresAt` DATETIME(6) NULL,
  ADD COLUMN `captureKey` VARCHAR(36) NULL,
  ADD COLUMN `captureSourceUrl` VARCHAR(2048) NULL;
CREATE UNIQUE INDEX `page_userId_captureKey_key` ON `page`(`userId`, `captureKey`);
CREATE INDEX `page_captureExpiresAt_id_idx` ON `page`(`captureExpiresAt`, `id`);
