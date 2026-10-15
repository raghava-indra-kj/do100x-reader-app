-- Additive only: existing source and comments remain unchanged.
ALTER TABLE `page` ADD COLUMN `documentMetadata` JSON NULL;
ALTER TABLE `comment`
    ADD COLUMN `anchor` JSON NULL,
    ADD COLUMN `anchorRevision` INTEGER NULL,
    ADD COLUMN `resolvedAt` DATETIME(6) NULL;
CREATE INDEX `comment_pageId_idx` ON `comment`(`pageId`);
