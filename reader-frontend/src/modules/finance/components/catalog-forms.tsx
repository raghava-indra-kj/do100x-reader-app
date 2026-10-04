import { useState } from 'react';
import type { Account, Book, Category } from '@domain/finance/models/finance';
import type { FinanceStore } from '../store';
import { Check, Field, FormDialog, Input, Select, Textarea } from './common';

export function AccountOptions({ store, includeArchived = false }: { store: FinanceStore; includeArchived?: boolean }) {
  return (includeArchived ? store.catalog?.accounts : store.activeAccounts)?.map(item => <option key={item.id} value={item.id}>{item.name}{item.archivedAt ? ' (archived)' : ''}</option>);
}
export function CategoryOptions({ store, kind, exclude }: { store: FinanceStore; kind?: 'INCOME' | 'EXPENSE'; exclude?: string }) {
  return store.activeCategories.filter(item => (!kind || item.kind === kind) && item.id !== exclude).map(item => <option key={item.id} value={item.id}>{item.parentId ? `${store.catalog?.categories.find(parent => parent.id === item.parentId)?.name ?? ''} / ` : ''}{item.name}</option>);
}
export function BookForm({ store, existing, onClose }: { store: FinanceStore; existing?: Book; onClose: () => void }) {
  const [requestKey] = useState(() => crypto.randomUUID());
  const [name, setName] = useState(existing?.name ?? 'Personal finances'), [currency, setCurrency] = useState(existing?.currency ?? 'INR');
  const [timezone, setTimezone] = useState(existing?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [starter, setStarter] = useState(true), [archived, setArchived] = useState(!!existing?.archivedAt);
  return <FormDialog store={store} title={existing ? 'Book settings' : 'Create a book'} description="Keep accounts and plans together in one currency." onClose={onClose} onSave={async () => {
    const result = await store.mutate(() => existing ? store.repo.updateBook(existing.id, { expectedVersion: existing.version, name, timezone, archived }) : store.repo.createBook({ requestKey, name, currency, timezone, starterCategories: starter }));
    if (!result) return false;
    await store.loadBooks(); await store.selectBook(result.id); return true;
  }}><div className="finance-form-stack"><Field label="Book name"><Input required maxLength={255} value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Currency" hint="You can’t change the currency after creating this book."><Input required disabled={!!existing} maxLength={3} pattern="[A-Za-z]{3}" value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} /></Field><Field label="Timezone" hint="Used for dates and forecasts."><Input required value={timezone} onChange={e => setTimezone(e.target.value)} /></Field>{existing ? <Check label="Archive book (you can restore it later)" checked={archived} onChange={setArchived} /> : <Check label="Add starter categories" checked={starter} onChange={setStarter} />}</div></FormDialog>;
}
export function AccountForm({ store, existing, onClose }: { store: FinanceStore; existing?: Account; onClose: () => void }) {
  const [requestKey] = useState(() => crypto.randomUUID()), [name, setName] = useState(existing?.name ?? '');
  const [debt, setDebt] = useState(existing?.tracksDebt ?? false), [liquid, setLiquid] = useState(existing?.isLiquid ?? true);
  const [notes, setNotes] = useState(existing?.notes ?? ''), [opening, setOpening] = useState('0'), [date, setDate] = useState(store.today), [archived, setArchived] = useState(!!existing?.archivedAt);
  return <FormDialog store={store} title={existing ? 'Edit account' : 'Add account'} description="Give the account any name, such as Wallet, Savings or Loan." onClose={onClose} onSave={async () => !!await store.mutate(() => existing ? store.repo.updateAccount(store.bookId, existing.id, { expectedVersion: existing.version, name, tracksDebt: debt, isLiquid: liquid, notes: notes || null, archived }) : store.repo.createAccount(store.bookId, { requestKey, name, tracksDebt: debt, isLiquid: liquid, notes: notes || null, openingAmount: opening, openingDate: date }))}>
    <div className="finance-form-stack"><Field label="Account name"><Input required maxLength={255} placeholder="e.g. My wallet" value={name} onChange={e => setName(e.target.value)} /></Field><Check label="Debt account (use negative balances for money owed)" checked={debt} onChange={value => { setDebt(value); if (value) setLiquid(false); }} /><Check label="Include in cash forecasts" checked={liquid} onChange={setLiquid} />{!existing && <div className="finance-form-grid"><Field label="Opening balance" hint="Use a negative balance for debt. Opening balances don’t count as income."><Input required inputMode="decimal" value={opening} onChange={e => setOpening(e.target.value)} /></Field><Field label="Opening date"><Input required type="date" value={date} onChange={e => setDate(e.target.value)} /></Field></div>}<Field label="Notes"><Textarea rows={3} maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)} /></Field>{existing && <Check label="Archived (history kept)" checked={archived} onChange={setArchived} />}</div>
  </FormDialog>;
}
export function CategoryForm({ store, existing, onClose }: { store: FinanceStore; existing?: Category; onClose: () => void }) {
  const [requestKey] = useState(() => crypto.randomUUID()), [name, setName] = useState(existing?.name ?? ''), [kind, setKind] = useState<'INCOME' | 'EXPENSE'>(existing?.kind ?? 'EXPENSE'), [parent, setParent] = useState(existing?.parentId ?? ''), [archived, setArchived] = useState(!!existing?.archivedAt);
  return <FormDialog store={store} title={existing ? 'Edit category' : 'Add category'} onClose={onClose} onSave={async () => !!await store.mutate(() => existing ? store.repo.updateCategory(store.bookId, existing.id, { expectedVersion: existing.version, name, parentId: parent || null, archived }) : store.repo.createCategory(store.bookId, { requestKey, name, kind, parentId: parent || null }))}>
    <div className="finance-form-stack"><Field label="Name"><Input required maxLength={255} value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Used for"><Select disabled={!!existing} value={kind} onChange={e => { setKind(e.target.value as typeof kind); setParent(''); }}><option value="EXPENSE">Expenses</option><option value="INCOME">Income</option></Select></Field><Field label="Parent category"><Select value={parent} onChange={e => setParent(e.target.value)}><option value="">No parent</option><CategoryOptions store={store} kind={kind} exclude={existing?.id} /></Select></Field>{existing && <Check label="Archived (history kept)" checked={archived} onChange={setArchived} />}</div>
  </FormDialog>;
}
