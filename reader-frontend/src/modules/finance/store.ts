import { makeAutoObservable, runInAction } from 'mobx';
import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '@core/errors/app-error';
import { container, TYPES } from '@di/container';
import type { IFinanceRepo } from '@domain/finance/repos/finance-repo';
import type * as F from '@domain/finance/models/finance';
import { addMonths, dateInTimezone, monthBounds } from '@reader/finance-core';

export type FinanceTab = 'overview' | 'transactions' | 'accounts' | 'plans' | 'imports' | 'reports' | 'manage' | 'history';
function unwrap<T>(result: Awaited<AsyncResult<T, AppError>>): T { if (!result.ok) throw result.error; return result.data; }
const message = (cause: unknown) => cause instanceof Error ? cause.message : 'Couldn’t load Finance. Try again.';

/** Page-scoped state, destroyed on identity change. No finance data in auth. */
export class FinanceStore {
  readonly repo: IFinanceRepo;
  books: F.Book[] = [];
  bookId = '';
  catalog: F.Catalog | null = null;
  balances: F.Balance[] = [];
  tab: FinanceTab = 'overview';
  loading = false;
  busy = false;
  error: string | null = null;
  notice: string | null = null;
  reportFrom = '';
  reportTo = '';
  forecastTo = '';
  report: F.Report | null = null;
  forecast: F.Forecast | null = null;
  forecastError: string | null = null;
  transactions: F.Transactions = { items: [], nextCursor: null };
  transactionQuery: F.TransactionQuery = {};
  plans: F.Plans = { schedules: [], budgets: [], estimates: [] };
  occurrences: F.Occurrence[] = [];
  imports: F.Imports = { items: [], nextCursor: null };
  selectedImport: F.ImportBatch | null = null;
  rules: F.Rule[] = [];
  changes: F.Changes = { items: [], nextCursor: null };
  reconciliations: F.Reconciliation[] = [];
  suggestions: F.Suggestions | null = null;
  private epoch = 0;
  private detailEpoch = 0;
  private disposed = true;

  constructor(repo: IFinanceRepo = container.get(TYPES.IFinanceRepo)) {
    this.repo = repo;
    makeAutoObservable<FinanceStore, 'epoch' | 'detailEpoch' | 'disposed'>(this, { repo: false, epoch: false, detailEpoch: false, disposed: false }, { autoBind: true });
  }
  get book() { return this.catalog?.book ?? null; }
  get readOnly() { return !!this.book?.archivedAt; }
  get today() { return dateInTimezone(new Date(), this.book?.timezone ?? 'Asia/Kolkata'); }
  get activeAccounts() { return this.catalog?.accounts.filter(item => !item.archivedAt) ?? []; }
  get activeCategories() { return this.catalog?.categories.filter(item => !item.archivedAt) ?? []; }
  start() { this.disposed = false; void this.loadBooks(); }
  destroy() { this.disposed = true; this.epoch++; this.detailEpoch++; }
  private current(epoch: number) { return !this.disposed && epoch === this.epoch; }

  async loadBooks() {
    const epoch = ++this.epoch;
    this.loading = true; this.error = null;
    try {
      const books = unwrap(await this.repo.books());
      if (!this.current(epoch)) return;
      runInAction(() => { this.books = books; });
      const selected = books.find(item => item.id === this.bookId) ?? books.find(item => !item.archivedAt) ?? books[0];
      if (selected) await this.selectBook(selected.id);
      else runInAction(() => { this.bookId = ''; this.catalog = null; this.loading = false; });
    } catch (cause) { if (this.current(epoch)) runInAction(() => { this.error = message(cause); this.loading = false; }); }
  }
  async selectBook(id: string) {
    if (id !== this.bookId) {
      this.notice = null; this.error = null;
      this.bookId = id; this.catalog = null; this.balances = []; this.report = null; this.forecast = null; this.forecastError = null;
      this.reportFrom = ''; this.reportTo = ''; this.forecastTo = ''; this.transactionQuery = {}; this.transactions = { items: [], nextCursor: null };
      this.plans = { schedules: [], budgets: [], estimates: [] }; this.occurrences = []; this.imports = { items: [], nextCursor: null }; this.selectedImport = null;
      this.rules = []; this.changes = { items: [], nextCursor: null }; this.reconciliations = []; this.suggestions = null;
    }
    await this.refresh();
  }
  setTab(tab: FinanceTab) { this.tab = tab; void this.refresh(); }
  setPeriod(from: string, to: string) { this.reportFrom = from; this.reportTo = to; this.report = null; void this.refresh(); }
  setForecastTo(to: string) { this.forecastTo = to; void this.refresh(); }
  setTransactionQuery(query: F.TransactionQuery) { this.transactionQuery = query; void this.refresh(); }
  clearError() { this.error = null; }
  async loadSuggestions() {
    const epoch = this.epoch, bookId = this.bookId;
    const result = await this.repo.suggestions(bookId);
    if (!this.current(epoch)) return;
    runInAction(() => { if (result.ok) this.suggestions = result.data; else this.error = result.error.message; });
  }
  async refresh() {
    if (!this.bookId || this.disposed) return;
    const epoch = ++this.epoch, bookId = this.bookId, tab = this.tab;
    this.loading = true; this.error = null;
    try {
      const [catalog, balances] = await Promise.all([this.repo.catalog(bookId), this.repo.balances(bookId)]);
      if (!this.current(epoch)) return;
      runInAction(() => {
        this.catalog = unwrap(catalog); this.balances = unwrap(balances);
        if (!this.reportFrom) {
          const today = this.today;
          this.reportFrom = monthBounds(today).from; this.reportTo = today;
          this.forecastTo = monthBounds(addMonths(this.reportFrom, 2)).to;
          this.transactionQuery = { from: this.reportFrom, to: today };
        }
      });
      await this.loadTab(epoch, bookId, tab);
    } catch (cause) { if (this.current(epoch)) runInAction(() => { this.error = message(cause); }); }
    finally { if (this.current(epoch)) runInAction(() => { this.loading = false; }); }
  }
  private async loadTab(epoch: number, bookId: string, tab: FinanceTab) {
    if (tab === 'overview' || tab === 'reports') {
      const [report, forecast, occurrences] = await Promise.all([this.repo.report(bookId, this.reportFrom, this.reportTo), this.repo.forecast(bookId, this.forecastTo), tab === 'overview' ? this.repo.occurrences(bookId, this.today, this.forecastTo) : Promise.resolve(null)]);
      if (this.current(epoch)) runInAction(() => { this.report = unwrap(report); this.forecast = forecast.ok ? forecast.data : null; this.forecastError = forecast.ok ? null : forecast.error.message; if (occurrences) this.occurrences = unwrap(occurrences); });
    } else if (tab === 'transactions') {
      const result = unwrap(await this.repo.transactions(bookId, this.transactionQuery));
      if (this.current(epoch)) runInAction(() => { this.transactions = result; });
    } else if (tab === 'plans') {
      const [plans, occurrences, suggestions] = await Promise.all([this.repo.plans(bookId), this.repo.occurrences(bookId, this.reportFrom, this.forecastTo), this.repo.suggestions(bookId)]);
      if (this.current(epoch)) runInAction(() => { this.plans = unwrap(plans); this.occurrences = unwrap(occurrences); this.suggestions = unwrap(suggestions); });
    } else if (tab === 'imports') {
      const selectedId = this.selectedImport?.id;
      const [result, detail] = await Promise.all([this.repo.imports(bookId), selectedId ? this.repo.importBatch(bookId, selectedId) : Promise.resolve(null)]);
      if (this.current(epoch)) runInAction(() => { this.imports = unwrap(result); if (detail && this.selectedImport?.id === selectedId) this.selectedImport = unwrap(detail); });
    } else if (tab === 'manage') {
      const [plans, rules] = await Promise.all([this.repo.plans(bookId), this.repo.rules(bookId)]);
      if (this.current(epoch)) runInAction(() => { this.plans = unwrap(plans); this.rules = unwrap(rules); });
    } else if (tab === 'history') {
      const [changes, reconciliations] = await Promise.all([this.repo.changes(bookId), this.repo.reconciliations(bookId)]);
      if (this.current(epoch)) runInAction(() => { this.changes = unwrap(changes); this.reconciliations = unwrap(reconciliations); });
    }
  }
  async moreTransactions() {
    if (!this.transactions.nextCursor || this.loading) return;
    const epoch = this.epoch, bookId = this.bookId;
    this.loading = true;
    try {
      const result = unwrap(await this.repo.transactions(bookId, { ...this.transactionQuery, cursor: this.transactions.nextCursor }));
      if (this.current(epoch)) runInAction(() => { this.transactions = { items: [...this.transactions.items, ...result.items], nextCursor: result.nextCursor }; });
    } catch (cause) { if (this.current(epoch)) runInAction(() => { this.error = message(cause); }); }
    finally { if (this.current(epoch)) runInAction(() => { this.loading = false; }); }
  }
  async moreImports() {
    if (!this.imports.nextCursor || this.loading) return;
    const epoch = this.epoch; this.loading = true;
    try {
      const result = unwrap(await this.repo.imports(this.bookId, this.imports.nextCursor!));
      if (this.current(epoch)) runInAction(() => { this.imports = { items: [...this.imports.items, ...result.items], nextCursor: result.nextCursor }; });
    } catch (cause) { if (this.current(epoch)) runInAction(() => { this.error = message(cause); }); }
    finally { if (this.current(epoch)) runInAction(() => { this.loading = false; }); }
  }
  async moreChanges() {
    if (!this.changes.nextCursor || this.loading) return;
    const epoch = this.epoch; this.loading = true;
    try {
      const result = unwrap(await this.repo.changes(this.bookId, this.changes.nextCursor!));
      if (this.current(epoch)) runInAction(() => { this.changes = { items: [...this.changes.items, ...result.items], nextCursor: result.nextCursor }; });
    } catch (cause) { if (this.current(epoch)) runInAction(() => { this.error = message(cause); }); }
    finally { if (this.current(epoch)) runInAction(() => { this.loading = false; }); }
  }
  async openImport(id: string) {
    const epoch = this.epoch, detailEpoch = ++this.detailEpoch;
    try { const result = unwrap(await this.repo.importBatch(this.bookId, id)); if (this.current(epoch) && detailEpoch === this.detailEpoch) runInAction(() => { this.selectedImport = result; }); }
    catch (cause) { if (this.current(epoch) && detailEpoch === this.detailEpoch) runInAction(() => { this.error = message(cause); }); }
  }
  closeImport() { this.detailEpoch++; this.selectedImport = null; }

  async mutate<T>(operation: () => AsyncResult<T, AppError>, success = 'Saved'): Promise<T | null> {
    if (this.busy) return null;
    this.busy = true; this.error = null; this.notice = null;
    try {
      const result = unwrap(await operation());
      if (this.disposed) return null;
      runInAction(() => { this.notice = success; });
      await this.refresh();
      return result;
    } catch (cause) { if (!this.disposed) runInAction(() => { this.error = message(cause); }); return null; }
    finally { runInAction(() => { this.busy = false; }); }
  }
}
