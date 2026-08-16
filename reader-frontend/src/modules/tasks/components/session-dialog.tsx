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
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              {store.editingSessionId ? 'Edit Time Session' : 'Log Time Session'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => store.setIsSessionDialogOpen(false)}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Duration Minutes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground">Duration (Minutes)</label>
            <input
              type="number"
              min={1}
              value={store.sessionDurationMinutes}
              onChange={(e) => store.setSessionDurationMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground">Date</label>
            <input
              type="date"
              value={store.sessionDateInput}
              onChange={(e) => store.setSessionDateInput(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground">Session Notes (Optional)</label>
            <textarea
              rows={3}
              value={store.sessionNotesInput}
              onChange={(e) => store.setSessionNotesInput(e.target.value)}
              placeholder="What did you work on during this time?"
              className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end space-x-2 bg-muted/20">
          <button
            type="button"
            onClick={() => store.setIsSessionDialogOpen(false)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => store.saveSession()}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 transition"
          >
            {store.editingSessionId ? 'Update Session' : 'Add Session'}
          </button>
        </div>
      </div>
    </div>
  );
});
