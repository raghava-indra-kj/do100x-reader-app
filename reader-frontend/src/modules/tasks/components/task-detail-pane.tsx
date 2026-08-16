import { observer } from 'mobx-react-lite';
import {
  X,
  Play,
  Pause,
  Square,
  Trash2,
  Plus,
  Clock,
  RotateCcw,
  Check,
  GitBranch,
  Flag,
  FileText,
  ArrowLeft,
  Calendar,
  Layers,
  ChevronRight,
  Folder,
} from 'lucide-react';
import type { TasksStore } from '../store';
import { useState } from 'react';

interface Props {
  store: TasksStore;
}

const PRIORITY_META: Record<number, { bg: string; text: string; border: string; label: string; flagColor: string }> = {
  1: { bg: 'bg-red-500/15', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30', label: 'P1 Urgent', flagColor: '#ef4444' },
  2: { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', label: 'P2 High', flagColor: '#f59e0b' },
  3: { bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', label: 'P3 Med', flagColor: '#3b82f6' },
  4: { bg: 'bg-[var(--color-surface-soft)]', text: 'text-[var(--color-text-muted)]', border: 'border-[var(--color-border-subtle)]', label: 'P4 Low', flagColor: '#9ca3af' },
};

export const TaskDetailPane = observer(({ store }: Props) => {
  const detail = store.selectedTaskDetail;
  const isRunningForThis = store.activeTimer?.taskId === detail?.id;

  const [notesTab, setNotesTab] = useState<'write' | 'preview'>('write');
  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);

  // Empty State (No task selected)
  if (!store.selectedTaskId) {
    return (
      <div className="w-96 flex-shrink-0 border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] p-6 flex flex-col items-center justify-center text-center text-[var(--color-text-muted)] select-none">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-soft)] flex items-center justify-center mb-3 shadow-xs text-[var(--color-brand)]">
          <Clock className="w-7 h-7 stroke-[1.8]" />
        </div>
        <h2 className="text-sm font-bold text-[var(--color-text-strong)]">Focus & Task Details</h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-[220px]">
          Select any task or subtask from your list to manage its hierarchy, write markdown notes, and run the live timer.
        </p>

        {/* Quick status pill if a timer is running elsewhere */}
        {store.activeTimer && (
          <div className="mt-6 p-4 rounded-2xl bg-[var(--color-surface-raised)] border border-rose-500/30 shadow-xs w-full text-left space-y-2">
            <div className="flex items-center space-x-2 text-rose-500 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Timer Running</span>
            </div>
            <p className="text-xs font-semibold text-[var(--color-text-strong)] truncate">
              {store.activeTimer.taskTitle}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-base font-mono font-bold text-rose-600 dark:text-rose-400">
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
  const completedSubtasksCount = detail.subtasks.filter((s) => s.isDone).length;
  const subtasksPercent =
    detail.subtasks.length > 0 ? Math.round((completedSubtasksCount / detail.subtasks.length) * 100) : 0;

  const formattedDueDate = detail.dueDate
    ? new Date(detail.dueDate).toISOString().slice(0, 10)
    : '';

  const isToday = formattedDueDate === new Date().toISOString().slice(0, 10);
  const isTomorrow = formattedDueDate === new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <div className="w-96 flex-shrink-0 border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] flex flex-col h-full overflow-hidden shadow-xs">
      {/* 1. Header with Breadcrumb Path */}
      <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] flex items-center justify-between">
        <div className="flex items-center space-x-1.5 min-w-0 text-xs font-semibold">
          {detail.parentId ? (
            <button
              type="button"
              onClick={() => store.selectTask(detail.parentId!)}
              className="flex items-center space-x-1.5 text-[var(--color-brand)] hover:underline font-bold cursor-pointer group truncate"
              title="Navigate up to parent task"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
              <span className="truncate">Back to Parent Task</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 text-[var(--color-text-muted)] truncate">
              <Folder className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
              <span className="text-[var(--color-text-strong)] font-bold truncate">
                {detail.list ? detail.list.name : 'Inbox'}
              </span>
            </div>
          )}
        </div>

        {/* Top Right Action Icons */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              store.requestConfirmation({
                title: 'Delete Task',
                message: `Are you sure you want to delete "${detail.title}"?`,
                confirmLabel: 'Delete Task',
                confirmVariant: 'danger',
                onConfirm: () => store.deleteTask(detail.id),
              });
            }}
            title="Delete task"
            className="p-1.5 rounded-lg hover:bg-[var(--color-error-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => store.selectTask(null)}
            title="Close detail pane"
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Scrollable Workspace */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Task Title & Status Checkbox */}
        <div className="flex items-start space-x-3">
          <button
            type="button"
            onClick={() => store.toggleTaskStatus(detail)}
            className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              detail.isDone
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                : 'border-[var(--color-border-strong)] hover:border-emerald-500'
            }`}
          >
            {detail.isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          <input
            type="text"
            defaultValue={detail.title}
            key={detail.id}
            onBlur={(e) => {
              if (e.target.value.trim() && e.target.value !== detail.title) {
                store.updateTaskProperties(detail.id, { title: e.target.value.trim() });
              }
            }}
            placeholder="Task title..."
            className="text-base font-bold bg-transparent border-0 ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 w-full text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] cursor-text"
          />
        </div>

        {/* 3. Interactive Attributes Toolbar (TickTick-style Pills) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {/* Priority Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsPriorityMenuOpen(!isPriorityMenuOpen);
                setIsListMenuOpen(false);
                setIsDateMenuOpen(false);
                setIsTimeMenuOpen(false);
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${pConfig.bg} ${pConfig.text} ${pConfig.border}`}
            >
              <Flag className="w-3 h-3" style={{ color: pConfig.flagColor }} />
              <span>{pConfig.label}</span>
            </button>

            {isPriorityMenuOpen && (
              <div
                className="absolute left-0 top-full mt-1.5 z-40 w-36 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border-default)] shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
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
                      className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left font-medium transition cursor-pointer ${
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

          {/* List / Project Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsListMenuOpen(!isListMenuOpen);
                setIsPriorityMenuOpen(false);
                setIsDateMenuOpen(false);
                setIsTimeMenuOpen(false);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-text-strong)] hover:border-[var(--color-brand)] transition cursor-pointer"
            >
              <Layers className="w-3 h-3 text-[var(--color-brand)]" />
              <span>{detail.list ? detail.list.name : 'Inbox'}</span>
            </button>

            {isListMenuOpen && (
              <div
                className="absolute left-0 top-full mt-1.5 z-40 w-44 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border-default)] shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsListMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    store.updateTaskProperties(detail.id, { listId: null });
                    setIsListMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
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
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
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

          {/* Due Date Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsDateMenuOpen(!isDateMenuOpen);
                setIsPriorityMenuOpen(false);
                setIsListMenuOpen(false);
                setIsTimeMenuOpen(false);
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition cursor-pointer ${
                detail.dueDate
                  ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] border-[var(--color-brand)]/40 font-bold'
                  : 'bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>
                {detail.dueDate
                  ? isToday
                    ? 'Today'
                    : isTomorrow
                    ? 'Tomorrow'
                    : formattedDueDate
                  : 'Due Date'}
              </span>
            </button>

            {isDateMenuOpen && (
              <div
                className="absolute left-0 top-full mt-1.5 z-40 w-52 bg-[var(--color-surface-raised)] rounded-2xl border border-[var(--color-border-default)] shadow-2xl p-2 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsDateMenuOpen(false)}
              >
                <div className="grid grid-cols-2 gap-1 pb-1 border-b border-[var(--color-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => {
                      store.updateTaskProperties(detail.id, { dueDate: new Date().toISOString().slice(0, 10) });
                      setIsDateMenuOpen(false);
                    }}
                    className="px-2 py-1.5 rounded-lg bg-[var(--color-surface-soft)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-on-soft)] text-center font-semibold cursor-pointer transition"
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
                    className="px-2 py-1.5 rounded-lg bg-[var(--color-surface-soft)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-on-soft)] text-center font-semibold cursor-pointer transition"
                  >
                    Tomorrow
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[var(--color-text-subtle)] uppercase">Custom Date</span>
                  <input
                    type="date"
                    value={formattedDueDate}
                    onChange={(e) => {
                      store.updateTaskProperties(detail.id, { dueDate: e.target.value || null });
                      setIsDateMenuOpen(false);
                    }}
                    className="w-full bg-[var(--color-surface-canvas)] border border-[var(--color-border-default)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-text-strong)] focus:outline-none cursor-pointer"
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

          {/* Due Time Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsTimeMenuOpen(!isTimeMenuOpen);
                setIsPriorityMenuOpen(false);
                setIsListMenuOpen(false);
                setIsDateMenuOpen(false);
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition cursor-pointer ${
                detail.dueTime
                  ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] border-[var(--color-brand)]/40 font-bold'
                  : 'bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{detail.dueTime || 'Time'}</span>
            </button>

            {isTimeMenuOpen && (
              <div
                className="absolute left-0 top-full mt-1.5 z-40 w-44 bg-[var(--color-surface-raised)] rounded-2xl border border-[var(--color-border-default)] shadow-2xl p-2 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setIsTimeMenuOpen(false)}
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[var(--color-text-subtle)] uppercase">Set Time</span>
                  <input
                    type="time"
                    value={detail.dueTime || ''}
                    onChange={(e) => {
                      store.updateTaskProperties(detail.id, { dueTime: e.target.value || null });
                    }}
                    className="w-full bg-[var(--color-surface-canvas)] border border-[var(--color-border-default)] rounded-xl px-2 py-1 text-xs text-[var(--color-text-strong)] focus:outline-none cursor-pointer"
                  />
                </div>

                {detail.dueTime && (
                  <button
                    type="button"
                    onClick={() => {
                      store.updateTaskProperties(detail.id, { dueTime: null });
                      setIsTimeMenuOpen(false);
                    }}
                    className="w-full py-1 text-center text-[11px] text-[var(--color-error)] hover:underline font-medium cursor-pointer"
                  >
                    Clear Time
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. Live Focus Stopwatch Card */}
        <div className="p-4 rounded-2xl border border-[var(--color-brand)]/30 bg-[var(--color-surface-raised)] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand)] flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Focus Stopwatch</span>
            </span>
            {isRunningForThis ? (
              <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                {store.isTimerRunning ? 'RECORDING' : 'PAUSED'}
              </span>
            ) : (
              detail.totalTimeFormatted && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {detail.totalTimeFormatted} total
                </span>
              )
            )}
          </div>

          <div className="text-center py-1">
            <div className="text-3xl font-mono font-bold tracking-tight text-[var(--color-text-strong)]">
              {isRunningForThis ? store.formattedTimerElapsed : '00:00'}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Total Time Spent: <strong className="text-[var(--color-text-strong)]">{detail.totalTimeFormatted || '0m'}</strong>
            </p>
          </div>

          <div className="flex items-center justify-center space-x-2">
            {isRunningForThis ? (
              <>
                {store.isTimerRunning ? (
                  <button
                    type="button"
                    onClick={() => store.pauseActiveTimer()}
                    className="flex-1 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs hover:opacity-90 transition cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => store.resumeActiveTimer()}
                    className="flex-1 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs hover:opacity-90 transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => store.promptStopTimer()}
                  className="flex-1 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs hover:opacity-90 transition cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Finish</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    store.requestConfirmation({
                      title: 'Discard Timer',
                      message: 'Are you sure you want to discard the active running timer without recording time?',
                      confirmLabel: 'Discard Timer',
                      confirmVariant: 'warning',
                      onConfirm: () => store.discardActiveTimer(),
                    });
                  }}
                  title="Discard timer"
                  className="p-2 bg-[var(--color-surface-soft)] hover:bg-[var(--color-error-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-error)] rounded-xl text-xs transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => store.startTimerForTask(detail.id)}
                className="w-full py-2 bg-[var(--color-brand)] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs hover:bg-[var(--color-brand-hover)] transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Focus Stopwatch</span>
              </button>
            )}
          </div>
        </div>

        {/* 5. Subtasks Breakdown & Checklist (TickTick Experience) */}
        <div className="p-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-strong)] flex items-center space-x-1.5">
              <GitBranch className="w-3.5 h-3.5 text-[var(--color-brand)]" />
              <span>Subtasks ({detail.subtasks.length})</span>
            </span>
            {detail.subtasks.length > 0 && (
              <span className="text-[11px] font-bold text-[var(--color-brand)] bg-[var(--color-brand-soft)]/50 px-2 py-0.5 rounded-full">
                {completedSubtasksCount}/{detail.subtasks.length} ({subtasksPercent}%)
              </span>
            )}
          </div>

          {/* Subtask Progress bar */}
          {detail.subtasks.length > 0 && (
            <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-soft)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-brand)] transition-all duration-300 rounded-full"
                style={{ width: `${subtasksPercent}%` }}
              />
            </div>
          )}

          {/* Subtasks List */}
          <div className="space-y-1.5">
            {detail.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                onClick={() => store.selectTask(subtask.id)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-canvas)] hover:bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] text-xs group/sub cursor-pointer transition shadow-2xs"
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      store.toggleTaskStatus(subtask);
                    }}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      subtask.isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xs'
                        : 'border-[var(--color-border-strong)] hover:border-emerald-500'
                    }`}
                  >
                    {subtask.isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>

                  <span
                    className={`truncate font-medium hover:text-[var(--color-brand)] transition ${
                      subtask.isDone
                        ? 'line-through text-[var(--color-text-muted)]'
                        : 'text-[var(--color-text-strong)]'
                    }`}
                  >
                    {subtask.title}
                  </span>
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover/sub:opacity-100 transition">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      store.startTimerForTask(subtask.id);
                    }}
                    title="Start timer for subtask"
                    className="p-1 hover:text-[var(--color-brand)] text-[var(--color-text-muted)] cursor-pointer"
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
                    className="p-1 hover:text-[var(--color-error)] text-[var(--color-text-muted)] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <div className="text-[var(--color-brand)] pl-0.5">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Inline Add Subtask Input */}
          <div className="flex items-center space-x-1.5 pt-1">
            <input
              type="text"
              placeholder="+ Add a subtask (Press Enter)..."
              value={store.newSubtaskTitle}
              onChange={(e) => store.setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && store.newSubtaskTitle.trim()) {
                  store.addSubtask(detail.id);
                }
              }}
              className="flex-1 bg-[var(--color-surface-canvas)] border border-[var(--color-border-default)] text-xs rounded-xl px-3 py-1.5 border-none ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)]"
            />
            <button
              type="button"
              onClick={() => store.addSubtask(detail.id)}
              disabled={!store.newSubtaskTitle.trim()}
              className="p-1.5 bg-[var(--color-brand)] text-white text-xs font-bold rounded-xl hover:bg-[var(--color-brand-hover)] disabled:opacity-35 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6. Markdown Notes & Description */}
        <div className="p-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-strong)] flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--color-brand)]" />
              <span>Notes & Description</span>
            </span>

            {/* Tab switch */}
            <div className="flex items-center space-x-1 bg-[var(--color-surface-soft)] p-0.5 rounded-lg text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setNotesTab('write')}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                  notesTab === 'write'
                    ? 'bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] shadow-2xs font-bold'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setNotesTab('preview')}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                  notesTab === 'preview'
                    ? 'bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] shadow-2xs font-bold'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          {notesTab === 'write' ? (
            <textarea
              rows={4}
              defaultValue={detail.description || ''}
              key={`desc-${detail.id}`}
              onBlur={(e) => {
                if (e.target.value !== (detail.description || '')) {
                  store.updateTaskProperties(detail.id, { description: e.target.value });
                }
              }}
              placeholder="Write detailed notes (Markdown supported)..."
              className="w-full p-3 text-xs rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] border-none ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] transition cursor-text resize-y"
            />
          ) : (
            <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] text-xs text-[var(--color-text-body)] min-h-[80px] whitespace-pre-wrap">
              {detail.description ? (
                detail.description
              ) : (
                <span className="text-[var(--color-text-muted)] italic">No notes added yet.</span>
              )}
            </div>
          )}
        </div>

        {/* 7. Recorded Focus Sessions History */}
        <div className="p-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-strong)] flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Time History ({detail.timeSessions.length})</span>
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => store.openAddSessionDialog()}
                className="text-[11px] text-[var(--color-brand)] hover:underline font-bold cursor-pointer"
              >
                + Log Past Time
              </button>
              {detail.timeSessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    store.requestConfirmation({
                      title: 'Clear All Sessions',
                      message: `Are you sure you want to delete all recorded time sessions for "${detail.title}"? This cannot be undone.`,
                      confirmLabel: 'Clear All Sessions',
                      confirmVariant: 'danger',
                      onConfirm: () => store.deleteAllSessionsForTask(detail.id),
                    });
                  }}
                  className="text-[11px] text-[var(--color-error)] hover:underline font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {detail.timeSessions.length === 0 ? (
            <div className="text-center py-4 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-canvas)] rounded-xl border border-dashed border-[var(--color-border-subtle)]">
              No sessions logged yet.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {detail.timeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface-canvas)] border border-[var(--color-border-subtle)] text-xs group/sess"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[var(--color-text-strong)] font-mono">
                        {session.durationFormatted}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {new Date(session.startTime).toLocaleDateString()}
                      </span>
                    </div>
                    {session.notes && (
                      <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">
                        {session.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover/sess:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => store.openEditSessionDialog(session)}
                      className="p-1 hover:text-[var(--color-brand)] text-[var(--color-text-muted)] cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => store.deleteSession(session.id)}
                      className="p-1 hover:text-[var(--color-error)] text-[var(--color-text-muted)] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
