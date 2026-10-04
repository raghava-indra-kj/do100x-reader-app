-- CreateTable
CREATE TABLE `appuser` (
    `id` VARCHAR(36) NOT NULL,
    `displayName` VARCHAR(255) NULL,
    `email` VARCHAR(320) NOT NULL,
    `avatarUrl` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_identity` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `provider` ENUM('GOOGLE') NOT NULL,
    `providerSubject` VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `auth_identity_provider_providerSubject_key`(`provider`, `providerSubject`),
    UNIQUE INDEX `auth_identity_userId_provider_key`(`userId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_login_challenge` (
    `idHash` CHAR(64) NOT NULL,
    `nonceHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(6) NOT NULL,

    INDEX `auth_login_challenge_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`idHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reader_preferences` (
    `userId` VARCHAR(36) NOT NULL,
    `homePageId` VARCHAR(36) NULL,
    `updatedAt` DATETIME(6) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_preferences` (
    `userId` VARCHAR(36) NOT NULL,
    `motivationsEnabled` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(6) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `page` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `parentId` VARCHAR(36) NULL,
    `title` VARCHAR(1000) NOT NULL,
    `content` LONGTEXT NULL,
    `contentVersion` INTEGER NOT NULL DEFAULT 0,
    `category` VARCHAR(255) NULL,
    `sortOrder` INTEGER NOT NULL,
    `childrenCount` INTEGER NOT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(6) NOT NULL,
    `updatedAt` DATETIME(6) NOT NULL,
    `deletedAt` DATETIME(6) NULL,
    `meaningSystemPrompt` TEXT NULL,
    `explanationSystemPrompt` TEXT NULL,
    `doubtSystemPrompt` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE `quiz_option` (
    `id` VARCHAR(36) NOT NULL,
    `questionId` VARCHAR(36) NOT NULL,
    `position` INTEGER NOT NULL,
    `bodyMarkdown` LONGTEXT NOT NULL,
    `isCorrect` BOOLEAN NOT NULL,

    UNIQUE INDEX `quiz_option_questionId_position_key`(`questionId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE `quiz_answer_selection` (
    `answerId` VARCHAR(36) NOT NULL,
    `optionId` VARCHAR(36) NOT NULL,

    INDEX `quiz_answer_selection_optionId_idx`(`optionId`),
    PRIMARY KEY (`answerId`, `optionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
CREATE TABLE `comment` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `pageId` VARCHAR(36) NOT NULL,
    `pageTitle` VARCHAR(1000) NOT NULL,
    `sectionTitle` VARCHAR(1000) NULL,
    `selectedText` TEXT NOT NULL,
    `body` TEXT NOT NULL,
    `linkedPageId` VARCHAR(36) NULL,
    `isExplanation` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(6) NOT NULL,
    `updatedAt` DATETIME(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vocabulary` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `pageId` VARCHAR(36) NOT NULL,
    `term` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_config` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `baseUrl` VARCHAR(500) NOT NULL,
    `apiKey` VARCHAR(500) NOT NULL,
    `explanationModelId` VARCHAR(255) NULL,
    `meaningModelId` VARCHAR(255) NULL,
    `doubtModelId` VARCHAR(255) NULL,
    `meaningSystemPrompt` TEXT NULL,
    `explanationSystemPrompt` TEXT NULL,
    `doubtSystemPrompt` TEXT NULL,

    UNIQUE INDEX `model_config_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_model` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `modelId` VARCHAR(255) NOT NULL,
    `baseUrl` VARCHAR(500) NULL,
    `apiKey` VARCHAR(500) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_list` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `color` VARCHAR(50) NULL,
    `icon` VARCHAR(50) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(6) NOT NULL,
    `updatedAt` DATETIME(6) NOT NULL,
    `deletedAt` DATETIME(6) NULL,

    INDEX `task_list_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `listId` VARCHAR(36) NULL,
    `parentId` VARCHAR(36) NULL,
    `title` VARCHAR(1000) NOT NULL,
    `description` LONGTEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'todo',
    `priority` INTEGER NOT NULL DEFAULT 4,
    `dueDate` DATETIME(6) NULL,
    `dueTime` VARCHAR(10) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `totalTimeSeconds` INTEGER NOT NULL DEFAULT 0,
    `completedAt` DATETIME(6) NULL,
    `createdAt` DATETIME(6) NOT NULL,
    `updatedAt` DATETIME(6) NOT NULL,
    `deletedAt` DATETIME(6) NULL,

    INDEX `task_userId_idx`(`userId`),
    INDEX `task_listId_idx`(`listId`),
    INDEX `task_parentId_idx`(`parentId`),
    INDEX `task_status_idx`(`status`),
    INDEX `task_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `time_session` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `taskId` VARCHAR(36) NOT NULL,
    `startTime` DATETIME(6) NOT NULL,
    `endTime` DATETIME(6) NULL,
    `durationSeconds` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL,
    `updatedAt` DATETIME(6) NOT NULL,

    INDEX `time_session_userId_idx`(`userId`),
    INDEX `time_session_taskId_idx`(`taskId`),
    INDEX `time_session_startTime_idx`(`startTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `active_timer` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `taskId` VARCHAR(36) NOT NULL,
    `startTime` DATETIME(6) NOT NULL,
    `accumulatedSeconds` INTEGER NOT NULL DEFAULT 0,
    `isPaused` BOOLEAN NOT NULL DEFAULT false,
    `pausedAt` DATETIME(6) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL,
    `updatedAt` DATETIME(6) NOT NULL,

    UNIQUE INDEX `active_timer_userId_key`(`userId`),
    INDEX `active_timer_taskId_idx`(`taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_identity` ADD CONSTRAINT `auth_identity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `appuser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reader_preferences` ADD CONSTRAINT `reader_preferences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `appuser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reader_preferences` ADD CONSTRAINT `reader_preferences_homePageId_fkey` FOREIGN KEY (`homePageId`) REFERENCES `page`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz` ADD CONSTRAINT `quiz_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `page`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_revision` ADD CONSTRAINT `quiz_revision_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `quiz`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_question` ADD CONSTRAINT `quiz_question_revisionId_fkey` FOREIGN KEY (`revisionId`) REFERENCES `quiz_revision`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_option` ADD CONSTRAINT `quiz_option_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `quiz_question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempt` ADD CONSTRAINT `quiz_attempt_revisionId_fkey` FOREIGN KEY (`revisionId`) REFERENCES `quiz_revision`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempt` ADD CONSTRAINT `quiz_attempt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `appuser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempt_answer` ADD CONSTRAINT `quiz_attempt_answer_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `quiz_attempt`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempt_answer` ADD CONSTRAINT `quiz_attempt_answer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `quiz_question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_answer_selection` ADD CONSTRAINT `quiz_answer_selection_answerId_fkey` FOREIGN KEY (`answerId`) REFERENCES `quiz_attempt_answer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_answer_selection` ADD CONSTRAINT `quiz_answer_selection_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `quiz_option`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_answer_evaluation` ADD CONSTRAINT `quiz_answer_evaluation_answerId_fkey` FOREIGN KEY (`answerId`) REFERENCES `quiz_attempt_answer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
