-- Account-owned imported calendars and read-only subscription snapshots.
CREATE TABLE `calendar_source` (
  `id` VARCHAR(36) NOT NULL, `userId` VARCHAR(36) NOT NULL,
  `sourceKey` CHAR(64) NOT NULL, `name` VARCHAR(100) NOT NULL,
  `color` VARCHAR(30) NOT NULL, `timeZone` VARCHAR(100) NOT NULL,
  `url` TEXT NULL, `content` LONGTEXT NOT NULL,
  `etag` VARCHAR(1000) NULL, `lastModified` VARCHAR(1000) NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true, `version` INTEGER NOT NULL DEFAULT 1,
  `lastCheckedAt` DATETIME(6) NOT NULL, `lastSuccessAt` DATETIME(6) NOT NULL,
  `error` VARCHAR(500) NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `calendar_source_userId_sourceKey_key` (`userId`, `sourceKey`),
  INDEX `calendar_source_userId_idx` (`userId`),
  CONSTRAINT `calendar_source_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `appuser` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
