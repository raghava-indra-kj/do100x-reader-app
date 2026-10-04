import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { prisma } from '../../prisma';
import { accountSchema, accountUpdateSchema, archiveSchema, bookSchema, bookUpdateSchema, bulkCategorySchema, categorySchema, categoryUpdateSchema, date, querySchema, reconcileSchema, reopenSchema, transactionSchema, transactionUpdateSchema, uuid } from '../../finance/contract';
import { type Actor, type FinanceDb } from '../../finance/context';
import { createAccount, createBook, createCategory, getCatalog, listBooks, updateAccount, updateBook, updateCategory } from '../../finance/catalog-service';
import { accountBalances, bulkCategorize, createTransaction, deleteTransaction, getTransaction, listChanges, listTransactions, updateTransaction } from '../../finance/ledger-service';
import { listReconciliations, reconcileAccount, reopenReconciliation } from '../../finance/reconciliation-service';

import { financeTool, registerFinanceTool as register } from './finance-tool';
import { registerFinancePlanTools } from './finance-plans';
import { registerFinanceImportTools } from './finance-imports';
import { registerFinanceReportTools } from './finance-reports';

/** One existing MCP server and unchanged bound-user access model. */
export function registerFinanceTools(server: McpServer, userId: string, db: FinanceDb = prisma) {
  const actor: Actor = { userId, source: 'MCP' };
  registerFinancePlanTools(server, actor, db);
  registerFinanceImportTools(server, actor, db);
  registerFinanceReportTools(server, actor, db);
  register(server, 'finance_list_books', 'List your private Finance books, including archived books.', {}, () => financeTool(() => listBooks(db, userId)));
  register(server, 'finance_create_book', 'Create a private book with one immutable currency and a calendar timezone. Reuse the UUID requestKey on exact retries.', { book: bookSchema }, ({ book }) => financeTool(() => createBook(db, actor, book)));
  register(server, 'finance_update_book', 'Rename, change timezone or archive/restore a book. Use its current expectedVersion.', { bookId: uuid, changes: bookUpdateSchema }, ({ bookId, changes }) => financeTool(() => updateBook(db, actor, bookId, changes)));
  register(server, 'finance_get_catalog', 'Get book precision/timezone and all freely named accounts and hierarchical categories. Archived records remain available for history.', { bookId: uuid }, ({ bookId }) => financeTool(() => getCatalog(db, userId, bookId)));
  register(server, 'finance_create_account', 'Create any freely named cash, bank or debt account. Negative debt opening balances are allowed; opening balances are corrections, not income.', { bookId: uuid, account: accountSchema }, ({ bookId, account }) => financeTool(() => createAccount(db, actor, bookId, account)));
  register(server, 'finance_update_account', 'Update metadata or archive/restore an account without rewriting its balance or history.', { bookId: uuid, accountId: uuid, changes: accountUpdateSchema }, ({ bookId, accountId, changes }) => financeTool(() => updateAccount(db, actor, bookId, accountId, changes)));
  register(server, 'finance_create_category', 'Create an income or expense category; optional parent must belong to the same book/type.', { bookId: uuid, category: categorySchema }, ({ bookId, category }) => financeTool(() => createCategory(db, actor, bookId, category)));
  register(server, 'finance_update_category', 'Rename/reparent/archive a category with cycle protection and a version precondition.', { bookId: uuid, categoryId: uuid, changes: categoryUpdateSchema }, ({ bookId, categoryId, changes }) => financeTool(() => updateCategory(db, actor, bookId, categoryId, changes)));
  register(server, 'finance_get_balances', 'Get posted, pending, projected and cleared balances as exact minor-unit strings. Optional asOf filters movement dates.', { bookId: uuid, asOf: date.optional() }, ({ bookId, asOf }) => financeTool(() => accountBalances(db, userId, bookId, asOf)));
  register(server, 'finance_list_transactions', 'Search/filter a private transaction register. Continue using nextCursor with the same filters. Dates are YYYY-MM-DD; money in responses is minor-unit strings.', { bookId: uuid, query: querySchema.optional() }, ({ bookId, query }) => financeTool(() => listTransactions(db, userId, bookId, query ?? {})));
  register(server, 'finance_get_transaction', 'Get an owned transaction, stable movement IDs, category splits, import provenance and planned-payment matches.', { bookId: uuid, transactionId: uuid }, ({ bookId, transactionId }) => financeTool(() => getTransaction(db, userId, bookId, transactionId)));
  register(server, 'finance_create_transaction', 'Create atomic signed movements using decimal strings. Expense movements reduce cash; splits are positive. Refund splits are negative. Transfers sum to zero and have no spending splits. ADJUSTMENT never counts as income. Reuse requestKey on retry.', { bookId: uuid, transaction: transactionSchema }, ({ bookId, transaction }) => financeTool(() => createTransaction(db, actor, bookId, transaction)));
  register(server, 'finance_update_transaction', 'Replace transaction fields with expectedVersion. Stable movement IDs are preserved. Reconciled/imported/matched movement changes are protected; use corrections rather than rewriting imported money.', { bookId: uuid, transactionId: uuid, transaction: transactionUpdateSchema }, ({ bookId, transactionId, transaction }) => financeTool(() => updateTransaction(db, actor, bookId, transactionId, transaction)));
  register(server, 'finance_set_transaction_deleted', 'Recoverably delete or restore an owned transaction with a version check. Provenance is retained, so importing again does not silently recreate deleted entries.', { bookId: uuid, transactionId: uuid, changes: archiveSchema }, ({ bookId, transactionId, changes }) => financeTool(() => deleteTransaction(db, actor, bookId, transactionId, changes)));
  register(server, 'finance_bulk_categorize', 'Atomically replace full category allocations for up to 100 income/expense/refund entries. Every entry requires its current version; one invalid entry rolls back the batch.', { bookId: uuid, changes: bulkCategorySchema }, ({ bookId, changes }) => financeTool(() => bulkCategorize(db, actor, bookId, changes)));
  register(server, 'finance_list_changes', 'Read append-only Finance change history, including actor/source and before/after values. Continue with nextCursor.', { bookId: uuid, cursor: uuid.optional() }, ({ bookId, cursor }) => financeTool(() => listChanges(db, userId, bookId, cursor)));
  register(server, 'finance_list_reconciliations', 'Read preserved bank-statement reconciliations, including reopened history.', { bookId: uuid }, ({ bookId }) => financeTool(() => listReconciliations(db, userId, bookId)));
  register(server, 'finance_reconcile_account', 'Compare a dated statement balance to cleared posted ledger movements. Refuse mismatches instead of inventing balancing expenses; protect the reconciled period.', { bookId: uuid, statement: reconcileSchema }, ({ bookId, statement }) => financeTool(() => reconcileAccount(db, actor, bookId, statement)));
  register(server, 'finance_reopen_reconciliation', 'Explicitly reopen a reconciliation and its later dependent statements, with an audited reason and current version. Does not delete statement history.', { bookId: uuid, reconciliationId: uuid, changes: reopenSchema }, ({ bookId, reconciliationId, changes }) => financeTool(() => reopenReconciliation(db, actor, bookId, reconciliationId, changes)));
}
