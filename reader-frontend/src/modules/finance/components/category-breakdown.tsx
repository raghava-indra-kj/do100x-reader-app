import { useState } from 'react';
import type { Book, Report } from '@domain/finance/models/finance';
import { Empty, Money, ViewTabs } from './common';

type CategoryTotal = Report['categories'][number];
const magnitude = (value: string) => BigInt(value) < 0n ? -BigInt(value) : BigInt(value);

export function CategoryBreakdown({ report, book }: { report: Report; book: Book }) {
  const [kind, setKind] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const all = report.categories.filter(item => item.kind === kind);
  const visible = new Set<string>();
  // Keep nonzero entries and their ancestors, including groups whose refunds offset spending.
  for (const item of all.filter(c => BigInt(c.rollupMinor) !== 0n || BigInt(c.directMinor) !== 0n)) {
    let current: CategoryTotal | undefined = item;
    while (current && !visible.has(current.id)) {
      visible.add(current.id);
      current = all.find(parent => parent.id === current?.parentId);
    }
  }
  const categories = all.filter(item => visible.has(item.id));
  const roots = categories.filter(item => !item.parentId || !categories.some(parent => parent.id === item.parentId));
  const sort = (items: CategoryTotal[]) => [...items].sort((a, b) => magnitude(a.rollupMinor) > magnitude(b.rollupMinor) ? -1 : magnitude(a.rollupMinor) < magnitude(b.rollupMinor) ? 1 : a.name.localeCompare(b.name));
  const total = roots.reduce((sum, item) => sum + magnitude(item.rollupMinor), 0n);
  const renderCategory = (item: CategoryTotal, ancestors: string[] = []): React.ReactNode => {
    if (ancestors.includes(item.id)) return null;
    const children = sort(categories.filter(child => child.parentId === item.id));
    if (BigInt(item.rollupMinor) === 0n && !children.length) return null;
    const width = total ? Number(magnitude(item.rollupMinor) * 10000n / total) / 100 : 0;
    const content = <><div className="finance-category-total"><span>{item.name}</span><strong><Money book={book} value={item.rollupMinor} /></strong></div>{!ancestors.length && <div className={`finance-category-bar finance-category-bar-${kind.toLowerCase()}`} aria-hidden="true"><span style={{ width: `${Math.min(100, width)}%` }} /></div>}</>;
    return children.length ? <details key={item.id} className="finance-category-branch"><summary>{content}<small>{children.length} {children.length === 1 ? 'subcategory' : 'subcategories'} · Included in total</small></summary><div className="finance-category-children">{BigInt(item.directMinor) !== 0n && <div className="finance-category-leaf"><div className="finance-category-total"><span>Directly in {item.name}</span><Money book={book} value={item.directMinor} /></div></div>}{children.map(child => renderCategory(child, [...ancestors, item.id]))}</div></details> : <div key={item.id} className="finance-category-leaf">{content}</div>;
  };
  return <><div className="finance-category-tabs"><ViewTabs label="Category report type" value={kind} onChange={setKind} items={[{ id: 'EXPENSE', label: 'Spending' }, { id: 'INCOME', label: 'Income' }]} /></div>{sort(roots).map(item => renderCategory(item))}{!roots.length && <Empty title={`No ${kind === 'EXPENSE' ? 'spending' : 'income'} categories`} description="Recorded categories will appear here for the selected period." />}<div className="finance-row finance-uncategorized"><span>Uncategorized {kind === 'EXPENSE' ? 'spending' : 'income'}</span><Money book={book} value={kind === 'EXPENSE' ? report.unclassifiedExpenseMinor : report.unclassifiedIncomeMinor} /></div></>;
}
