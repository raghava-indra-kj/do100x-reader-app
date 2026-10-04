import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireSession } from '../session';
import { FinanceError, parse, date, uuid } from './contract';
import { type Actor, type FinanceDb } from './context';
import { createAccount, createBook, createCategory, getCatalog, listBooks, updateAccount, updateBook, updateCategory } from './catalog-service';
import { accountBalances, bulkCategorize, createTransaction, deleteTransaction, getTransaction, listChanges, listTransactions, updateTransaction } from './ledger-service';
import { listReconciliations, reconcileAccount, reopenReconciliation } from './reconciliation-service';
import { createSchedule, listPlans, matchPayment, occurrences, setBudget, setEstimate, unmatchPayment, updateOccurrence, updateSchedule } from './plan-service';
import { forecast } from './forecast-service';
import { cancelImport, commitImport, getImport, listImports, resolveImport, stageImport } from './import-service';
import { exportFinance, listRules, report, setRule, suggestions } from './report-service';

type Route = (req: Request, res: Response) => Promise<void>;
const route = (handler: Route): Route => async (req, res) => {
  try { await handler(req, res); }
  catch (error) {
    if (error instanceof FinanceError) { res.status(error.status).json({ message: error.message, details: error.details }); return; }
    if (error instanceof z.ZodError) { res.status(422).json({ message: error.issues[0]?.message ?? 'Check this request and try again.' }); return; }
    throw error;
  }
};
const actor = (res: Response): Actor => ({ userId: res.locals.userId as string, source: 'HTTP' });
const book = (req: Request) => parse(uuid, req.params.bookId);
const id = (req: Request) => parse(uuid, req.params.id);

/** All Finance reads and writes are private; no public-page access fallback. */
export function createFinanceRouter(db: FinanceDb) {
  const router = Router();
  router.use(requireSession);
  router.get('/books', route(async (_req, res) => { res.json(await listBooks(db, actor(res).userId)); }));
  router.post('/books', route(async (req, res) => { res.status(201).json(await createBook(db, actor(res), req.body)); }));
  router.patch('/books/:bookId', route(async (req, res) => { res.json(await updateBook(db, actor(res), book(req), req.body)); }));
  router.get('/books/:bookId/catalog', route(async (req, res) => { res.json(await getCatalog(db, actor(res).userId, book(req))); }));
  router.post('/books/:bookId/accounts', route(async (req, res) => { res.status(201).json(await createAccount(db, actor(res), book(req), req.body)); }));
  router.patch('/books/:bookId/accounts/:id', route(async (req, res) => { res.json(await updateAccount(db, actor(res), book(req), id(req), req.body)); }));
  router.post('/books/:bookId/categories', route(async (req, res) => { res.status(201).json(await createCategory(db, actor(res), book(req), req.body)); }));
  router.patch('/books/:bookId/categories/:id', route(async (req, res) => { res.json(await updateCategory(db, actor(res), book(req), id(req), req.body)); }));
  router.get('/books/:bookId/balances', route(async (req, res) => { const q = parse(z.object({ asOf: date.optional() }).strict(), req.query); res.json(await accountBalances(db, actor(res).userId, book(req), q.asOf)); }));
  router.get('/books/:bookId/transactions', route(async (req, res) => { res.json(await listTransactions(db, actor(res).userId, book(req), req.query)); }));
  router.post('/books/:bookId/transactions', route(async (req, res) => { res.status(201).json(await createTransaction(db, actor(res), book(req), req.body)); }));
  router.post('/books/:bookId/transactions/categorize', route(async (req, res) => { res.json(await bulkCategorize(db, actor(res), book(req), req.body)); }));
  router.get('/books/:bookId/transactions/:id', route(async (req, res) => { res.json(await getTransaction(db, actor(res).userId, book(req), id(req))); }));
  router.put('/books/:bookId/transactions/:id', route(async (req, res) => { res.json(await updateTransaction(db, actor(res), book(req), id(req), req.body)); }));
  router.patch('/books/:bookId/transactions/:id/deletion', route(async (req, res) => { res.json(await deleteTransaction(db, actor(res), book(req), id(req), req.body)); }));
  router.get('/books/:bookId/changes', route(async (req, res) => { const q = parse(z.object({ cursor: uuid.optional() }).strict(), req.query); res.json(await listChanges(db, actor(res).userId, book(req), q.cursor)); }));
  router.get('/books/:bookId/reconciliations', route(async (req, res) => { res.json(await listReconciliations(db, actor(res).userId, book(req))); }));
  router.post('/books/:bookId/reconciliations', route(async (req, res) => { res.status(201).json(await reconcileAccount(db, actor(res), book(req), req.body)); }));
  router.post('/books/:bookId/reconciliations/:id/reopen', route(async (req, res) => { res.json(await reopenReconciliation(db, actor(res), book(req), id(req), req.body)); }));
  router.get('/books/:bookId/plans', route(async (req, res) => { res.json(await listPlans(db, actor(res).userId, book(req))); }));
  router.post('/books/:bookId/schedules', route(async (req, res) => { res.status(201).json(await createSchedule(db, actor(res), book(req), req.body)); }));
  router.put('/books/:bookId/schedules/:id', route(async (req, res) => { res.json(await updateSchedule(db, actor(res), book(req), id(req), req.body)); }));
  router.get('/books/:bookId/occurrences', route(async (req, res) => { res.json(await occurrences(db, actor(res).userId, book(req), req.query)); }));
  router.patch('/books/:bookId/occurrences', route(async (req, res) => { res.json(await updateOccurrence(db, actor(res), book(req), req.body)); }));
  router.post('/books/:bookId/occurrences/payments', route(async (req, res) => { res.json(await matchPayment(db, actor(res), book(req), req.body)); }));
  router.post('/books/:bookId/occurrences/payments/remove', route(async (req, res) => { res.json(await unmatchPayment(db, actor(res), book(req), req.body)); }));
  router.put('/books/:bookId/budgets', route(async (req, res) => { res.json(await setBudget(db, actor(res), book(req), req.body)); }));
  router.put('/books/:bookId/estimates', route(async (req, res) => { res.json(await setEstimate(db, actor(res), book(req), req.body)); }));
  router.get('/books/:bookId/forecast', route(async (req, res) => { res.json(await forecast(db, actor(res).userId, book(req), req.query)); }));
  router.get('/books/:bookId/imports', route(async (req, res) => { res.json(await listImports(db, actor(res).userId, book(req), req.query)); }));
  router.post('/books/:bookId/imports', route(async (req, res) => { res.status(201).json(await stageImport(db, actor(res), book(req), req.body)); }));
  router.post('/books/:bookId/imports/csv', route(async (req, res) => { res.status(201).json(await stageImport(db, actor(res), book(req), req.body, true)); }));
  router.get('/books/:bookId/imports/:id', route(async (req, res) => { res.json(await getImport(db, actor(res).userId, book(req), id(req))); }));
  router.patch('/books/:bookId/imports/:id', route(async (req, res) => { res.json(await resolveImport(db, actor(res), book(req), id(req), req.body)); }));
  router.post('/books/:bookId/imports/:id/commit', route(async (req, res) => { res.json(await commitImport(db, actor(res), book(req), id(req), req.body)); }));
  router.post('/books/:bookId/imports/:id/cancel', route(async (req, res) => { res.json(await cancelImport(db, actor(res), book(req), id(req), req.body)); }));
  router.post('/books/:bookId/report', route(async (req, res) => { res.json(await report(db, actor(res).userId, book(req), req.body)); }));
  router.get('/books/:bookId/suggestions', route(async (req, res) => { res.json(await suggestions(db, actor(res).userId, book(req))); }));
  router.get('/books/:bookId/rules', route(async (req, res) => { res.json(await listRules(db, actor(res).userId, book(req))); }));
  router.put('/books/:bookId/rules', route(async (req, res) => { res.json(await setRule(db, actor(res), book(req), req.body)); }));
  router.post('/books/:bookId/export', route(async (req, res) => { res.json(await exportFinance(db, actor(res).userId, book(req), req.body)); }));
  return router;
}
