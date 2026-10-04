-- Personal words have no page dependency. Binary collation keeps US distinct from us.
ALTER TABLE `vocabulary`
  ADD COLUMN `normalizedTerm` VARCHAR(255) COLLATE utf8mb4_bin NULL,
  ADD COLUMN `explanationMarkdown` LONGTEXT NULL,
  ADD COLUMN `difficulty` ENUM('unrated','easy','medium','difficult') NOT NULL DEFAULT 'unrated',
  ADD COLUMN `usageFrequency` ENUM('frequent','occasional','rare','unrated') NOT NULL DEFAULT 'unrated',
  ADD COLUMN `learningStatus` ENUM('learning','learned') NOT NULL DEFAULT 'learning',
  ADD COLUMN `practiceText` TEXT NULL,
  ADD COLUMN `lastReviewedAt` DATETIME(6) NULL,
  ADD COLUMN `updatedAt` DATETIME(6) NULL,
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;
UPDATE `vocabulary` SET `normalizedTerm` = TRIM(`term`), `term` = TRIM(`term`),
  `practiceText` = '', `updatedAt` = `createdAt`;
-- Keep the earliest save, breaking timestamp ties by ID. Existing rows have
-- no learning content to merge. Do not combine case variants or word forms.
DELETE newer FROM `vocabulary` newer
INNER JOIN `vocabulary` older
  ON newer.`userId` = older.`userId`
  AND newer.`normalizedTerm` = older.`normalizedTerm`
  AND (newer.`createdAt` > older.`createdAt`
    OR (newer.`createdAt` = older.`createdAt` AND newer.`id` > older.`id`));
ALTER TABLE `vocabulary`
  DROP COLUMN `pageId`,
  MODIFY `normalizedTerm` VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
  MODIFY `practiceText` TEXT NOT NULL,
  MODIFY `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  MODIFY `updatedAt` DATETIME(6) NOT NULL,
  ADD UNIQUE INDEX `vocabulary_userId_normalizedTerm_key` (`userId`, `normalizedTerm`),
  ADD INDEX `vocabulary_userId_createdAt_id_idx` (`userId`, `createdAt`, `id`);
