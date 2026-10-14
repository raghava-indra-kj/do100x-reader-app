-- Additive only. No existing app tables or records are changed.
CREATE TABLE `habit` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `requestKey` VARCHAR(36) NOT NULL,
  `requestHash` CHAR(64) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `description` VARCHAR(1000) NOT NULL,
  `icon` VARCHAR(30) NOT NULL,
  `color` VARCHAR(20) NOT NULL,
  `section` VARCHAR(80) NOT NULL,
  `timezone` VARCHAR(100) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `version` INTEGER NOT NULL DEFAULT 1,
  `plans` JSON NOT NULL,
  `pauses` JSON NOT NULL,
  `archivedAt` DATETIME(6) NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `habit_userId_requestKey_key` (`userId`, `requestKey`),
  UNIQUE INDEX `habit_userId_id_key` (`userId`, `id`),
  INDEX `habit_userId_sortOrder_idx` (`userId`, `sortOrder`),
  CONSTRAINT `habit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `appuser` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `habit_log` (
  `id` VARCHAR(36) NOT NULL,
  `habitId` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `date` CHAR(10) NOT NULL,
  `value` DECIMAL(12, 3) NOT NULL,
  `status` VARCHAR(12) NOT NULL,
  `note` TEXT NOT NULL,
  `mood` TINYINT UNSIGNED NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `habit_log_habitId_date_key` (`habitId`, `date`),
  INDEX `habit_log_userId_date_idx` (`userId`, `date`),
  CONSTRAINT `habit_log_userId_habitId_fkey` FOREIGN KEY (`userId`, `habitId`) REFERENCES `habit` (`userId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
