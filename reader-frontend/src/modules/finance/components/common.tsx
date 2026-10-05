import { cloneElement, isValidElement, useId, useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { observer } from 'mobx-react-lite';
import { AlertCircle, Wallet, X, RefreshCw } from 'lucide-react';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import type { Book } from '@domain/finance/models/finance';
import type { FinanceStore } from '../store';
import { moneyLabel } from '../format';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const generatedId = useId(), hintId = `${generatedId}-hint`;
  const control = isValidElement<{ id?: string; 'aria-describedby'?: string }>(children) ? children : null;
  const id = control?.props.id ?? generatedId;
  return <div className="finance-field"><label htmlFor={id}>{label}</label>{control ? cloneElement(control, { id, 'aria-describedby': [control.props['aria-describedby'], hint ? hintId : undefined].filter(Boolean).join(' ') || undefined }) : children}{hint && <small id={hintId}>{hint}</small>}</div>;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  // Native date/month inputs can emit input before change (e.g. segmented edits).
  // Keep the controlled draft synchronized, not just the visibly edited DOM value.
  return <input {...props} onInput={event => { props.onInput?.(event); if (props.type === 'date' || props.type === 'month') props.onChange?.({ ...event, target: event.currentTarget }); }} className={`finance-input ${props.className ?? ''}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={`finance-input ${props.className ?? ''}`} />; }
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={`finance-input ${props.className ?? ''}`} />; }
export function Check({ label, checked, onChange, disabled, compact = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean; compact?: boolean }) {
  return <label className={`finance-check ${compact ? 'finance-check-compact' : ''}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span className={compact ? 'finance-sr-only' : undefined}>{label}</span></label>;
}
export function Money({ value, book, color = false }: { value: string | bigint; book: Book; color?: boolean }) {
  const amount = BigInt(value);
  return <span className={`finance-money ${color ? amount < 0n ? 'finance-negative' : amount > 0n ? 'finance-positive' : '' : ''}`}>{moneyLabel(amount, book)}</span>;
}
export const FinanceHeader = observer(function FinanceHeader({ title, subtitle, actions, store, card = false }: { title: string; subtitle?: string; actions?: ReactNode; store?: FinanceStore; card?: boolean }) {
  return <div className={card ? 'finance-card-header' : 'finance-page-heading'}><div className="finance-heading-copy">{card ? <h2>{title}</h2> : <h1>{title}</h1>}{subtitle && <p>{subtitle}</p>}</div><div className="finance-actions">{actions}{store && <Button variant="ghost" size="sm" iconOnly aria-label="Refresh finance" tooltip="Refresh" disabled={store.loading || store.busy} onClick={() => void (store.bookId ? store.refresh() : store.loadBooks())}><RefreshCw size={14} aria-hidden="true" /></Button>}</div></div>;
});
export function Section({ title, subtitle, actions, children, store }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; store?: FinanceStore }) {
  return <section className="finance-card"><FinanceHeader card title={title} subtitle={subtitle} actions={actions} store={store} />{children}</section>;
}
export function Empty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="finance-empty"><Wallet size={28} aria-hidden="true" /><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function Alert({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={`finance-alert ${error ? 'finance-alert-error' : ''}`} role={error ? 'alert' : 'note'}><AlertCircle size={17} aria-hidden="true" /><div>{children}</div></div>;
}
export function AmountRange({ low, expected, high, book }: { low: string; expected: string; high: string; book: Book }) {
  const fixed = BigInt(low) === BigInt(expected) && BigInt(expected) === BigInt(high);
  return <div className="finance-amount-range"><strong><Money value={expected} book={book} /></strong>{!fixed && <small>Expected · Min <Money value={low} book={book} /> · Max <Money value={high} book={book} /></small>}</div>;
}
export function Help({ title, children }: { title: string; children: ReactNode }) {
  return <details className="finance-help"><summary>{title}</summary><div className="finance-help-body">{children}</div></details>;
}
export function ViewTabs<T extends string>({ label, items, value, onChange }: { label: string; items: readonly { id: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <nav className="finance-view-tabs" aria-label={label}>{items.map(item => <button type="button" key={item.id} aria-current={value === item.id ? 'page' : undefined} onClick={() => onChange(item.id)}>{item.label}</button>)}</nav>;
}
export const FormDialog = observer(function FormDialog({ store, title, description, children, onClose, onSave, saveLabel = 'Save', wide = false }: { store: FinanceStore; title: string; description?: string; children: ReactNode; onClose: () => void; onSave: () => Promise<boolean>; saveLabel?: string; wide?: boolean }) {
  const titleId = useId(), descriptionId = useId();
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (store.busy) return; setError(null);
    try { if (await onSave()) onClose(); else setError(store.error ?? 'Couldn’t save. Check the fields and try again.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the highlighted fields.'); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !store.busy) onClose(); }} labelledBy={titleId} describedBy={description ? descriptionId : undefined} className={`finance-modal ${wide ? 'finance-modal-wide' : ''}`}>
    <form onSubmit={event => void submit(event)}>
      <div className="finance-modal-header"><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div><Button type="button" variant="ghost" iconOnly size="sm" aria-label="Close dialog" disabled={store.busy} onClick={onClose}><X size={18} /></Button></div>
      <div className="finance-modal-body">{error && <Alert error>{error}</Alert>}<fieldset disabled={store.busy}>{children}</fieldset></div>
      <div className="finance-modal-footer"><Button type="button" variant="outlined" disabled={store.busy} onClick={onClose}>Cancel</Button><Button type="submit" loading={store.busy}>{saveLabel}</Button></div>
    </form>
  </Dialog>;
});
export function PeriodForm({ from, to, onApply }: { from: string; to: string; onApply: (from: string, to: string) => void }) {
  const [start, setStart] = useState(from), [end, setEnd] = useState(to);
  return <form className="finance-period" onSubmit={event => { event.preventDefault(); onApply(start, end); }}><Field label="From"><Input type="date" required value={start} onChange={event => setStart(event.target.value)} /></Field><Field label="To"><Input type="date" required min={start} value={end} onChange={event => setEnd(event.target.value)} /></Field><Button type="submit" variant="outlined" size="sm">Show period</Button></form>;
}
