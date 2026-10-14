import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Pencil, Link2, Unlink } from 'lucide-react';
import type * as F from '@domain/finance/models/finance';
import { Button } from '@modules/core/ui/primitives/button';
import type { FinanceStore } from '../store';
import { displayDate, shortDate } from '../format';
import { billStatus, billStatusLabels, billSummary, compareBills, matchesBillStatus, type BillFilter } from '../plan-view';
import { AmountRange, Empty, Field, Input, Money, PeriodForm, Section, Select } from './common';

const kinds = [
  { id: 'EXPENSE', label: 'Bills and expenses', icon: ArrowUpRight },
  { id: 'INCOME', label: 'Expected income', icon: ArrowDownLeft },
  { id: 'TRANSFER', label: 'Planned transfers', icon: ArrowLeftRight },
] as const;

export const BillsView = observer(function BillsView({ store, onEdit, onPayment, onUnlink }: {
  store: FinanceStore;
  onEdit: (item: F.Occurrence) => void;
  onPayment: (item: F.Occurrence) => void;
  onUnlink: (item: F.Occurrence, movementId: string) => void;
}) {
  const [search, setSearch] = useState(''), [kind, setKind] = useState('all');
  const [status, setStatus] = useState<BillFilter>('all'), [sort, setSort] = useState('attention');
  const [account, setAccount] = useState('');
  const book = store.book!, summary = billSummary(store.occurrences, store.today);
  const reset = () => { setSearch(''); setKind('all'); setStatus('all'); setAccount(''); setSort('attention'); };
  const filtered = store.occurrences.filter(item =>
    item.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
    (kind === 'all' || kind === item.kind) && (!account || (account === 'unassigned' ? !item.accountId : account === item.accountId)) &&
    matchesBillStatus(item, status, store.today),
  ).sort((a, b) => compareBills(a, b, store.today, sort));
  const hasFilters = !!search || kind !== 'all' || status !== 'all' || !!account;
  return <>
    <PeriodForm key={`${store.billsFrom}/${store.billsTo}`} from={store.billsFrom} to={store.billsTo} today={store.today} mode="bills" onApply={store.setBillsPeriod} />
    <div className="finance-stats finance-bill-stats" aria-label="Selected period summary">
      <div className="finance-stat"><div className="finance-stat-label">Bills remaining</div><div className="finance-stat-value"><Money book={book} value={summary.expense} /></div><small>Expected expenses still to pay</small></div>
      <div className="finance-stat"><div className="finance-stat-label">Income remaining</div><div className="finance-stat-value finance-positive"><Money book={book} value={summary.income} /></div><small>Expected income still to receive</small></div>
      <button className={`finance-stat finance-stat-button ${summary.overdue ? 'finance-stat-attention' : ''}`} aria-pressed={status === 'overdue'} onClick={() => setStatus(status === 'overdue' ? 'all' : 'overdue')}><span className="finance-stat-label">Overdue items</span><span className="finance-stat-value">{summary.overdue}</span><small>View items past their due date</small></button>
      <button className="finance-stat finance-stat-button" aria-pressed={status === 'paid'} onClick={() => setStatus(status === 'paid' ? 'all' : 'paid')}><span className="finance-stat-label">Settled items</span><span className="finance-stat-value">{summary.settled}</span><small>Fully paid or received</small></button>
    </div>
    <div className="finance-card finance-planning-filters">
      <div className="finance-planning-filter-grid">
        <Field label="Search bills and income"><Input type="search" placeholder="Find a bill or income…" value={search} onChange={e => setSearch(e.target.value)} /></Field>
        <Field label="Type"><Select value={kind} onChange={e => setKind(e.target.value)}><option value="all">All types</option>{kinds.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}</Select></Field>
        <Field label="Account"><Select value={account} onChange={e => setAccount(e.target.value)}><option value="">All accounts</option><option value="unassigned">No account assigned</option>{store.catalog?.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        <Field label="Sort bills"><Select value={sort} onChange={e => setSort(e.target.value)}><option value="attention">Needs attention first</option><option value="date">Due date</option><option value="amount">Highest remaining</option></Select></Field>
      </div>
      <div className="finance-filter-summary">
        <div className="finance-filter-chips" aria-label="Bill status">{([
          ['all', 'All items'], ['unpaid', 'Unpaid'], ['overdue', 'Overdue'], ['partial', 'Partially paid'], ['review', 'Confirm amount'], ['paid', 'Settled'], ['skipped', 'Skipped'],
        ] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={status === id} onClick={() => setStatus(id)}>{label}<span>{store.occurrences.filter(o => matchesBillStatus(o, id, store.today)).length}</span></button>)}</div>
        {hasFilters && <Button variant="ghost" size="sm" onClick={reset}>Clear filters</Button>}
      </div>
    </div>
    <p className="finance-results-note" role="status">{store.loading ? 'Updating bills…' : `${filtered.length} of ${store.occurrences.length} items`} · {displayDate(store.billsFrom)} – {displayDate(store.billsTo)}<span>Summary and status counts cover the selected period.</span></p>
    {!filtered.length && !store.loading && <div className="finance-card"><Empty title={hasFilters ? 'No matching bills or income' : 'No bills or income in this period'} description={hasFilters ? 'Try a different search or clear the filters.' : 'Choose another month or add a plan to organize future payments.'} action={hasFilters ? <Button variant="outlined" size="sm" onClick={reset}>Clear filters</Button> : undefined} /></div>}
    {kinds.map(group => {
      const items = filtered.filter(item => item.kind === group.id);
      if (!items.length) return null;
      const Icon = group.icon;
      return <Section key={group.id} title={`${group.label} · ${items.length}`} subtitle={group.id === 'INCOME' ? 'Track what has arrived and what is still expected.' : group.id === 'TRANSFER' ? 'Transfers between accounts do not count as income or spending.' : 'Review due dates and link recorded payments.'} actions={<Icon className={`finance-kind-icon finance-kind-${group.id.toLowerCase()}`} size={21} aria-hidden="true" />}>
        <div className="finance-table-wrap"><table className="finance-table finance-bills-table"><caption className="finance-sr-only">{group.label} for the selected period</caption><thead><tr><th>Due / description</th><th>Status</th><th className="finance-number">Expected</th><th className="finance-number">{group.id === 'INCOME' ? 'Received' : 'Paid'}</th><th className="finance-number">Remaining</th><th><span className="finance-sr-only">Actions</span></th></tr></thead><tbody>{items.map(item => {
          const state = billStatus(item, store.today);
          return <tr key={`${item.scheduleId}/${item.date}`} data-status={state}>
            <td><strong>{item.title}</strong><small>{displayDate(item.date)} · {store.catalog?.accounts.find(a => a.id === item.accountId)?.name ?? 'No account assigned'}</small></td>
            <td><span className={`finance-badge finance-status-${state}`}>{state === 'paid' && group.id === 'INCOME' ? 'Received' : state === 'upcoming' && shortDate(item.date) === store.today ? 'Due today' : billStatusLabels[state]}</span>{state === 'overdue' && BigInt(item.paidMinor) > 0n && <small>Partially {group.id === 'INCOME' ? 'received' : 'paid'}</small>}{state === 'review' && <small>Expected amount covered;<br />confirm the final amount.</small>}</td>
            <td className="finance-number" data-label="Expected"><AmountRange book={book} low={item.lowMinor} expected={item.expectedMinor} high={item.highMinor} /></td>
            <td className="finance-number" data-label={group.id === 'INCOME' ? 'Received' : 'Paid'}><Money book={book} value={item.paidMinor} />{!!item.payments.length && <small>{item.payments.length} linked {item.payments.length === 1 ? 'payment' : 'payments'}</small>}</td>
            <td className="finance-number" data-label="Remaining"><AmountRange book={book} low={item.remainingLowMinor} expected={item.remainingExpectedMinor} high={item.remainingHighMinor} />{BigInt(item.overpaidMinor) > 0n && <small>Overpaid <Money book={book} value={item.overpaidMinor} /></small>}</td>
            <td><div className="finance-actions finance-row-actions"><Button variant="ghost" iconOnly size="sm" disabled={store.readOnly || store.busy} aria-label={`Edit bill ${item.title} ${shortDate(item.date)}`} tooltip="Edit this bill" onClick={() => onEdit(item)}><Pencil size={15} /></Button><Button variant="ghost" iconOnly size="sm" disabled={store.readOnly || store.busy || item.state === 'SKIPPED'} aria-label={`Link payment to ${item.title}`} tooltip="Link payment" onClick={() => onPayment(item)}><Link2 size={15} /></Button>{!!item.payments.length && <details className="finance-payment-links"><summary aria-label={`Payment links for ${item.title}`} title="Manage payment links"><Unlink size={15} /></summary><div>{item.payments.map((p, index) => <Button key={p.movementId} variant="ghost" size="sm" disabled={store.readOnly || store.busy} onClick={() => onUnlink(item, p.movementId)}>Unlink {index + 1} · <Money book={book} value={p.appliedMinor} /></Button>)}</div></details>}</div></td>
          </tr>;
        })}</tbody></table></div>
      </Section>;
    })}
  </>;
});
