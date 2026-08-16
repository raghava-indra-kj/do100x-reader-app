import { observer } from 'mobx-react-lite';
import { X, Clock, Check } from 'lucide-react';
import type { TasksStore } from '../store';

interface Props {
  store: TasksStore;
}

export const StopTimerDialog = observer(({ store }: Props) => {
  if (!store.isStopTimerDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-strong)]">Record Time Session</h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">Save your focus session details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => store.setIsStopTimerDialogOpen(false)}
            className="p-1.5 rounded-xl hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Elapsed summary */}
          <div className="p-4 rounded-2xl bg-[var(--color-surface-soft)]/50 border border-[var(--color-border-subtle)] text-center space-y-1">
            <span className="text-[var(--color-text-subtle)] uppercase font-bold text-[10px] tracking-wider">
              Session Duration
            </span>
            <div className="text-3xl font-bold font-mono text-[var(--color-text-strong)]">
              {store.formattedTimerElapsed}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
              Task: <strong className="text-[var(--color-text-strong)]">{store.activeTimer?.taskTitle}</strong>
            </p>
          </div>

          {/* Session Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--color-text-strong)]">
              What did you accomplish? (Optional)
            </label>
            <textarea
              rows={3}
              value={store.stopTimerNotes}
              onChange={(e) => store.setStopTimerNotes(e.target.value)}
              placeholder="e.g. Completed Chapter 4 analysis and wrote summary notes..."
              className="w-full p-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] transition"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border-subtle)] flex items-center justify-end space-x-2 bg-[var(--color-surface-soft)]/30">
          <button
            type="button"
            onClick={() => store.setIsStopTimerDialogOpen(false)}
            className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => store.completeStopTimer()}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Save & Record</span>
          </button>
        </div>
      </div>
    </div>
  );
});
