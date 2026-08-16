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
    <aside className="w-64 flex-shrink-0 border-r border-border bg-card/40 backdrop-blur flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <ListTodo className="w-5 h-5" />
          </div>
          <span className="font-bold text-base tracking-tight">Tasks & Timer</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Smart Views */}
        <div className="space-y-1">
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : ''}`} style={{ color: isActive ? undefined : f.color }} />
                  <span>{f.label}</span>
                </div>
                {f.count !== null && f.count > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Lists */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lists / Projects
            </span>
            <button
              type="button"
              onClick={() => store.openCreateListDialog()}
              title="Create new list"
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {store.lists.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center border border-dashed border-border rounded-lg">
              No custom lists yet.
              <button
                type="button"
                onClick={() => store.openCreateListDialog()}
                className="mt-1 block mx-auto text-primary hover:underline font-medium"
              >
                + Add List
              </button>
            </div>
          ) : (
            store.lists.map((list) => {
              const isActive = store.currentView === `list:${list.id}`;
              const isMenuOpen = menuOpenListId === list.id;

              return (
                <div key={list.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => store.setCurrentView(`list:${list.id}`)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: list.color || '#3b82f6' }}
                      />
                      <span className="truncate">{list.name}</span>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {list.uncompletedCount > 0 && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            isActive
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
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
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/10 transition ${
                          isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>

                  {/* List Context Dropdown */}
                  {isMenuOpen && (
                    <div
                      className="absolute right-2 top-full mt-1 z-30 w-36 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border py-1 text-xs"
                      onMouseLeave={() => setMenuOpenListId(null)}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpenListId(null);
                          store.openEditListDialog(list);
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-muted transition"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit List</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpenListId(null);
                          if (confirm(`Delete list "${list.name}"? Tasks will be moved to Inbox.`)) {
                            store.deleteList(list.id);
                          }
                        }}
                        className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-destructive/10 text-destructive transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete List</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
});
