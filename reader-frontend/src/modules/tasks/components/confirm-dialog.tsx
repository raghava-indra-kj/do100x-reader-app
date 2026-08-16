import { observer } from 'mobx-react-lite';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';
import type { TasksStore } from '../store';

interface Props {
  store: TasksStore;
}

export const ConfirmDialog = observer(({ store }: Props) => {
  const modal = store.confirmationModal;
  if (!modal || !modal.isOpen) return null;

  const isDanger = modal.confirmVariant === 'danger';
  const isWarning = modal.confirmVariant === 'warning';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isDanger
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : isWarning
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)]'
              }`}
            >
              {isDanger ? (
                <Trash2 className="w-4 h-4" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-strong)]">{modal.title}</h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">Please confirm your action</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => store.closeConfirmation()}
            className="p-1.5 rounded-xl hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="p-5 text-xs text-[var(--color-text-body)] leading-relaxed">
          {modal.message}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-[var(--color-border-subtle)] flex items-center justify-end space-x-2 bg-[var(--color-surface-soft)]/30">
          <button
            type="button"
            onClick={() => store.closeConfirmation()}
            className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              const action = modal.onConfirm;
              store.closeConfirmation();
              if (action) await action();
            }}
            className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)]'
            }`}
          >
            {modal.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
});
