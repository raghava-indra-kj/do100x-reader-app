DROP TABLE IF EXISTS `page_annotation`;

ALTER TABLE `model_config`
    DROP COLUMN `annotationModelId`,
    DROP COLUMN `annotationSystemPrompt`;
