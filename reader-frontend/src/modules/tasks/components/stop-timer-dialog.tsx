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
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Record Time Session</h2>
          </div>
          <button
            type="button"
            onClick={() => store.setIsStopTimerDialogOpen(false)}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Elapsed summary */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border text-center space-y-1">
            <span className="text-muted-foreground uppercase font-semibold text-[10px]">Session Duration</span>
            <div className="text-2xl font-bold font-mono text-foreground">{store.formattedTimerElapsed}</div>
            <p className="text-[11px] text-muted-foreground">
              Task: <strong className="text-foreground">{store.activeTimer?.taskTitle}</strong>
            </p>
          </div>

          {/* Session Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground">What did you accomplish? (Optional)</label>
            <textarea
              rows={3}
              value={store.stopTimerNotes}
              onChange={(e) => store.setStopTimerNotes(e.target.value)}
              placeholder="e.g. Completed Chapter 4 analysis and wrote summary notes..."
              className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end space-x-2 bg-muted/20">
          <button
            type="button"
            onClick={() => store.setIsStopTimerDialogOpen(false)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => store.completeStopTimer()}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center space-x-1.5 transition"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Save & Record</span>
          </button>
        </div>
      </div>
    </div>
  );
});
