import { useId, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import type { TasksStore } from '../store';
export const ConfirmDialog = observer(({ store }: { store: TasksStore }) => {
  const title = useId(), description = useId(), lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const modal = store.confirmationModal;
  if (!modal?.isOpen) return null;
  const close = () => { if (!lock.current) { setError(''); store.closeConfirmation(); } };
  return <Dialog open stacked={store.isStopTimerDialogOpen} onOpenChange={open => { if (!open) close(); }} labelledBy={title} describedBy={description} className="max-w-sm p-5">
    <h2 id={title} className="flex items-center gap-2 text-base font-semibold"><AlertTriangle size={18} />{modal.title}</h2>
    <p id={description} className="my-4 text-sm text-[var(--color-text-muted)]">{modal.message}</p>
    {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-2"><Button variant="outlined" disabled={busy} onClick={close}>Cancel</Button><Button disabled={busy} loading={busy} className={modal.confirmVariant === 'danger' ? 'bg-rose-600' : ''} onClick={async () => {
      if (lock.current) return; lock.current = true; setBusy(true); setError('');
      try { const saved = await modal.onConfirm(); if (saved === false) setError('The change was not saved. Please try again.'); else if (store.confirmationModal === modal) store.closeConfirmation(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Couldn’t save this change. Please try again.'); }
      finally { lock.current = false; setBusy(false); }
    }}>{modal.confirmLabel || 'Confirm'}</Button></div>
  </Dialog>;
});
