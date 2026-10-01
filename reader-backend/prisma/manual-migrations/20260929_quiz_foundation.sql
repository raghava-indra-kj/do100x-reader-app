-- Additive quiz foundation for databases already managed by prisma db push.
-- Apply exactly once with `npx prisma db execute --file prisma/manual-migrations/20260929_quiz_foundation.sql --schema prisma/schema.prisma`.
-- Do not use migrate reset, force-reset, or accept-data-loss for this change.

CREATE TABLE `quiz` (
    `id` VARCHAR(36) NOT NULL,
    `pageId` VARCHAR(36) NOT NULL,
    `currentRevisionNo` INTEGER NOT NULL DEFAULT 1,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `archivedAt` DATETIME(6) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `quiz_pageId_archivedAt_sortOrder_idx`(`pageId`, `archivedAt`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quiz_revision` (
    `id` VARCHAR(36) NOT NULL,
    `quizId` VARCHAR(36) NOT NULL,
    `revisionNo` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `instructionsMarkdown` LONGTEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `quiz_revision_quizId_revisionNo_key`(`quizId`, `revisionNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quiz_question` (
    `id` VARCHAR(36) NOT NULL,
    `revisionId` VARCHAR(36) NOT NULL,
    `position` INTEGER NOT NULL,
    `kind` ENUM('OBJECTIVE', 'SUBJECTIVE') NOT NULL,
    `selectionMode` ENUM('SINGLE', 'MULTIPLE') NULL,
    `responseLength` ENUM('SHORT', 'LONG') NULL,
    `promptMarkdown` LONGTEXT NOT NULL,
    `referenceAnswerMarkdown` LONGTEXT NULL,
    `explanationMarkdown` LONGTEXT NOT NULL,

    UNIQUE INDEX `quiz_question_revisionId_position_key`(`revisionId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quiz_option` (
    `id` VARCHAR(36) NOT NULL,
    `questionId` VARCHAR(36) NOT NULL,
    `position` INTEGER NOT NULL,
    `bodyMarkdown` LONGTEXT NOT NULL,
    `isCorrect` BOOLEAN NOT NULL,

    UNIQUE INDEX `quiz_option_questionId_position_key`(`questionId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quiz_attempt` (
    `id` VARCHAR(36) NOT NULL,
    `revisionId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `status` ENUM('IN_PROGRESS', 'SUBMITTED') NOT NULL DEFAULT 'IN_PROGRESS',
    `startRequestKey` VARCHAR(36) NOT NULL,
    `startedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `submittedAt` DATETIME(6) NULL,

    INDEX `quiz_attempt_userId_startedAt_idx`(`userId`, `startedAt`),
    INDEX `quiz_attempt_revisionId_idx`(`revisionId`),
    UNIQUE INDEX `quiz_attempt_userId_startRequestKey_key`(`userId`, `startRequestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quiz_attempt_answer` (
    `id` VARCHAR(36) NOT NULL,
    `attemptId` VARCHAR(36) NOT NULL,
    `questionId` VARCHAR(36) NOT NULL,
    `responseMarkdown` LONGTEXT NULL,
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `quiz_attempt_answer_questionId_idx`(`questionId`),
    UNIQUE INDEX `quiz_attempt_answer_attemptId_questionId_key`(`attemptId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quiz_answer_selection` (
    `answerId` VARCHAR(36) NOT NULL,
    `optionId` VARCHAR(36) NOT NULL,

    INDEX `quiz_answer_selection_optionId_idx`(`optionId`),
    PRIMARY KEY (`answerId`, `optionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `quiz_answer_evaluation` (
    `id` VARCHAR(36) NOT NULL,
    `answerId` VARCHAR(36) NOT NULL,
    `requestKey` VARCHAR(36) NOT NULL,
    `source` ENUM('OBJECTIVE', 'AI') NOT NULL,
    `verdict` ENUM('CORRECT', 'PARTIAL', 'INCORRECT', 'UNANSWERED', 'NEEDS_REVIEW') NOT NULL,
    `scorePercent` INTEGER NULL,
    `feedbackMarkdown` LONGTEXT NOT NULL,
    `modelId` VARCHAR(255) NULL,
    `promptVersion` VARCHAR(50) NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    INDEX `quiz_answer_evaluation_answerId_createdAt_idx`(`answerId`, `createdAt`),
    UNIQUE INDEX `quiz_answer_evaluation_answerId_requestKey_key`(`answerId`, `requestKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `quiz` ADD CONSTRAINT `quiz_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `page`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quiz_revision` ADD CONSTRAINT `quiz_revision_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `quiz`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quiz_question` ADD CONSTRAINT `quiz_question_revisionId_fkey` FOREIGN KEY (`revisionId`) REFERENCES `quiz_revision`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quiz_option` ADD CONSTRAINT `quiz_option_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `quiz_question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quiz_attempt` ADD CONSTRAINT `quiz_attempt_revisionId_fkey` FOREIGN KEY (`revisionId`) REFERENCES `quiz_revision`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quiz_attempt` ADD CONSTRAINT `quiz_attempt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `appuser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quiz_attempt_answer` ADD CONSTRAINT `quiz_attempt_answer_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `quiz_attempt`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quiz_attempt_answer` ADD CONSTRAINT `quiz_attempt_answer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `quiz_question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quiz_answer_selection` ADD CONSTRAINT `quiz_answer_selection_answerId_fkey` FOREIGN KEY (`answerId`) REFERENCES `quiz_attempt_answer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quiz_answer_selection` ADD CONSTRAINT `quiz_answer_selection_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `quiz_option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `quiz_answer_evaluation` ADD CONSTRAINT `quiz_answer_evaluation_answerId_fkey` FOREIGN KEY (`answerId`) REFERENCES `quiz_attempt_answer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
