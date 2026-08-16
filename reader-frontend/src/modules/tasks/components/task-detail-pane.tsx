import { observer } from 'mobx-react-lite';
import {
  X,
  Play,
  Pause,
  Square,
  Trash2,
  Plus,
  Clock,
  Check,
  Flag,
  ArrowLeft,
  Calendar,
  Layers,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import type { TasksStore } from '../store';
import { useState } from 'react';

interface Props {
  store: TasksStore;
}

const PRIORITY_META: Record<number, { text: string; label: string; flagColor: string }> = {
  1: { text: 'text-red-500', label: 'P1 Urgent', flagColor: '#ef4444' },
  2: { text: 'text-amber-500', label: 'P2 High', flagColor: '#f59e0b' },
  3: { text: 'text-blue-500', label: 'P3 Medium', flagColor: '#3b82f6' },
  4: { text: 'text-[var(--color-text-muted)]', label: 'P4 Low', flagColor: '#9ca3af' },
};

export const TaskDetailPane = observer(({ store }: Props) => {
  const detail = store.selectedTaskDetail;
  const isRunningForThis = store.activeTimer?.taskId === detail?.id;

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Empty State (No task selected)
  if (!store.selectedTaskId) {
    return (
      <div className="w-96 flex-shrink-0 border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] p-6 flex flex-col items-center justify-center text-center text-[var(--color-text-muted)] select-none">
        <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-soft)] flex items-center justify-center mb-3 shadow-xs text-[var(--color-brand)]">
          <Clock className="w-6 h-6 stroke-[1.8]" />
        </div>
        <h2 className="text-sm font-bold text-[var(--color-text-strong)]">Task Details</h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-[220px]">
          Select any task from the list to view its checklist, notes, and track focus time.
        </p>

        {store.activeTimer && (
          <div className="mt-6 p-3.5 rounded-lg bg-[var(--color-surface-raised)] border border-rose-500/30 shadow-xs w-full text-left space-y-1.5">
            <div className="flex items-center space-x-2 text-rose-500 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Timer Running</span>
            </div>
            <p className="text-xs font-semibold text-[var(--color-text-strong)] truncate">
              {store.activeTimer.taskTitle}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-mono font-bold text-rose-600 dark:text-rose-400">
                {store.formattedTimerElapsed}
              </span>
              <button
                type="button"
                onClick={() => store.selectTask(store.activeTimer!.taskId)}
                className="text-xs text-[var(--color-brand)] hover:underline font-semibold cursor-pointer"
              >
                Open Task →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (store.isLoadingDetail || !detail) {
    return (
      <div className="w-96 flex-shrink-0 border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] p-6 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
        Loading details...
      </div>
    );
  }

  const pConfig = PRIORITY_META[detail.priority] || PRIORITY_META[4];
  const formattedDueDate = detail.dueDate
    ? new Date(detail.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '';

  const isToday =
    detail.dueDate &&
    new Date(detail.dueDate).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);

  const handleAddSubtask = async () => {
    if (!subtaskInput.trim()) return;
    await store.addSubtask(detail.id, subtaskInput.trim());
    setSubtaskInput('');
  };

  return (
    <div className="w-96 flex-shrink-0 border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] flex flex-col h-full overflow-hidden select-none">
      {/* 1. Top Action Bar (TickTick Style: Checkbox, Due Date, Priority Flag, Actions) */}
      <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-surface-raised)]/40">
        <div className="flex items-center space-x-2">
          {/* Back to Parent Breadcrumb if viewing a subtask */}
          {detail.parentId ? (
            <button
              type="button"
              onClick={() => store.selectTask(detail.parentId!)}
              className="flex items-center space-x-1 text-xs text-[var(--color-brand)] hover:underline font-semibold cursor-pointer pr-1"
              title="Back to parent task"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Parent</span>
            </button>
          ) : (
            /* Main Task Checkbox */
            <button
              type="button"
              onClick={() => store.toggleTaskStatus(detail)}
              className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all cursor-pointer ${
                detail.isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-[var(--color-border-strong)] hover:border-emerald-500'
              }`}
            >
              {detail.isDone && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
          )}

          {/* Due Date Pill Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsDateMenuOpen(!isDateMenuOpen);
                setIsPriorityMenuOpen(false);
                setIsListMenuOpen(false);
              }}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                detail.dueDate
                  ? 'text-[var(--color-brand)] font-semibold bg-[var(--color-brand-soft)]/50'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-soft)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {detail.dueDate ? (isToday ? `${formattedDueDate}, Today` : formattedDueDate) : 'Due Date'}
              </span>
            </button>

            {isDateMenuOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-40 w-52 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border-default)] shadow-xl p-2 text-xs space-y-2 animate-in fade-in duration-100"
                onMouseLeave={() => setIsDateMenuOpen(false)}
              >
                <div className="grid grid-cols-2 gap-1 pb-1 border-b border-[var(--color-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => {
                      store.updateTaskProperties(detail.id, { dueDate: new Date().toISOString().slice(0, 10) });
                      setIsDateMenuOpen(false);
                    }}
                    className="px-2 py-1 rounded-md bg-[var(--color-surface-soft)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-on-soft)] text-center font-medium cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tom = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
                      store.updateTaskProperties(detail.id, { dueDate: tom });
                      setIsDateMenuOpen(false);
                    }}
                    className="px-2 py-1 rounded-md bg-[var(--color-surface-soft)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-on-soft)] text-center font-medium cursor-pointer"
                  >
                    Tomorrow
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[var(--color-text-subtle)] uppercase">Custom Date</span>
                  <input
                    type="date"
                    value={detail.dueDate ? new Date(detail.dueDate).toISOString().slice(0, 10) : ''}
                    onChange={(e) => {
                      store.updateTaskProperties(detail.id, { dueDate: e.target.value || null });
                      setIsDateMenuOpen(false);
                    }}
                    className="w-full bg-[var(--color-surface-canvas)] border border-[var(--color-border-default)] rounded-md px-2 py-1 text-xs text-[var(--color-text-strong)] focus:outline-none cursor-pointer"
                  />
                </div>

                {detail.dueDate && (
                  <button
                    type="button"
                    onClick={() => {
                      store.updateTaskProperties(detail.id, { dueDate: null });
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
        </div>

        {/* Right Actions: Priority, Stopwatch Toggle, Options */}
        <div className="flex items-center space-x-1 text-[var(--color-text-muted)]">
          {/* Priority Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsPriorityMenuOpen(!isPriorityMenuOpen);
                setIsDateMenuOpen(false);
                setIsListMenuOpen(false);
              }}
              title={`Priority: ${pConfig.label}`}
              className="p-1.5 rounded-md hover:bg-[var(--color-surface-soft)] transition cursor-pointer"
            >
              <Flag className="w-4 h-4" style={{ color: pConfig.flagColor }} />
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
                        store.updateTaskProperties(detail.id, { priority: p });
                        setIsPriorityMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-left font-medium transition cursor-pointer ${
                        detail.priority === p
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

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-md hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-40 w-36 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border-default)] shadow-xl py-1 text-xs animate-in fade-in duration-100"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    store.openAddSessionDialog();
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-[var(--color-surface-soft)] cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Log Past Time</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    store.requestConfirmation({
                      title: 'Delete Task',
                      message: `Are you sure you want to delete "${detail.title}"?`,
                      confirmLabel: 'Delete Task',
                      confirmVariant: 'danger',
                      onConfirm: () => store.deleteTask(detail.id),
                    });
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-[var(--color-error-soft)] text-[var(--color-error)] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Task</span>
                </button>
              </div>
            )}
          </div>

          {/* Close Details Button */}
          <button
            type="button"
            onClick={() => store.selectTask(null)}
            className="p-1.5 rounded-md hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Content Body (Flat, Clean, TickTick Typography) */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Focused Time Header & Live Timer Pill */}
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center space-x-1.5">
            <span>Focused for</span>
            <Clock className="w-3.5 h-3.5 text-[var(--color-brand)]" />
            <strong className="text-[var(--color-text-strong)]">{detail.totalTimeFormatted || '0m'}</strong>
          </div>

          {/* Quick inline timer trigger */}
          <button
            type="button"
            onClick={() => {
              if (isRunningForThis) {
                if (store.isTimerRunning) {
                  store.pauseActiveTimer();
                } else {
                  store.resumeActiveTimer();
                }
              } else {
                store.startTimerForTask(detail.id);
              }
            }}
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer ${
              isRunningForThis
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-[var(--color-surface-soft)] hover:bg-[var(--color-brand)] hover:text-white text-[var(--color-text-strong)]'
            }`}
          >
            {isRunningForThis ? (
              <>
                {store.isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span className="font-mono">{store.formattedTimerElapsed}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    store.promptStopTimer();
                  }}
                  title="Finish session"
                  className="pl-1 hover:text-white"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                </button>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Start Focus</span>
              </>
            )}
          </button>
        </div>

        {/* Task Title (Clean, borderless typography directly on surface) */}
        <div>
          <input
            type="text"
            defaultValue={detail.title}
            key={detail.id}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== detail.title) {
                store.updateTaskProperties(detail.id, { title: e.target.value.trim() });
              }
            }}
            placeholder="Task name"
            className="text-lg font-bold bg-transparent border-none ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none w-full text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] cursor-text"
          />
        </div>

        {/* Notes / Description (Seamless, Flat) */}
        <div>
          <textarea
            rows={3}
            defaultValue={detail.description || ''}
            key={`desc-${detail.id}`}
            onBlur={(e) => {
              if (e.target.value !== (detail.description || '')) {
                store.updateTaskProperties(detail.id, { description: e.target.value });
              }
            }}
            placeholder="Description"
            className="w-full bg-transparent border-none ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] resize-none py-1 leading-relaxed cursor-text"
          />
        </div>

        {/* 3. Subtasks Checklist (Direct TickTick Checklist Style) */}
        <div className="pt-2 border-t border-[var(--color-border-subtle)] space-y-1.5">
          {detail.subtasks.map((subtask) => (
            <div
              key={subtask.id}
              onClick={() => store.selectTask(subtask.id)}
              className="flex items-center justify-between py-1.5 px-1 rounded-md hover:bg-[var(--color-surface-soft)] text-xs group cursor-pointer transition"
            >
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                {/* Subtask Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    store.toggleTaskStatus(subtask);
                  }}
                  className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    subtask.isDone
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-[var(--color-border-strong)] hover:border-emerald-500'
                  }`}
                >
                  {subtask.isDone && <Check className="w-3 h-3 stroke-[3]" />}
                </button>

                {/* Subtask Title */}
                <span
                  className={`truncate text-xs ${
                    subtask.isDone
                      ? 'line-through text-[var(--color-text-muted)]'
                      : 'text-[var(--color-text-strong)] group-hover:text-[var(--color-brand)]'
                  }`}
                >
                  {subtask.title}
                </span>
              </div>

              {/* Hover Actions */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    store.startTimerForTask(subtask.id);
                  }}
                  title="Start stopwatch on subtask"
                  className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-brand)] cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    store.requestConfirmation({
                      title: 'Delete Subtask',
                      message: `Are you sure you want to delete "${subtask.title}"?`,
                      confirmLabel: 'Delete Subtask',
                      confirmVariant: 'danger',
                      onConfirm: () => store.deleteTask(subtask.id),
                    });
                  }}
                  className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error)] cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="text-[var(--color-brand)] pl-0.5">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}

          {/* Add Subtask Button / Input (TickTick Blue + Add Subtask) */}
          {isAddingSubtask ? (
            <div className="flex items-center space-x-2 pt-1">
              <span className="w-4 h-4 rounded-[4px] border border-dashed border-[var(--color-border-strong)] shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Subtask name (Press Enter)..."
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSubtask();
                  } else if (e.key === 'Escape') {
                    setIsAddingSubtask(false);
                    setSubtaskInput('');
                  }
                }}
                onBlur={() => {
                  if (subtaskInput.trim()) {
                    handleAddSubtask();
                  }
                  setIsAddingSubtask(false);
                }}
                className="flex-1 bg-transparent border-none ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-xs text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)]"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingSubtask(true)}
              className="flex items-center space-x-2 py-1 text-xs text-[var(--color-brand)] hover:opacity-80 font-medium cursor-pointer pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subtask</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Bottom Project / List Bar (TickTick Style: Bottom list pill & time log button) */}
      <div className="px-4 py-2.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]/40 flex items-center justify-between text-xs">
        {/* List Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsListMenuOpen(!isListMenuOpen);
              setIsPriorityMenuOpen(false);
              setIsDateMenuOpen(false);
            }}
            className="flex items-center space-x-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer font-medium"
          >
            <Layers className="w-3.5 h-3.5 text-[var(--color-brand)]" />
            <span>{detail.list ? detail.list.name : 'Inbox'}</span>
          </button>

          {isListMenuOpen && (
            <div
              className="absolute left-0 bottom-full mb-1 z-40 w-44 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border-default)] shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in duration-100"
              onMouseLeave={() => setIsListMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  store.updateTaskProperties(detail.id, { listId: null });
                  setIsListMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-left transition cursor-pointer ${
                  !detail.listId ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] font-bold' : 'hover:bg-[var(--color-surface-soft)]'
                }`}
              >
                <span>📥 Inbox</span>
              </button>
              {store.lists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    store.updateTaskProperties(detail.id, { listId: l.id });
                    setIsListMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-left transition cursor-pointer ${
                    detail.listId === l.id ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] font-bold' : 'hover:bg-[var(--color-surface-soft)]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color || '#3b82f6' }} />
                  <span className="truncate">{l.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sessions count badge */}
        {detail.timeSessions.length > 0 && (
          <button
            type="button"
            onClick={() => store.openAddSessionDialog()}
            className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-brand)] font-medium cursor-pointer"
          >
            {detail.timeSessions.length} session{detail.timeSessions.length === 1 ? '' : 's'} logged
          </button>
        )}
      </div>
    </div>
  );
});
