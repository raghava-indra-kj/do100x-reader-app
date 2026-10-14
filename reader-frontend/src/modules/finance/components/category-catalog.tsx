import { useState, type ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { Pencil } from 'lucide-react';
import type { Category } from '@domain/finance/models/finance';
import { Button } from '@modules/core/ui/primitives/button';
import type { FinanceStore } from '../store';
import { Field, Input, Select } from './common';

export const CategoryCatalog = observer(function CategoryCatalog({ store, onEdit }: { store: FinanceStore; onEdit: (item: Category) => void }) {
  const [search, setSearch] = useState(''), [status, setStatus] = useState('active');
  const all = store.catalog?.categories ?? [];
  const matches = (item: Category) => (status === 'all' || (status === 'archived' ? !!item.archivedAt : !item.archivedAt)) && item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const render = (item: Category, ancestors: string[] = []): ReactNode => {
    if (ancestors.includes(item.id)) return null;
    const children = all.filter(child => child.parentId === item.id).sort((a, b) => a.name.localeCompare(b.name)).map(child => render(child, [...ancestors, item.id])).filter(Boolean);
    if (!matches(item) && !children.length) return null;
    return <div key={item.id} className={ancestors.length ? 'finance-category-catalog-child' : undefined}><div className="finance-row"><div><strong>{item.name}</strong>{item.archivedAt && <p>Archived</p>}</div><Button variant="ghost" iconOnly size="sm" disabled={store.readOnly || store.busy} aria-label={`Edit category ${item.name}`} tooltip="Edit category" onClick={() => onEdit(item)}><Pencil size={15} /></Button></div>{children}</div>;
  };
  return <><div className="finance-quick-filter-row"><Field label="Search categories"><Input type="search" placeholder="Find a category…" value={search} onChange={e => setSearch(e.target.value)} /></Field><Field label="Category status"><Select value={status} onChange={e => setStatus(e.target.value)}><option value="active">Active categories</option><option value="archived">Archived categories</option><option value="all">All categories</option></Select></Field></div><div className="finance-category-grid">{(['EXPENSE', 'INCOME'] as const).map(kind => {
    const groups = all.filter(c => c.kind === kind && (!c.parentId || !all.some(p => p.id === c.parentId))).sort((a, b) => a.name.localeCompare(b.name)).map(item => render(item)).filter(Boolean);
    return <div key={kind}><h3 className="finance-group-heading">{kind === 'EXPENSE' ? 'Expenses' : 'Income'}</h3>{groups.length ? groups : <p className="finance-card-body finance-muted">No matching categories.</p>}</div>;
  })}</div></>;
});
