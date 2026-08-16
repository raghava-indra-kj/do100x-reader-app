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
      <div className="w-full max-w-sm bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-strong)]">
                {store.editingListId ? 'Edit List' : 'Create New List'}
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">Organize your tasks by project</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => store.setIsListDialogOpen(false)}
            className="p-1.5 rounded-xl hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* List Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--color-text-strong)]">List Name</label>
            <input
              type="text"
              placeholder="e.g. Work, Deep Reading, Side Project..."
              value={store.listNameInput}
              onChange={(e) => store.setListNameInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] transition"
              autoFocus
            />
          </div>

          {/* Color Palette */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-[var(--color-text-strong)]">Accent Color</label>
            <div className="flex items-center justify-between pt-1">
              {LIST_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => store.setListColorInput(c)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center shadow-xs ${
                    store.listColorInput === c ? 'scale-110 ring-2 ring-offset-2 ring-[var(--color-brand)]' : 'hover:scale-105'
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
        <div className="p-4 border-t border-[var(--color-border-subtle)] flex items-center justify-end space-x-2 bg-[var(--color-surface-soft)]/30">
          <button
            type="button"
            onClick={() => store.setIsListDialogOpen(false)}
            className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => store.saveList()}
            disabled={!store.listNameInput.trim()}
            className="px-5 py-2 bg-[var(--color-brand)] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[var(--color-brand-hover)] disabled:opacity-35 transition"
          >
            {store.editingListId ? 'Update List' : 'Create List'}
          </button>
        </div>
      </div>
    </div>
  );
});
