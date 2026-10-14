import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Pencil, CalendarClock } from 'lucide-react';
import type { Schedule } from '@domain/finance/models/finance';
import { Button } from '@modules/core/ui/primitives/button';
import type { FinanceStore } from '../store';
import { displayDate, titleCase, transactionKindLabels } from '../format';
import { scheduleFrequency, scheduleStatus } from '../plan-view';
import { AmountRange, Empty, Field, Input, Select } from './common';

export const RecurringPlansView = observer(function RecurringPlansView({ store, onEdit }: { store: FinanceStore; onEdit: (item: Schedule) => void }) {
  const [search, setSearch] = useState(''), [status, setStatus] = useState('all'), [frequency, setFrequency] = useState('all');
  const items = store.plans.schedules.filter(item => item.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) && (status === 'all' || scheduleStatus(item, store.today) === status) && (frequency === 'all' || item.frequency === frequency)).sort((a, b) => a.title.localeCompare(b.title));
  return <>
    <div className="finance-card finance-planning-filters"><div className="finance-planning-filter-grid finance-plan-filter-grid">
      <Field label="Search plans"><Input type="search" placeholder="Find a recurring or one-off plan…" value={search} onChange={e => setSearch(e.target.value)} /></Field>
      <Field label="Plan status"><Select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{['active', 'paused', 'ended', 'archived'].map(s => <option key={s} value={s}>{titleCase(s)}</option>)}</Select></Field>
      <Field label="Frequency"><Select value={frequency} onChange={e => setFrequency(e.target.value)}><option value="all">All frequencies</option>{['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map(f => <option key={f} value={f}>{f === 'ONCE' ? 'One-off' : titleCase(f)}</option>)}</Select></Field>
    </div><div className="finance-filter-summary"><span className="finance-muted">{items.length} of {store.plans.schedules.length} plans · Amounts are per occurrence.</span>{(search || status !== 'all' || frequency !== 'all') && <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setStatus('all'); setFrequency('all'); }}>Clear filters</Button>}</div></div>
    {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map(kind => {
      const group = items.filter(item => item.kind === kind);
      if (!group.length) return null;
      return <section key={kind} className="finance-plan-group"><h2>{kind === 'EXPENSE' ? 'Bills and expenses' : kind === 'INCOME' ? 'Income plans' : 'Transfers'} <span>{group.length}</span></h2><div className="finance-plan-grid">{group.map(item => {
        const state = scheduleStatus(item, store.today);
        return <article className="finance-plan-card" key={item.id}>
          <div className="finance-plan-card-heading"><span className={`finance-kind-icon finance-kind-${item.kind.toLowerCase()}`}><CalendarClock size={18} aria-hidden="true" /></span><span className={`finance-badge finance-status-${state}`}>{titleCase(state)}</span><Button variant="ghost" size="sm" iconOnly aria-label={`Edit ${item.title}`} tooltip="Edit plan" disabled={store.readOnly || store.busy} onClick={() => onEdit(item)}><Pencil size={15} /></Button></div>
          <h3>{item.title}</h3><p className="finance-note">{store.catalog?.accounts.find(a => a.id === item.accountId)?.name ?? 'No account assigned'} · {transactionKindLabels[item.kind]}</p>
          <div className="finance-plan-amount"><AmountRange book={store.book!} low={item.lowMinor} expected={item.expectedMinor} high={item.highMinor} /><span>{scheduleFrequency(item)}{item.monthEnd ? ' · Month end' : ''}</span></div>
          <div className="finance-plan-dates">From {displayDate(item.startDate)}{item.endDate && <span>Until {displayDate(item.endDate)}</span>}</div>
        </article>;
      })}</div></section>;
    })}
    {!items.length && <div className="finance-card"><Empty title={store.plans.schedules.length ? 'No matching plans' : 'No plans yet'} description={store.plans.schedules.length ? 'Try a different search, status or frequency.' : 'Add a salary, subscription, recurring bill or one-off expense.'} /></div>}
  </>;
});
