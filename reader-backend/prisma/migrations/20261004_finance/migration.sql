-- CreateTable
CREATE TABLE `finance_book` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `currencyScale` TINYINT UNSIGNED NOT NULL,
    `timezone` VARCHAR(100) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `requestKey` VARCHAR(36) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `archivedAt` DATETIME(6) NULL,

    INDEX `finance_book_userId_archivedAt_idx`(`userId`, `archivedAt`),
    UNIQUE INDEX `finance_book_userId_requestKey_key`(`userId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_account` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `tracksDebt` BOOLEAN NOT NULL DEFAULT false,
    `isLiquid` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `requestKey` VARCHAR(36) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,
    `archivedAt` DATETIME(6) NULL,

    INDEX `finance_account_bookId_archivedAt_idx`(`bookId`, `archivedAt`),
    UNIQUE INDEX `finance_account_bookId_id_key`(`bookId`, `id`),
    UNIQUE INDEX `finance_account_bookId_requestKey_key`(`bookId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_category` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `kind` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `parentId` VARCHAR(36) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `requestKey` VARCHAR(36) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `archivedAt` DATETIME(6) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `finance_category_bookId_archivedAt_idx`(`bookId`, `archivedAt`),
    UNIQUE INDEX `finance_category_bookId_id_key`(`bookId`, `id`),
    UNIQUE INDEX `finance_category_bookId_requestKey_key`(`bookId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_transaction` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `kind` ENUM('INCOME', 'EXPENSE', 'TRANSFER', 'REFUND', 'ADJUSTMENT') NOT NULL,
    `status` ENUM('PENDING', 'POSTED') NOT NULL DEFAULT 'POSTED',
    `date` DATE NOT NULL,
    `description` VARCHAR(1000) NOT NULL,
    `merchant` VARCHAR(255) NULL,
    `paymentMethod` VARCHAR(100) NULL,
    `bankReference` VARCHAR(255) NULL,
    `notesMarkdown` LONGTEXT NULL,
    `tags` JSON NOT NULL,
    `refundOfId` VARCHAR(36) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `requestKey` VARCHAR(36) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `source` VARCHAR(20) NOT NULL,
    `deletedAt` DATETIME(6) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `finance_transaction_bookId_date_deletedAt_idx`(`bookId`, `date`, `deletedAt`),
    UNIQUE INDEX `finance_transaction_bookId_id_key`(`bookId`, `id`),
    UNIQUE INDEX `finance_transaction_bookId_requestKey_key`(`bookId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_movement` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `transactionId` VARCHAR(36) NOT NULL,
    `accountId` VARCHAR(36) NOT NULL,
    `amountMinor` BIGINT NOT NULL,
    `effectiveDate` DATE NOT NULL,
    `cleared` BOOLEAN NOT NULL DEFAULT false,
    `reconciliationId` VARCHAR(36) NULL,

    INDEX `finance_movement_bookId_accountId_effectiveDate_idx`(`bookId`, `accountId`, `effectiveDate`),
    UNIQUE INDEX `finance_movement_bookId_id_key`(`bookId`, `id`),
    UNIQUE INDEX `finance_movement_transactionId_accountId_key`(`transactionId`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_split` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `transactionId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NOT NULL,
    `amountMinor` BIGINT NOT NULL,

    INDEX `finance_split_bookId_categoryId_idx`(`bookId`, `categoryId`),
    UNIQUE INDEX `finance_split_transactionId_categoryId_key`(`transactionId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_schedule` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `kind` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    `accountId` VARCHAR(36) NULL,
    `destinationAccountId` VARCHAR(36) NULL,
    `categoryId` VARCHAR(36) NULL,
    `frequency` ENUM('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY') NOT NULL,
    `interval` INTEGER NOT NULL DEFAULT 1,
    `monthEnd` BOOLEAN NOT NULL DEFAULT false,
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `lowMinor` BIGINT NOT NULL,
    `expectedMinor` BIGINT NOT NULL,
    `highMinor` BIGINT NOT NULL,
    `notesMarkdown` LONGTEXT NULL,
    `paused` BOOLEAN NOT NULL DEFAULT false,
    `archivedAt` DATETIME(6) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `requestKey` VARCHAR(36) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `finance_schedule_bookId_archivedAt_idx`(`bookId`, `archivedAt`),
    UNIQUE INDEX `finance_schedule_bookId_id_key`(`bookId`, `id`),
    UNIQUE INDEX `finance_schedule_bookId_requestKey_key`(`bookId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_occurrence` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `scheduleId` VARCHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `kind` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    `accountId` VARCHAR(36) NULL,
    `destinationAccountId` VARCHAR(36) NULL,
    `categoryId` VARCHAR(36) NULL,
    `lowMinor` BIGINT NOT NULL,
    `expectedMinor` BIGINT NOT NULL,
    `highMinor` BIGINT NOT NULL,
    `state` ENUM('OPEN', 'SKIPPED') NOT NULL DEFAULT 'OPEN',
    `notesMarkdown` LONGTEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `finance_occurrence_bookId_date_idx`(`bookId`, `date`),
    UNIQUE INDEX `finance_occurrence_bookId_id_key`(`bookId`, `id`),
    UNIQUE INDEX `finance_occurrence_scheduleId_date_key`(`scheduleId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_occurrence_payment` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `occurrenceId` VARCHAR(36) NOT NULL,
    `movementId` VARCHAR(36) NOT NULL,
    `appliedMinor` BIGINT NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `finance_occurrence_payment_occurrenceId_movementId_key`(`occurrenceId`, `movementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_budget` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NOT NULL,
    `month` DATE NOT NULL,
    `amountMinor` BIGINT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `finance_budget_bookId_categoryId_month_key`(`bookId`, `categoryId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_spending_estimate` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NOT NULL,
    `lowMinor` BIGINT NOT NULL,
    `expectedMinor` BIGINT NOT NULL,
    `highMinor` BIGINT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `finance_spending_estimate_bookId_categoryId_key`(`bookId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_import_batch` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `accountId` VARCHAR(36) NOT NULL,
    `sourceName` VARCHAR(255) NOT NULL,
    `fileHash` CHAR(64) NULL,
    `status` ENUM('DRAFT', 'COMMITTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `periodStart` DATE NULL,
    `periodEnd` DATE NULL,
    `openingMinor` BIGINT NULL,
    `closingMinor` BIGINT NULL,
    `totalCreditMinor` BIGINT NULL,
    `totalDebitMinor` BIGINT NULL,
    `expectedRowCount` INTEGER NULL,
    `balanceVerified` BOOLEAN NOT NULL DEFAULT false,
    `summary` JSON NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `requestKey` VARCHAR(36) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `committedAt` DATETIME(6) NULL,

    INDEX `finance_import_batch_bookId_createdAt_idx`(`bookId`, `createdAt`),
    UNIQUE INDEX `finance_import_batch_bookId_id_key`(`bookId`, `id`),
    UNIQUE INDEX `finance_import_batch_bookId_requestKey_key`(`bookId`, `requestKey`),
    UNIQUE INDEX `finance_import_batch_bookId_accountId_fileHash_key`(`bookId`, `accountId`, `fileHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_import_row` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `batchId` VARCHAR(36) NOT NULL,
    `position` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `amountMinor` BIGINT NOT NULL,
    `description` VARCHAR(1000) NOT NULL,
    `externalId` VARCHAR(255) NULL,
    `payload` JSON NOT NULL,
    `decision` ENUM('UNRESOLVED', 'NEW', 'MATCH', 'SKIP') NOT NULL DEFAULT 'UNRESOLVED',
    `resolution` JSON NULL,
    `candidateIds` JSON NOT NULL,
    `fingerprint` CHAR(64) NOT NULL,
    `committedMovementId` VARCHAR(36) NULL,

    INDEX `finance_import_row_bookId_fingerprint_idx`(`bookId`, `fingerprint`),
    UNIQUE INDEX `finance_import_row_bookId_id_key`(`bookId`, `id`),
    UNIQUE INDEX `finance_import_row_batchId_position_key`(`batchId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_source_record` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `accountId` VARCHAR(36) NOT NULL,
    `movementId` VARCHAR(36) NOT NULL,
    `importRowId` VARCHAR(36) NOT NULL,
    `externalKey` CHAR(64) NULL,
    `sourceDescription` VARCHAR(1000) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `finance_source_record_bookId_importRowId_key`(`bookId`, `importRowId`),
    UNIQUE INDEX `finance_source_record_bookId_accountId_externalKey_key`(`bookId`, `accountId`, `externalKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_reconciliation` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `accountId` VARCHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `statementMinor` BIGINT NOT NULL,
    `ledgerMinor` BIGINT NOT NULL,
    `notes` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `reopenedAt` DATETIME(6) NULL,

    INDEX `finance_reconciliation_bookId_accountId_date_idx`(`bookId`, `accountId`, `date`),
    UNIQUE INDEX `finance_reconciliation_bookId_id_key`(`bookId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_rule` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `categoryId` VARCHAR(36) NOT NULL,
    `matchText` VARCHAR(255) NOT NULL,
    `merchantName` VARCHAR(255) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `finance_rule_bookId_idx`(`bookId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_change` (
    `id` VARCHAR(36) NOT NULL,
    `bookId` VARCHAR(36) NOT NULL,
    `actorId` VARCHAR(36) NOT NULL,
    `source` VARCHAR(20) NOT NULL,
    `entityType` VARCHAR(40) NOT NULL,
    `entityId` VARCHAR(36) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `finance_change_bookId_createdAt_idx`(`bookId`, `createdAt`),
    INDEX `finance_change_bookId_entityType_entityId_idx`(`bookId`, `entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `finance_book` ADD CONSTRAINT `finance_book_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `appuser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_account` ADD CONSTRAINT `finance_account_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `finance_book`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_category` ADD CONSTRAINT `finance_category_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `finance_book`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_category` ADD CONSTRAINT `finance_category_bookId_parentId_fkey` FOREIGN KEY (`bookId`, `parentId`) REFERENCES `finance_category`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_transaction` ADD CONSTRAINT `finance_transaction_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `finance_book`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_transaction` ADD CONSTRAINT `finance_transaction_bookId_refundOfId_fkey` FOREIGN KEY (`bookId`, `refundOfId`) REFERENCES `finance_transaction`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_movement` ADD CONSTRAINT `finance_movement_bookId_transactionId_fkey` FOREIGN KEY (`bookId`, `transactionId`) REFERENCES `finance_transaction`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_movement` ADD CONSTRAINT `finance_movement_bookId_accountId_fkey` FOREIGN KEY (`bookId`, `accountId`) REFERENCES `finance_account`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_movement` ADD CONSTRAINT `finance_movement_bookId_reconciliationId_fkey` FOREIGN KEY (`bookId`, `reconciliationId`) REFERENCES `finance_reconciliation`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_split` ADD CONSTRAINT `finance_split_bookId_transactionId_fkey` FOREIGN KEY (`bookId`, `transactionId`) REFERENCES `finance_transaction`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_split` ADD CONSTRAINT `finance_split_bookId_categoryId_fkey` FOREIGN KEY (`bookId`, `categoryId`) REFERENCES `finance_category`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_schedule` ADD CONSTRAINT `finance_schedule_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `finance_book`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_schedule` ADD CONSTRAINT `finance_schedule_bookId_accountId_fkey` FOREIGN KEY (`bookId`, `accountId`) REFERENCES `finance_account`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_schedule` ADD CONSTRAINT `finance_schedule_bookId_destinationAccountId_fkey` FOREIGN KEY (`bookId`, `destinationAccountId`) REFERENCES `finance_account`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_schedule` ADD CONSTRAINT `finance_schedule_bookId_categoryId_fkey` FOREIGN KEY (`bookId`, `categoryId`) REFERENCES `finance_category`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_occurrence` ADD CONSTRAINT `finance_occurrence_bookId_scheduleId_fkey` FOREIGN KEY (`bookId`, `scheduleId`) REFERENCES `finance_schedule`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_occurrence` ADD CONSTRAINT `finance_occurrence_bookId_accountId_fkey` FOREIGN KEY (`bookId`, `accountId`) REFERENCES `finance_account`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_occurrence` ADD CONSTRAINT `finance_occurrence_bookId_destinationAccountId_fkey` FOREIGN KEY (`bookId`, `destinationAccountId`) REFERENCES `finance_account`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_occurrence` ADD CONSTRAINT `finance_occurrence_bookId_categoryId_fkey` FOREIGN KEY (`bookId`, `categoryId`) REFERENCES `finance_category`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_occurrence_payment` ADD CONSTRAINT `finance_occurrence_payment_bookId_occurrenceId_fkey` FOREIGN KEY (`bookId`, `occurrenceId`) REFERENCES `finance_occurrence`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_occurrence_payment` ADD CONSTRAINT `finance_occurrence_payment_bookId_movementId_fkey` FOREIGN KEY (`bookId`, `movementId`) REFERENCES `finance_movement`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_budget` ADD CONSTRAINT `finance_budget_bookId_categoryId_fkey` FOREIGN KEY (`bookId`, `categoryId`) REFERENCES `finance_category`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_spending_estimate` ADD CONSTRAINT `finance_spending_estimate_bookId_categoryId_fkey` FOREIGN KEY (`bookId`, `categoryId`) REFERENCES `finance_category`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_import_batch` ADD CONSTRAINT `finance_import_batch_bookId_accountId_fkey` FOREIGN KEY (`bookId`, `accountId`) REFERENCES `finance_account`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_import_row` ADD CONSTRAINT `finance_import_row_bookId_batchId_fkey` FOREIGN KEY (`bookId`, `batchId`) REFERENCES `finance_import_batch`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_source_record` ADD CONSTRAINT `finance_source_record_bookId_accountId_fkey` FOREIGN KEY (`bookId`, `accountId`) REFERENCES `finance_account`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_source_record` ADD CONSTRAINT `finance_source_record_bookId_movementId_fkey` FOREIGN KEY (`bookId`, `movementId`) REFERENCES `finance_movement`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_source_record` ADD CONSTRAINT `finance_source_record_bookId_importRowId_fkey` FOREIGN KEY (`bookId`, `importRowId`) REFERENCES `finance_import_row`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_reconciliation` ADD CONSTRAINT `finance_reconciliation_bookId_accountId_fkey` FOREIGN KEY (`bookId`, `accountId`) REFERENCES `finance_account`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_rule` ADD CONSTRAINT `finance_rule_bookId_categoryId_fkey` FOREIGN KEY (`bookId`, `categoryId`) REFERENCES `finance_category`(`bookId`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `finance_change` ADD CONSTRAINT `finance_change_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `finance_book`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
