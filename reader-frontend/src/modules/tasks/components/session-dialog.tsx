import { observer } from 'mobx-react-lite';
import { X, Clock } from 'lucide-react';
import type { TasksStore } from '../store';

interface Props {
  store: TasksStore;
}

export const SessionDialog = observer(({ store }: Props) => {
  if (!store.isSessionDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[var(--color-text-strong)]">
                {store.editingSessionId ? 'Edit Time Session' : 'Log Time Session'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => store.setIsSessionDialogOpen(false)}
            className="p-1 rounded-md hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Duration Minutes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--color-text-strong)]">Duration (Minutes)</label>
            <input
              type="number"
              min={1}
              value={store.sessionDurationMinutes}
              onChange={(e) => store.setSessionDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full p-2 text-xs rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] text-[var(--color-text-strong)]"
              autoFocus
            />
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--color-text-strong)]">Date</label>
            <input
              type="date"
              value={store.sessionDateInput}
              onChange={(e) => store.setSessionDateInput(e.target.value)}
              className="w-full p-2 text-xs rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] text-[var(--color-text-strong)] cursor-pointer"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--color-text-strong)]">Session Notes (Optional)</label>
            <textarea
              rows={3}
              value={store.sessionNotesInput}
              onChange={(e) => store.setSessionNotesInput(e.target.value)}
              placeholder="What did you work on during this time?"
              className="w-full p-2 text-xs rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--color-border-subtle)] flex items-center justify-end space-x-2 bg-[var(--color-surface-soft)]/20">
          <button
            type="button"
            onClick={() => store.setIsSessionDialogOpen(false)}
            className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => store.saveSession()}
            className="px-3.5 py-1.5 bg-[var(--color-brand)] text-white text-xs font-semibold rounded-md shadow-xs hover:bg-[var(--color-brand-hover)] transition cursor-pointer"
          >
            {store.editingSessionId ? 'Update Session' : 'Add Session'}
          </button>
        </div>
      </div>
    </div>
  );
});
