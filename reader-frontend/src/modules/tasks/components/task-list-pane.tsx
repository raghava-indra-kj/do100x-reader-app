import { observer } from 'mobx-react-lite';
import {
  Search,
  Play,
  Pause,
  Clock,
  Calendar,
  Check,
  Trash2,
  GitBranch,
  Flag,
  Plus,
} from 'lucide-react';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import type { TasksStore } from '../store';
import { useState } from 'react';

interface Props {
  store: TasksStore;
}

const PRIORITY_META: Record<number, { bg: string; text: string; border: string; label: string; flagColor: string }> = {
  1: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/25', label: 'P1 Urgent', flagColor: '#ef4444' },
  2: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/25', label: 'P2 High', flagColor: '#f59e0b' },
  3: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/25', label: 'P3 Medium', flagColor: '#3b82f6' },
  4: { bg: 'bg-[var(--color-surface-soft)]', text: 'text-[var(--color-text-muted)]', border: 'border-[var(--color-border-subtle)]', label: 'P4 Low', flagColor: '#9ca3af' },
};

export const TaskListPane = observer(({ store }: Props) => {
  const activeTimerTaskId = store.activeTimer?.taskId;

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);

  const currentPriorityMeta = PRIORITY_META[store.quickTaskPriority] || PRIORITY_META[4];

  return (
    <div
      className={`flex flex-col h-full bg-[var(--color-surface-canvas)] min-w-0 border-r border-[var(--color-border-subtle)] transition-all ${
        store.selectedTaskId ? 'w-80 flex-shrink-0' : 'flex-1'
      }`}
    >
      {/* Pane Header */}
      <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]/40 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight text-[var(--color-text-strong)] truncate">
              {store.activeListName}
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {store.filteredTasks.filter((t) => !t.isDone).length} pending • {store.filteredTasks.filter((t) => t.isDone).length} completed
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-40 sm:w-48 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search..."
              value={store.searchQuery}
              onChange={(e) => store.setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] transition"
            />
          </div>
        </div>

        {/* Quick Add Task Bar */}
        <div className="flex items-center space-x-2 bg-[var(--color-surface-raised)] px-2.5 py-1.5 rounded-lg border border-[var(--color-border-default)] shadow-xs transition-all focus-within:border-[var(--color-brand)]">
          <div className="text-[var(--color-brand)] shrink-0">
            <Plus className="w-4 h-4" />
          </div>

          <input
            type="text"
            placeholder={`Add task to ${store.activeListName}...`}
            value={store.quickTaskTitle}
            onChange={(e) => store.setQuickTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && store.quickTaskTitle.trim()) {
                store.createQuickTask();
              }
            }}
            className="flex-1 min-w-0 bg-transparent text-xs px-1 py-1 border-none ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)]"
          />

          {/* Priority Pill */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsPriorityMenuOpen(!isPriorityMenuOpen);
                setIsDateMenuOpen(false);
              }}
              className={`flex items-center space-x-1 px-1.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${currentPriorityMeta.bg} ${currentPriorityMeta.text} ${currentPriorityMeta.border}`}
            >
              <Flag className="w-3 h-3" style={{ color: currentPriorityMeta.flagColor }} />
              <span className="hidden sm:inline">{currentPriorityMeta.label}</span>
            </button>

            {isPriorityMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-40 w-36 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border-default)] shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in duration-100"
                onMouseLeave={() => setIsPriorityMenuOpen(false)}
              >
                {[1, 2, 3, 4].map((p) => {
                  const m = PRIORITY_META[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        store.setQuickTaskPriority(p);
                        setIsPriorityMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-left font-medium transition cursor-pointer ${
                        store.quickTaskPriority === p
                          ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] font-bold'
                          : 'hover:bg-[var(--color-surface-soft)] text-[var(--color-text-body)]'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" style={{ color: m.flagColor }} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Due Date Dropdown Popover */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsDateMenuOpen(!isDateMenuOpen);
                setIsPriorityMenuOpen(false);
              }}
              className={`flex items-center space-x-1 px-1.5 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer ${
                store.quickTaskDueDate
                  ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] border-[var(--color-brand)]/40 font-bold'
                  : 'bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] border-[var(--color-border-subtle)]'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span className="hidden sm:inline">
                {store.quickTaskDueDate
                  ? store.quickTaskDueDate === new Date().toISOString().slice(0, 10)
                    ? 'Today'
                    : store.quickTaskDueDate === new Date(Date.now() + 86400000).toISOString().slice(0, 10)
                    ? 'Tomorrow'
                    : store.quickTaskDueDate
                  : 'Due'}
              </span>
            </button>

            {isDateMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-40 w-44 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border-default)] shadow-xl p-2 text-xs space-y-1 animate-in fade-in duration-100"
                onMouseLeave={() => setIsDateMenuOpen(false)}
              >
                <div className="text-[10px] font-bold text-[var(--color-text-subtle)] uppercase px-1 pb-1 border-b border-[var(--color-border-subtle)]">
                  Quick Select
                </div>
                <button
                  type="button"
                  onClick={() => {
                    store.setQuickTaskDueDate(new Date().toISOString().slice(0, 10));
                    setIsDateMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[var(--color-surface-soft)] text-[var(--color-text-body)] flex items-center justify-between cursor-pointer"
                >
                  <span>Today</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(Date.now() + 86400000);
                    store.setQuickTaskDueDate(d.toISOString().slice(0, 10));
                    setIsDateMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[var(--color-surface-soft)] text-[var(--color-text-body)] flex items-center justify-between cursor-pointer"
                >
                  <span>Tomorrow</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {new Date(Date.now() + 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(Date.now() + 7 * 86400000);
                    store.setQuickTaskDueDate(d.toISOString().slice(0, 10));
                    setIsDateMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[var(--color-surface-soft)] text-[var(--color-text-body)] flex items-center justify-between cursor-pointer"
                >
                  <span>Next Week</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </button>

                <div className="pt-1 border-t border-[var(--color-border-subtle)]">
                  <input
                    type="date"
                    value={store.quickTaskDueDate}
                    onChange={(e) => {
                      store.setQuickTaskDueDate(e.target.value);
                      setIsDateMenuOpen(false);
                    }}
                    className="w-full text-xs p-1 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)]"
                  />
                </div>

                {store.quickTaskDueDate && (
                  <button
                    type="button"
                    onClick={() => {
                      store.setQuickTaskDueDate('');
                      setIsDateMenuOpen(false);
                    }}
                    className="w-full py-1 text-center text-[11px] text-[var(--color-error)] hover:underline font-medium cursor-pointer"
                  >
                    Clear Date
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Add Button */}
          <button
            type="button"
            onClick={() => store.createQuickTask()}
            disabled={!store.quickTaskTitle.trim()}
            className="px-2.5 py-1 bg-[var(--color-brand)] text-white text-xs font-semibold rounded-md hover:bg-[var(--color-brand-hover)] disabled:opacity-35 transition cursor-pointer shrink-0"
          >
            Add
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {store.isLoadingTasks ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-2 text-[var(--color-text-muted)] select-none">
            <Loader size={22} className="text-[var(--color-brand)]" />
            <span className="text-xs font-medium">Loading tasks...</span>
          </div>
        ) : store.filteredTasks.length === 0 ? (
          <div className="py-20 text-center text-[var(--color-text-muted)]">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-soft)] flex items-center justify-center mx-auto mb-2 text-[var(--color-text-muted)]">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <p className="text-xs font-bold text-[var(--color-text-strong)]">No tasks in this view</p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Add your first task above to get started.
            </p>
          </div>
        ) : (
          store.filteredTasks.map((task) => {
            const isSelected = store.selectedTaskId === task.id;
            const isTimerActiveForThis = activeTimerTaskId === task.id;
            const pConfig = PRIORITY_META[task.priority] || PRIORITY_META[4];

            return (
              <div
                key={task.id}
                onClick={() => store.selectTask(task.id)}
                className={`group relative flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[var(--color-surface-raised)] border-[var(--color-brand)] shadow-xs ring-1 ring-[var(--color-brand)]/20'
                    : 'bg-[var(--color-surface-raised)]/70 border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-raised)]'
                }`}
              >
                {/* Left: Checkbox + Title + Chips */}
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  {/* Completion Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      store.toggleTaskStatus(task);
                    }}
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      task.isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-[var(--color-border-strong)] hover:border-emerald-500'
                    }`}
                  >
                    {task.isDone && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>

                  {/* Title & Metadata chips */}
                  <div className="min-w-0 flex-1 flex items-center space-x-2">
                    <span
                      className={`text-xs truncate font-medium ${
                        task.isDone
                          ? 'line-through text-[var(--color-text-muted)]'
                          : 'text-[var(--color-text-strong)]'
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* Due Date Chip */}
                    {task.dueDate && (
                      <span className="flex items-center space-x-1 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-soft)] px-1.5 py-0.5 rounded font-medium shrink-0">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </span>
                    )}

                    {/* Subtasks Count Pill */}
                    {task.subtaskCount > 0 && (
                      <span className="flex items-center space-x-1 text-[10px] font-semibold text-[var(--color-brand)] bg-[var(--color-brand-soft)] px-1.5 py-0.5 rounded shrink-0">
                        <GitBranch className="w-2.5 h-2.5" />
                        <span>
                          {task.completedSubtaskCount}/{task.subtaskCount}
                        </span>
                      </span>
                    )}

                    {/* Total Focus Badge */}
                    {task.totalTimeFormatted && (
                      <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{task.totalTimeFormatted}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Actions: Priority Flag, Timer Button & Delete */}
                <div className="flex items-center space-x-1 pl-2 shrink-0">
                  <Flag className="w-3 h-3" style={{ color: pConfig.flagColor }} />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isTimerActiveForThis) {
                        if (store.isTimerRunning) {
                          store.pauseActiveTimer();
                        } else {
                          store.resumeActiveTimer();
                        }
                      } else {
                        store.startTimerForTask(task.id);
                      }
                    }}
                    title={isTimerActiveForThis ? 'Toggle live timer' : 'Start stopwatch on task'}
                    className={`px-2 py-0.5 rounded text-xs font-bold flex items-center space-x-1 transition cursor-pointer ${
                      isTimerActiveForThis
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'opacity-0 group-hover:opacity-100 hover:bg-[var(--color-brand)] hover:text-white text-[var(--color-text-muted)]'
                    }`}
                  >
                    {isTimerActiveForThis ? (
                      store.isTimerRunning ? (
                        <>
                          <Pause className="w-3 h-3" />
                          <span className="font-mono text-[11px]">{store.formattedTimerElapsed}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          <span className="font-mono text-[11px]">{store.formattedTimerElapsed}</span>
                        </>
                      )
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      store.requestConfirmation({
                        title: 'Delete Task',
                        message: `Are you sure you want to delete "${task.title}"?`,
                        confirmLabel: 'Delete Task',
                        confirmVariant: 'danger',
                        onConfirm: () => store.deleteTask(task.id),
                      });
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-error-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
