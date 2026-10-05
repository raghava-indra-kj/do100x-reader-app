import type { ReactNode } from 'react';
import type { Change } from '@domain/finance/models/finance';
import type { FinanceStore } from '../store';
import { displayDate, displayTimestamp, titleCase } from '../format';
import { Help, Money } from './common';

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const hiddenFields = new Set(['id', 'bookId', 'version', 'createdAt', 'updatedAt']);
const labels: Record<string, string> = { accountId: 'Account', destinationAccountId: 'To account', categoryId: 'Category', parentId: 'Parent category', tracksDebt: 'Debt account', isLiquid: 'Included in cash forecasts', lowMinor: 'Minimum', expectedMinor: 'Expected', highMinor: 'Maximum', amountMinor: 'Amount', statementMinor: 'Statement balance', ledgerMinor: 'Recorded balance', notesMarkdown: 'Notes', matchText: 'Description contains', merchantName: 'Merchant', startDate: 'First due date', endDate: 'Last due date', monthEnd: 'Last day of month', archivedAt: 'Archived on', deletedAt: 'Deleted on', reopenedAt: 'Reopened on' };
const fieldLabel = (key: string) => labels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());

export function changeName(change: Change, store: FinanceStore) {
  const data = { ...record(change.before), ...record(change.after) };
  const name = data.title ?? data.name ?? data.description ?? data.matchText;
  if (typeof name === 'string') return name;
  if (typeof data.categoryId === 'string') return store.catalog?.categories.find(c => c.id === data.categoryId)?.name ?? '';
  if (typeof data.accountId === 'string') return store.catalog?.accounts.find(a => a.id === data.accountId)?.name ?? '';
  return '';
}

function Value({ value, field, store }: { value: unknown; field: string; store: FinanceStore }): ReactNode {
  if (value === null || value === undefined || value === '') return <span className="finance-muted">—</span>;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    if (field.endsWith('Minor') && /^-?\d+$/.test(value)) return <Money book={store.book!} value={value} />;
    if (field === 'accountId' || field === 'destinationAccountId') return store.catalog?.accounts.find(a => a.id === value)?.name ?? value;
    if (field === 'categoryId' || field === 'parentId') return store.catalog?.categories.find(c => c.id === value)?.name ?? value;
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return field.endsWith('At') ? displayTimestamp(value, store.book!.timezone) : displayDate(value);
    return /^[A-Z_]+$/.test(value) ? titleCase(value.replaceAll('_', ' ')) : value;
  }
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.length ? <div className="finance-change-values">{value.map((item, i) => <div key={i}><Value value={item} field={field} store={store} /></div>)}</div> : <span className="finance-muted">None</span>;
  const fields = Object.entries(record(value)).filter(([key]) => !hiddenFields.has(key));
  return fields.length ? <dl className="finance-change-record">{fields.map(([key, item]) => <div key={key}><dt>{fieldLabel(key)}</dt><dd><Value value={item} field={key} store={store} /></dd></div>)}</dl> : <span className="finance-muted">No details</span>;
}

export function ChangeDetails({ change, store }: { change: Change; store: FinanceStore }) {
  const before = record(change.before), after = record(change.after);
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => !hiddenFields.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  return <div className="finance-history-body">
    {fields.length ? <div className="finance-table-wrap"><table className="finance-table finance-change-table"><thead><tr><th>Changed field</th><th>Before</th><th>After</th></tr></thead><tbody>{fields.map(key => <tr key={key}><th scope="row">{fieldLabel(key)}</th><td><Value value={before[key]} field={key} store={store} /></td><td><Value value={after[key]} field={key} store={store} /></td></tr>)}</tbody></table></div> : <p className="finance-note">No field-level changes recorded. See technical details for the original record.</p>}
    <Help title="Technical details"><p className="finance-note">Record ID: {change.entityId}</p><div className="finance-grid"><div><h3>Before</h3><pre className="finance-source">{JSON.stringify(change.before, null, 2)}</pre></div><div><h3>After</h3><pre className="finance-source">{JSON.stringify(change.after, null, 2)}</pre></div></div></Help>
  </div>;
}
