-- Preserve the index backing the composite account foreign key throughout.
-- Book-row locks enforce one active/committed file hash; cancelled drafts may
-- retain that same provenance hash while a corrected import is staged.
CREATE INDEX `finance_import_batch_bookId_accountId_fileHash_idx` ON `finance_import_batch`(`bookId`, `accountId`, `fileHash`);

DROP INDEX `finance_import_batch_bookId_accountId_fileHash_key` ON `finance_import_batch`;
