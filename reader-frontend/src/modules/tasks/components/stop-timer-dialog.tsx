import { observer } from 'mobx-react-lite';
import { X, Clock, Check, RotateCcw, Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import type { TasksStore } from '../store';

interface Props {
  store: TasksStore;
}

export const StopTimerDialog = observer(({ store }: Props) => {
  if (!store.isStopTimerDialogOpen) return null;

  const actualMinutes = store.stopTimerOriginalMinutes;
  const recordedMinutes = store.stopTimerDurationMinutes;
  const deltaMinutes = recordedMinutes - actualMinutes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[var(--color-text-strong)]">Record Focus Session</h2>
              <p className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[240px]">
                {store.activeTimer?.taskTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => store.setIsStopTimerDialogOpen(false)}
            className="p-1 rounded-md hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Duration Adjuster Box */}
          <div className="p-3.5 rounded-lg bg-[var(--color-surface-soft)]/50 border border-[var(--color-border-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[var(--color-text-subtle)] tracking-wider">
                Recorded Duration
              </span>
              {deltaMinutes !== 0 && (
                <button
                  type="button"
                  onClick={() => store.setStopTimerDurationMinutes(actualMinutes)}
                  className="flex items-center space-x-1 text-[10px] text-[var(--color-brand)] hover:underline font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset to {actualMinutes}m</span>
                </button>
              )}
            </div>

            {/* Main Interactive Duration Counter */}
            <div className="flex items-center justify-center space-x-3 py-1">
              <button
                type="button"
                onClick={() => store.adjustStopTimerMinutes(-5)}
                title="Subtract 5 minutes"
                className="w-8 h-8 rounded-md bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-canvas)] border border-[var(--color-border-default)] flex items-center justify-center text-[var(--color-text-strong)] transition shadow-2xs cursor-pointer active:scale-95"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-baseline space-x-1.5">
                <input
                  type="number"
                  min={1}
                  value={recordedMinutes}
                  onChange={(e) => store.setStopTimerDurationMinutes(parseInt(e.target.value, 10) || 1)}
                  className="w-16 text-center text-2xl font-bold font-mono bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-md py-0.5 text-[var(--color-text-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                />
                <span className="text-xs font-bold text-[var(--color-text-muted)]">min</span>
              </div>

              <button
                type="button"
                onClick={() => store.adjustStopTimerMinutes(5)}
                title="Add 5 minutes"
                className="w-8 h-8 rounded-md bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-canvas)] border border-[var(--color-border-default)] flex items-center justify-center text-[var(--color-text-strong)] transition shadow-2xs cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Reduce & Add Stepper Chips */}
            <div className="space-y-1.5 pt-1 border-t border-[var(--color-border-subtle)]">
              {/* Quick Reduction Chips (Highlighted for stepping away / trimming time) */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">Trim away time:</span>
                <div className="flex items-center space-x-1">
                  {[-20, -15, -10, -5, -1].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => store.adjustStopTimerMinutes(amt)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition cursor-pointer active:scale-95"
                    >
                      {amt}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Add Chips */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[var(--color-text-muted)]">Add time:</span>
                <div className="flex items-center space-x-1">
                  {[1, 5, 10, 15, 30].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => store.adjustStopTimerMinutes(amt)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-brand-soft)] hover:bg-[var(--color-brand)]/20 text-[var(--color-brand-on-soft)] border border-[var(--color-brand)]/20 transition cursor-pointer active:scale-95"
                    >
                      +{amt}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary Delta Banner */}
            {deltaMinutes !== 0 && (
              <div className="flex items-center justify-center space-x-1.5 py-1 px-2 rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-[11px]">
                <span className="text-[var(--color-text-muted)]">Timer: {actualMinutes}m</span>
                <ArrowRight className="w-3 h-3 text-[var(--color-text-muted)]" />
                <strong className={deltaMinutes < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                  {recordedMinutes}m ({deltaMinutes > 0 ? `+${deltaMinutes}m` : `${deltaMinutes}m`})
                </strong>
              </div>
            )}
          </div>

          {/* Session Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--color-text-strong)]">
              What did you accomplish? (Optional)
            </label>
            <textarea
              rows={2}
              value={store.stopTimerNotes}
              onChange={(e) => store.setStopTimerNotes(e.target.value)}
              placeholder="e.g. Completed section review and drafted summary..."
              className="w-full p-2 text-xs rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] transition"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-surface-soft)]/20">
          <button
            type="button"
            onClick={() => {
              store.requestConfirmation({
                title: 'Discard Timer',
                message: 'Are you sure you want to discard this timer without recording any time?',
                confirmLabel: 'Discard Session',
                confirmVariant: 'danger',
                onConfirm: () => store.discardActiveTimer(),
              });
            }}
            className="flex items-center space-x-1 text-xs text-[var(--color-error)] hover:underline font-medium cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Discard</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => store.setIsStopTimerDialogOpen(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => store.completeStopTimer()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Save & Record ({recordedMinutes}m)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
