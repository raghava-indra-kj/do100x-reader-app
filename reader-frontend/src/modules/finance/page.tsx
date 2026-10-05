import { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { LayoutDashboard, ArrowLeftRight, Landmark, CalendarClock, Upload, ChartNoAxesCombined, Settings2, History, Plus } from 'lucide-react';
import { AppBar } from '@modules/core/ui/components/appbar/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { useAuthStore } from '@modules/auth/provider/store';
import { FinanceStore, type FinanceTab } from './store';
import { Alert, Empty, Field, Select, FinanceHeader } from './components/common';
import { BookForm } from './components/catalog-forms';
import { AccountsPanel, RegisterPanel } from './components/ledger-panels';
import { ReportsPanel } from './components/report-panels';
import { PlansPanel } from './components/plan-panels';
import { ImportsPanel } from './components/import-panels';
import { ManagePanel, HistoryPanel } from './components/manage-panels';
import './finance.css';

const tabs = [
  ['overview', 'Overview', LayoutDashboard], ['transactions', 'Transactions', ArrowLeftRight], ['accounts', 'Accounts', Landmark], ['plans', 'Plans and bills', CalendarClock], ['imports', 'Imports', Upload], ['reports', 'Reports', ChartNoAxesCombined], ['manage', 'Manage', Settings2], ['history', 'History', History],
] as const;
const FinanceApp = observer(function FinanceApp() {
  const store = useMemo(() => new FinanceStore(), []), [createBook, setCreateBook] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { store.start(); return () => store.destroy(); }, [store]);
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [store.bookId, store.tab]);
  const panels: Record<FinanceTab, React.ReactNode> = { overview: <ReportsPanel store={store} overview />, transactions: <RegisterPanel store={store} />, accounts: <AccountsPanel store={store} />, plans: <PlansPanel store={store} />, imports: <ImportsPanel store={store} />, reports: <ReportsPanel store={store} />, manage: <ManagePanel store={store} />, history: <HistoryPanel store={store} /> };
  return <div className="finance-page"><AppBar /><div className="finance-shell"><aside className="finance-sidebar"><div className="finance-book-picker"><Field label="Finance book"><Select aria-label="Finance book" disabled={store.busy || store.loading} value={store.bookId} onChange={e => void store.selectBook(e.target.value)}>{!store.books.length && <option value="">No books yet</option>}{store.books.map(book => <option key={book.id} value={book.id}>{book.name}{book.archivedAt ? ' (archived)' : ''}</option>)}</Select></Field><Button variant="outlined" size="sm" iconOnly aria-label="New book" tooltip="New book" disabled={store.busy} onClick={() => setCreateBook(true)}><Plus size={14} aria-hidden="true" /></Button></div><nav className="finance-nav" aria-label="Finance navigation">{tabs.map(([id, label, Icon]) => <button key={id} type="button" aria-current={store.tab === id ? 'page' : undefined} disabled={!store.bookId || store.busy} onClick={() => store.setTab(id)}><Icon size={17} aria-hidden="true" />{label}</button>)}</nav><p className="finance-sidebar-note">This app doesn’t connect to your bank or make payments.</p></aside>
    <main ref={mainRef} className="finance-main"><div className="finance-content">{!store.bookId && <FinanceHeader title="Finance books" store={store} />}{(store.loading || store.notice) && <div role="status" className="finance-muted">{store.loading ? 'Loading…' : store.notice}</div>}{store.error && <Alert error>{store.error} <Button size="sm" variant="ghost" onClick={store.clearError}>Dismiss</Button></Alert>}{store.readOnly && <Alert>This book is archived. Restore it in Manage → Book settings to make changes.</Alert>}
      {!store.bookId && !store.loading ? <Empty title="Your finances, in one place" description="Start with a book, then add your accounts and transactions." action={<Button onClick={() => setCreateBook(true)}>Create book</Button>} /> : store.book && <div key={`${store.bookId}/${store.tab}`} className="finance-workspace">{panels[store.tab]}</div>}
    </div></main></div>{createBook && <BookForm store={store} onClose={() => setCreateBook(false)} />}</div>;
});
export default observer(function FinancePage() {
  const auth = useAuthStore();
  // Remount all state and drafts on a change of signed-in identity.
  return <FinanceApp key={auth.currentUser.id} />;
});
