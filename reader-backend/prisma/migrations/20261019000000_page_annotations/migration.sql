-- Additive only: existing pages, comments and model settings remain unchanged.
ALTER TABLE `model_config`
    ADD COLUMN `annotationModelId` VARCHAR(255) NULL,
    ADD COLUMN `annotationSystemPrompt` TEXT NULL;

CREATE TABLE `page_annotation` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `pageId` VARCHAR(36) NOT NULL,
    `anchor` JSON NOT NULL,
    `kind` VARCHAR(40) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `format` VARCHAR(20) NOT NULL DEFAULT 'markdown',
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `placement` VARCHAR(10) NULL,
    `sourceHash` CHAR(64) NULL,
    `origin` VARCHAR(10) NOT NULL DEFAULT 'ai',
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `page_annotation_pageId_userId_displayOrder_idx`(`pageId`, `userId`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `page_annotation` ADD CONSTRAINT `page_annotation_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `page`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
