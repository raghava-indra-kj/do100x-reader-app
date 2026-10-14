-- Additive upgrade. Existing dates, notes, time logs and habit records are preserved.
ALTER TABLE `task` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

CREATE TABLE `calendar_event` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `taskId` VARCHAR(36) NULL,
  `habitId` VARCHAR(36) NULL,
  `requestKey` VARCHAR(36) NOT NULL,
  `requestHash` CHAR(64) NOT NULL,
  `title` VARCHAR(1000) NOT NULL,
  `description` TEXT NOT NULL,
  `location` VARCHAR(1000) NOT NULL,
  `color` VARCHAR(30) NOT NULL,
  `timeZone` VARCHAR(100) NOT NULL,
  `startLocal` CHAR(16) NOT NULL,
  `endLocal` CHAR(16) NOT NULL,
  `startUtc` DATETIME(6) NOT NULL,
  `endUtc` DATETIME(6) NOT NULL,
  `allDay` BOOLEAN NOT NULL DEFAULT false,
  `recurrence` JSON NULL,
  `reminders` JSON NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL,
  `deletedAt` DATETIME(6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `calendar_event_userId_id_key` (`userId`, `id`),
  UNIQUE INDEX `calendar_event_userId_requestKey_key` (`userId`, `requestKey`),
  INDEX `calendar_event_userId_startUtc_endUtc_idx` (`userId`, `startUtc`, `endUtc`),
  INDEX `calendar_event_userId_taskId_idx` (`userId`, `taskId`),
  INDEX `calendar_event_userId_habitId_idx` (`userId`, `habitId`),
  CONSTRAINT `calendar_event_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `appuser` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `calendar_event_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `calendar_event_habitId_fkey` FOREIGN KEY (`habitId`) REFERENCES `habit` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `calendar_occurrence` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `eventId` VARCHAR(36) NOT NULL,
  `date` CHAR(10) NOT NULL,
  `startLocal` CHAR(16) NULL,
  `endLocal` CHAR(16) NULL,
  `allDay` BOOLEAN NULL,
  `completed` BOOLEAN NOT NULL DEFAULT false,
  `cancelled` BOOLEAN NOT NULL DEFAULT false,
  `version` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `calendar_occurrence_eventId_date_key` (`eventId`, `date`),
  INDEX `calendar_occurrence_userId_date_idx` (`userId`, `date`),
  CONSTRAINT `calendar_occurrence_userId_eventId_fkey` FOREIGN KEY (`userId`, `eventId`) REFERENCES `calendar_event` (`userId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `calendar_settings` (
  `userId` VARCHAR(36) NOT NULL,
  `preferences` JSON NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,
  `updatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`userId`),
  CONSTRAINT `calendar_settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `appuser` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
