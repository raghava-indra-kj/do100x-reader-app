import { observer } from 'mobx-react-lite';
import {
  Inbox,
  Calendar,
  CalendarDays,
  Grid,
  BarChart2,
  CheckCircle2,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  ListTodo,
} from 'lucide-react';
import type { TasksStore } from '../store';
import { useState } from 'react';

interface Props {
  store: TasksStore;
}

export const TasksSidebar = observer(({ store }: Props) => {
  const [menuOpenListId, setMenuOpenListId] = useState<string | null>(null);

  const smartFilters = [
    {
      id: 'inbox',
      label: 'Inbox',
      icon: Inbox,
      count: store.inboxCounts.uncompletedCount,
      color: '#3b82f6',
    },
    {
      id: 'today',
      label: 'Today',
      icon: Calendar,
      count: store.tasks.filter((t) => {
        if (t.isDone || !t.dueDate) return false;
        const d = new Date(t.dueDate).toISOString().slice(0, 10);
        return d === new Date().toISOString().slice(0, 10);
      }).length,
      color: '#10b981',
    },
    {
      id: 'next7',
      label: 'Next 7 Days',
      icon: CalendarDays,
      count: null,
      color: '#8b5cf6',
    },
    {
      id: 'matrix',
      label: 'Eisenhower Matrix',
      icon: Grid,
      count: null,
      color: '#f59e0b',
    },
    {
      id: 'analytics',
      label: 'Time Analytics',
      icon: BarChart2,
      count: null,
      color: '#ec4899',
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: CheckCircle2,
      count: null,
      color: '#6b7280',
    },
  ];

  return (
    <aside className="w-60 flex-shrink-0 border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] flex items-center justify-center shadow-xs">
            <ListTodo className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-xs text-[var(--color-text-strong)] block leading-none">Tasks</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Smart Views Section */}
        <div className="space-y-0.5">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">
            Views
          </div>
          {smartFilters.map((f) => {
            const Icon = f.icon;
            const isActive = store.currentView === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => store.setCurrentView(f.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--color-brand)] text-white shadow-xs font-semibold'
                    : 'text-[var(--color-text-body)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-strong)]'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <Icon
                    className="w-3.5 h-3.5 shrink-0 transition-colors"
                    style={{ color: isActive ? '#ffffff' : f.color }}
                  />
                  <span className="truncate">{f.label}</span>
                </div>
                {f.count !== null && f.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--color-surface-soft)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Lists / Projects Section */}
        <div className="space-y-0.5 pt-2 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">
              Lists
            </span>
            <button
              type="button"
              onClick={() => store.openCreateListDialog()}
              title="Create new list"
              className="p-0.5 rounded hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {store.lists.length === 0 ? (
            <div className="px-2 py-3 text-xs text-[var(--color-text-muted)] text-center border border-dashed border-[var(--color-border-subtle)] rounded-md bg-[var(--color-surface-soft)]/20">
              <p className="text-[11px]">No custom lists.</p>
              <button
                type="button"
                onClick={() => store.openCreateListDialog()}
                className="mt-1 inline-flex items-center space-x-1 text-[11px] text-[var(--color-brand)] hover:underline font-semibold cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add List</span>
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {store.lists.map((list) => {
                const isActive = store.currentView === `list:${list.id}`;
                const isMenuOpen = menuOpenListId === list.id;

                return (
                  <div key={list.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => store.setCurrentView(`list:${list.id}`)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-[var(--color-brand)] text-white shadow-xs font-semibold'
                          : 'text-[var(--color-text-body)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-strong)]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: list.color || '#3b82f6' }}
                        />
                        <span className="truncate">{list.name}</span>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        {list.uncompletedCount > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[var(--color-surface-soft)] text-[var(--color-text-muted)]'
                            }`}
                          >
                            {list.uncompletedCount}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenListId(isMenuOpen ? null : list.id);
                          }}
                          className={`p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-black/15 transition cursor-pointer ${
                            isActive ? 'text-white' : 'text-[var(--color-text-muted)]'
                          }`}
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </button>

                    {/* Context Dropdown */}
                    {isMenuOpen && (
                      <div
                        className="absolute right-1 top-full mt-1 z-30 w-36 bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] rounded-lg shadow-xl border border-[var(--color-border-default)] py-1 text-xs animate-in fade-in duration-100"
                        onMouseLeave={() => setMenuOpenListId(null)}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpenListId(null);
                            store.openEditListDialog(list);
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-[var(--color-surface-soft)] transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                          <span>Edit List</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpenListId(null);
                            store.requestConfirmation({
                              title: 'Delete List',
                              message: `Are you sure you want to delete "${list.name}"? Existing tasks will be moved to your Inbox.`,
                              confirmLabel: 'Delete List',
                              confirmVariant: 'danger',
                              onConfirm: () => store.deleteList(list.id),
                            });
                          }}
                          className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-[var(--color-error-soft)] text-[var(--color-error)] transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete List</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});
