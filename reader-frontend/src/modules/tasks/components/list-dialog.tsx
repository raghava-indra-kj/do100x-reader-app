import { observer } from 'mobx-react-lite';
import { X, Check, Layers } from 'lucide-react';
import type { TasksStore } from '../store';

interface Props {
  store: TasksStore;
}

const LIST_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#64748b', // slate
];

export const ListDialog = observer(({ store }: Props) => {
  if (!store.isListDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-foreground">
              {store.editingListId ? 'Edit List' : 'New List'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => store.setIsListDialogOpen(false)}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* List Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground">List Name</label>
            <input
              type="text"
              placeholder="e.g. Work, Deep Reading, Side Project..."
              value={store.listNameInput}
              onChange={(e) => store.setListNameInput(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              autoFocus
            />
          </div>

          {/* Color Palette */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground">Color</label>
            <div className="flex items-center space-x-2">
              {LIST_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => store.setListColorInput(c)}
                  className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${
                    store.listColorInput === c ? 'scale-110 ring-2 ring-offset-2 ring-primary' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {store.listColorInput === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end space-x-2 bg-muted/20">
          <button
            type="button"
            onClick={() => store.setIsListDialogOpen(false)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => store.saveList()}
            disabled={!store.listNameInput.trim()}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 disabled:opacity-40 transition"
          >
            {store.editingListId ? 'Update' : 'Create List'}
          </button>
        </div>
      </div>
    </div>
  );
});
