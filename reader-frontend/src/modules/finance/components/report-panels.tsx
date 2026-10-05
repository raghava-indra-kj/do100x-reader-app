import { useState } from 'react';
import { Download, ArrowRight } from 'lucide-react';
import { Popover } from '@modules/core/ui/primitives/popover';
import { observer } from 'mobx-react-lite';
import { Button } from '@modules/core/ui/primitives/button';
import type { FinanceStore } from '../store';
import { Alert, Empty, FinanceHeader, Field, Help, Input, Money, PeriodForm, Section } from './common';
import { displayDate, downloadExport, occurrenceLabel, shortDate } from '../format';

// These two informational notes are explained in the disclosure below.
// Operational warnings (including any new server warnings) stay visible.
const reportNotes = new Set([
  'Reports include recorded, posted transactions only. Missing records can affect totals.',
  'Income and spending use transaction dates. Account cash flow uses each entry’s effective date. Transfers and balance corrections don’t count as income or spending.',
]);

export const ReportsPanel = observer(function ReportsPanel({ store, overview = false }: { store: FinanceStore; overview?: boolean }) {
  const report = store.report, book = store.book!;
  const [exportOpen, setExportOpen] = useState(false);
  const exportFile = async (format: 'JSON' | 'CSV') => {
    const result = await store.mutate(() => store.repo.export(store.bookId, format === 'JSON' ? { format, includeDeleted: true } : { format, from: store.reportFrom, to: store.reportTo }), 'Export downloaded');
    if (result) downloadExport(result.filename, result.mime, result.content);
  };
  const cash = report?.balances.filter(a => a.isLiquid).reduce((sum, a) => sum + BigInt(a.postedMinor), 0n) ?? 0n;
  const upcoming = [...new Map([...(store.forecast?.overdue ?? []), ...store.occurrences].map(o => [`${o.scheduleId}/${shortDate(o.date)}`, o])).values()].filter(o => o.state !== 'SKIPPED' && o.kind === 'EXPENSE' && BigInt(o.remainingHighMinor) > 0n).sort((a, b) => a.date.localeCompare(b.date));
  return <>
    <FinanceHeader title={overview ? 'Overview' : 'Reports'} subtitle={overview ? 'Your cash, spending and what’s coming next.' : 'See where your money went.'} store={store} actions={<Popover open={exportOpen} onOpenChange={setExportOpen} align="end" content={<div className="finance-export-menu"><Button variant="ghost" size="sm" disabled={store.busy} onClick={() => { setExportOpen(false); void exportFile('CSV'); }}>Transactions for this period (CSV)</Button><Button variant="ghost" size="sm" disabled={store.busy} onClick={() => { setExportOpen(false); void exportFile('JSON'); }}>Full book, including deleted records (JSON)</Button></div>}><Button variant="outlined" size="sm" disabled={store.busy}><Download size={14} aria-hidden="true" /> Export</Button></Popover>} />
    <PeriodForm key={`${store.reportFrom}/${store.reportTo}`} from={store.reportFrom} to={store.reportTo} onApply={store.setPeriod} />
    {report && <>
      <div className="finance-stats">
        {overview && <div className="finance-stat finance-stat-featured"><div className="finance-stat-label">Cash balance</div><div className="finance-stat-value"><Money book={book} value={cash} color /></div><small>Posted cash through {displayDate(report.to)}</small></div>}
        {[
          ['Income', report.totals.incomeMinor, 'Recorded income'],
          ['Spending', report.totals.netSpendingMinor, 'After refunds'],
          ['Income − spending', report.totals.netIncomeMinor, 'Excludes transfers and balance corrections'],
          ...(!overview ? [['Cash movement', report.cashFlow.netMinor, 'Includes balance corrections']] : []),
        ].map(([label, value, hint]) => <div className="finance-stat" key={label}><div className="finance-stat-label">{label}</div><div className="finance-stat-value"><Money book={book} value={value} /></div><small>{hint}</small></div>)}
      </div>
      <Help title="How these totals are calculated"><p>Only recorded, posted transactions count. Income and spending use transaction dates; cash movement uses each account entry’s effective date. Transfers and balance corrections aren’t income or spending.</p><p>Cash balance includes accounts marked for cash forecasts, including archived accounts with remaining cash. Debt isn’t income. Missing records can affect every total.</p></Help>
      {report.warnings.filter(warning => !reportNotes.has(warning)).map(warning => <Alert key={warning}>{warning}</Alert>)}
      {overview && <div className="finance-grid">
        <Section title="Upcoming bills" subtitle={`Unpaid plans through ${displayDate(store.forecastTo)}`} actions={<Button size="sm" variant="ghost" onClick={() => store.setTab('plans')}>View all <ArrowRight size={14} /></Button>}>
          {upcoming.slice(0, 5).map(item => <div className="finance-row" key={`${item.scheduleId}/${item.date}`}><div><strong>{item.title}</strong><p>{displayDate(item.date)} · {occurrenceLabel(item, store.today)}</p></div><div className="finance-amount-range"><strong><Money book={book} value={item.remainingExpectedMinor} /></strong><small>Expected remaining</small></div></div>)}
          {!upcoming.length && <Empty title="No unpaid bills in this period" description="Add recurring bills and one-off expenses in Plans and bills." />}
        </Section>
        <Section title="Account balances" subtitle={`Posted through ${displayDate(report.to)}`} actions={<Button size="sm" variant="ghost" onClick={() => store.setTab('accounts')}>Accounts <ArrowRight size={14} /></Button>}>
          {report.balances.map(item => <div className="finance-row" key={item.id}><div><strong>{item.name}</strong><p>{item.tracksDebt ? 'Debt account' : item.isLiquid ? 'Cash account' : 'Outside cash forecasts'}{item.archivedAt ? ' · Archived' : ''}</p></div><Money book={book} value={item.postedMinor} color /></div>)}
          {!report.balances.length && <Empty title="No accounts yet" description="Add the places you keep your money." />}
        </Section>
      </div>}
      {overview && <ForecastPanel store={store} />}
      <div className="finance-grid">
        <Section title="Spending and income by category" subtitle="Parent totals include their subcategories; don’t add both together.">
          {report.categories.filter(c => BigInt(c.rollupMinor) !== 0n).map(item => <div className="finance-row" key={item.id}><div><strong>{item.name}</strong><p>{item.kind === 'INCOME' ? 'Income' : 'Spending after refunds'}{item.parentId ? ' · Subcategory' : ''}</p></div><Money book={book} value={item.rollupMinor} /></div>)}
          <div className="finance-row"><span>Uncategorized spending</span><Money book={book} value={report.unclassifiedExpenseMinor} /></div><div className="finance-row"><span>Uncategorized income</span><Money book={book} value={report.unclassifiedIncomeMinor} /></div>
        </Section>
        <Section title="Budget progress" subtitle="Targets, not forecast expenses. Actual spending includes refunds.">
          {report.budgetStatus.length ? report.budgetStatus.map(item => <div className="finance-row" key={item.id}><div><strong>{item.categoryName}</strong><p>{item.month.slice(0, 7)} · {item.partialMonth ? 'Partial month' : 'Full month'}</p><p>Spent <Money book={book} value={item.spentMinor} /> of <Money book={book} value={item.amountMinor} /></p></div><div className="finance-amount-range"><strong><Money book={book} value={item.remainingMinor} color /></strong><small>{BigInt(item.remainingMinor) < 0n ? 'Over budget' : 'Remaining'}</small></div></div>) : <Empty title="No budgets for this period" description="Set a monthly spending target by category." action={<Button size="sm" variant="outlined" onClick={() => store.setTab('manage')}>Manage budgets</Button>} />}
        </Section>
      </div>
      {!overview && <>
        <div className="finance-grid">
          <Section title="Account balances" subtitle={`Posted through ${displayDate(report.to)}`}>{report.balances.map(item => <div className="finance-row" key={item.id}><div><strong>{item.name}</strong><p>{item.tracksDebt ? 'Debt account' : item.isLiquid ? 'Cash account' : 'Outside cash forecasts'}{item.archivedAt ? ' · Archived' : ''}</p></div><Money book={book} value={item.postedMinor} color /></div>)}{!report.balances.length && <p className="finance-card-body finance-muted">No accounts yet.</p>}</Section>
          {report.comparison && <Section title="Compared with the previous period" subtitle={`${displayDate(report.comparison.from)} – ${displayDate(report.comparison.to)} · Same number of days`}><div className="finance-row"><span>Change in income</span><Money book={book} value={report.comparison.incomeChangeMinor} color /></div><div className="finance-row"><span>Change in spending</span><Money book={book} value={report.comparison.spendingChangeMinor} /></div></Section>}
        </div>
        <div className="finance-grid">{([{ title: 'By merchant', entries: report.merchants }, { title: 'By payment method', entries: report.paymentMethods }]).map(({ title, entries }) => <Section key={title} title={title}>{entries.map(item => <div className="finance-row" key={item.name}><strong>{item.name || 'Not specified'}</strong><Money book={book} value={item.amountMinor} /></div>)}{!entries.length && <p className="finance-card-body finance-muted">No spending recorded in this period.</p>}</Section>)}</div>
        <Section title="Records to check" subtitle="Incomplete records can affect your reports."><div className="finance-quality-grid">{[
          ['Uncategorized transactions', report.quality.uncategorizedTransactionCount], ['Pending transactions', report.quality.pendingCount], ['Uncleared entries', report.quality.unclearedMovementCount], ['Unverified imports', report.quality.unverifiedImportCount], ['Archived accounts with balances', report.quality.archivedAccountsWithBalance.length],
        ].map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}</div></Section>
      </>}
    </>}
  </>;
});

export const ForecastPanel = observer(function ForecastPanel({ store }: { store: FinanceStore }) {
  const forecast = store.forecast, book = store.book!;
  const monthly = forecast?.timeline.filter((day, index, timeline) => !timeline[index + 1] || timeline[index + 1].date.slice(0, 7) !== day.date.slice(0, 7)) ?? [];
  return <Section title="Looking ahead" subtitle="Estimated cash after bills, income and spending plans—not a recorded balance." actions={<Field label="Forecast to"><Input type="date" min={store.today} value={store.forecastTo} onChange={e => { if (e.target.value) store.setForecastTo(e.target.value); }} /></Field>}>
    <div className="finance-card-body finance-form-stack">
      {store.forecastError && <Alert error>{store.forecastError}</Alert>}
      {forecast && <>
        {forecast.firstNegativeLowDate && <Alert error>Possible cash shortfall from {displayDate(forecast.firstNegativeLowDate)}{forecast.firstNegativeExpectedDate ? `; expected scenario from ${displayDate(forecast.firstNegativeExpectedDate)}` : ''}.</Alert>}
        {!!forecast.overdue.length && <Alert>{forecast.overdue.length} overdue unpaid bills are included from today.</Alert>}
        {forecast.warnings.map(w => <p className="finance-note" key={w}>{w}</p>)}
        <div className="finance-forecast-grid">{monthly.map(day => <article className="finance-forecast-card" key={day.date}><small>Cash by {displayDate(day.date)}</small><strong><Money book={book} value={day.expectedMinor} color /></strong><span>Expected</span><dl><div><dt>Lower estimate</dt><dd><Money book={book} value={day.lowMinor} color /></dd></div><div><dt>Higher estimate</dt><dd><Money book={book} value={day.highMinor} color /></dd></div></dl></article>)}</div>
        <Help title="About this forecast"><p>Starts from posted cash on {displayDate(forecast.asOf)}. {forecast.scenarios}</p><p>Includes planned bills, income and spending estimates. Budgets are targets and aren’t added as expenses.</p></Help>
        <Help title="Daily and per-account forecast"><div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Date</th><th className="finance-number">Expected cash</th><th>Expected by account</th><th>Events</th></tr></thead><tbody>{forecast.timeline.map(day => <tr key={day.date}><td>{displayDate(shortDate(day.date))}</td><td className="finance-number"><Money book={book} value={day.expectedMinor} color /></td><td>{day.accounts.map(account => <small key={account.accountId}>{store.catalog?.accounts.find(a => a.id === account.accountId)?.name ?? 'Estimates with no account'}: <Money book={book} value={account.expectedMinor} /></small>)}</td><td>{day.events.map((event, index) => <small key={index}>{event.title}{event.overdue ? ' · Overdue' : ''}</small>)}</td></tr>)}</tbody></table></div></Help>
      </>}
    </div>
  </Section>;
});
