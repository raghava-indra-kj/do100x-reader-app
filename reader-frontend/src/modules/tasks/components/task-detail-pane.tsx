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
  GitBranch,
  MoreVertical,
} from 'lucide-react';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import type { TasksStore } from '../store';
import { useState } from 'react';

interface Props {
  store: TasksStore;
}

const PRIORITY_META: Record<number, { text: string; label: string; flagColor: string; bg: string; border: string }> = {
  1: { text: 'text-red-500', label: 'P1 Urgent', flagColor: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  2: { text: 'text-amber-500', label: 'P2 High', flagColor: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  3: { text: 'text-blue-500', label: 'P3 Medium', flagColor: '#3b82f6', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  4: { text: 'text-[var(--color-text-muted)]', label: 'P4 Low', flagColor: '#9ca3af', bg: 'bg-[var(--color-surface-soft)]', border: 'border-[var(--color-border-subtle)]' },
};

export const TaskDetailPane = observer(({ store }: Props) => {
  const detail = store.selectedTaskDetail;
  const isRunningForThis = store.activeTimer?.taskId === detail?.id;

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Empty State (No task selected)
  if (!store.selectedTaskId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--color-text-muted)] select-none bg-[var(--color-surface-canvas)]">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-soft)] flex items-center justify-center mb-3 shadow-xs text-[var(--color-brand)]">
          <Clock className="w-7 h-7 stroke-[1.8]" />
        </div>
        <h2 className="text-base font-bold text-[var(--color-text-strong)]">Task Details & Drill-Down Workspace</h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm">
          Select any task from the list to view its full details, track focus time, and manage subtasks in a dedicated 50/50 split canvas.
        </p>

        {store.activeTimer && (
          <div className="mt-6 p-4 rounded-xl bg-[var(--color-surface-raised)] border border-rose-500/30 shadow-xs max-w-md w-full text-left space-y-2">
            <div className="flex items-center space-x-2 text-rose-500 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Timer Running</span>
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-strong)] truncate">
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-2 text-[var(--color-text-muted)] bg-[var(--color-surface-canvas)] select-none">
        <Loader size={24} className="text-[var(--color-brand)]" />
        <span className="text-xs font-medium">Loading task workspace...</span>
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

  const completedSubtasksCount = detail.subtasks.filter((s) => s.isDone).length;
  const totalSubtasksCount = detail.subtasks.length;
  const subtasksPercent =
    totalSubtasksCount > 0 ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100) : 0;

  const handleAddSubtask = async () => {
    if (!subtaskInput.trim()) return;
    await store.addSubtask(detail.id, subtaskInput.trim());
    setSubtaskInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-surface-canvas)] min-w-0 overflow-hidden select-none">
      {/* 1. Top Breadcrumb & Actions Bar */}
      <div className="px-5 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-surface-raised)]/60 backdrop-blur shrink-0 z-10">
        {/* Breadcrumb Hierarchy */}
        <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-x-auto pr-3 scrollbar-none">
          {store.taskBreadcrumbs.length > 1 && (
            <button
              type="button"
              onClick={() => store.drillUpToParent()}
              className="flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-semibold bg-[var(--color-surface-soft)] text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] transition cursor-pointer shrink-0"
              title="Back to parent task"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <div className="flex items-center space-x-1.5 text-xs text-[var(--color-text-muted)] min-w-0">
            {store.taskBreadcrumbs.map((crumb, idx) => {
              const isLast = idx === store.taskBreadcrumbs.length - 1;
              return (
                <div key={crumb.id} className="flex items-center space-x-1.5 min-w-0">
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-[var(--color-text-subtle)] shrink-0" />}
                  <button
                    type="button"
                    onClick={() => store.drillToBreadcrumb(idx)}
                    disabled={isLast}
                    className={`truncate max-w-[140px] text-xs transition cursor-pointer ${
                      isLast
                        ? 'font-bold text-[var(--color-text-strong)] cursor-default'
                        : 'hover:text-[var(--color-brand)] hover:underline font-medium'
                    }`}
                  >
                    {crumb.title}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Quick Focus Stopwatch Trigger */}
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
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-xs ${
              isRunningForThis
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-[var(--color-brand-soft)] hover:bg-[var(--color-brand)] hover:text-white text-[var(--color-brand-on-soft)] border border-[var(--color-brand)]/30'
            }`}
          >
            {isRunningForThis ? (
              <>
                {store.isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
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
                  <Square className="w-3 h-3 fill-current" />
                </button>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Start Focus</span>
              </>
            )}
          </button>

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-strong)] transition cursor-pointer text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-40 w-40 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border-default)] shadow-xl py-1 text-xs animate-in fade-in duration-100"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    store.openAddSessionDialog();
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-[var(--color-surface-soft)] text-[var(--color-text-body)] cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                  <span>Log Past Time</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    store.requestConfirmation({
                      title: 'Delete Task',
                      message: `Are you sure you want to delete "${detail.title}" and all its subtasks?`,
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
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-strong)] transition cursor-pointer text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]"
            title="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. 50% / 50% Split Dual Column Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border-subtle)]">
        {/* ========================================================= */}
        {/* LEFT 50%: ACTIVE MAIN TASK DETAILS                        */}
        {/* ========================================================= */}
        <div className="w-full lg:w-1/2 flex flex-col h-full overflow-y-auto p-5 space-y-5 bg-[var(--color-surface-canvas)]">
          {/* Focused Time Header */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] shadow-2xs">
            <div className="flex items-center space-x-2.5 text-xs text-[var(--color-text-muted)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[11px] text-[var(--color-text-subtle)]">Total Time Focused</span>
                <strong className="text-sm font-bold text-[var(--color-text-strong)]">
                  {detail.totalTimeFormatted || '0m'}
                </strong>
              </div>
            </div>

            {detail.timeSessions.length > 0 && (
              <button
                type="button"
                onClick={() => store.openAddSessionDialog()}
                className="text-xs text-[var(--color-brand)] hover:underline font-semibold cursor-pointer"
              >
                {detail.timeSessions.length} session{detail.timeSessions.length === 1 ? '' : 's'}
              </button>
            )}
          </div>

          {/* Task Title & Checkbox */}
          <div className="flex items-start space-x-3 pt-1">
            <button
              type="button"
              onClick={() => store.toggleTaskStatus(detail)}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 mt-1 cursor-pointer ${
                detail.isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                  : 'border-[var(--color-border-strong)] hover:border-emerald-500 bg-[var(--color-surface-raised)]'
              }`}
            >
              {detail.isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                defaultValue={detail.title}
                key={detail.id}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== detail.title) {
                    store.updateTaskProperties(detail.id, { title: e.target.value.trim() });
                  }
                }}
                placeholder="Task title"
                className={`text-lg lg:text-xl font-bold bg-transparent border-none ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none w-full text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] cursor-text ${
                  detail.isDone ? 'line-through text-[var(--color-text-muted)]' : ''
                }`}
              />
            </div>
          </div>

          {/* Metadata Chips Bar (Priority, Due Date, List) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Priority Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsPriorityMenuOpen(!isPriorityMenuOpen);
                  setIsDateMenuOpen(false);
                  setIsListMenuOpen(false);
                }}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-2xs ${pConfig.bg} ${pConfig.text} ${pConfig.border}`}
              >
                <Flag className="w-3.5 h-3.5" style={{ color: pConfig.flagColor }} />
                <span>{pConfig.label}</span>
              </button>

              {isPriorityMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1 z-40 w-36 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border-default)] shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in duration-100"
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

            {/* Due Date Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDateMenuOpen(!isDateMenuOpen);
                  setIsPriorityMenuOpen(false);
                  setIsListMenuOpen(false);
                }}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer shadow-2xs ${
                  detail.dueDate
                    ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] border-[var(--color-brand)]/40 font-semibold'
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] border-[var(--color-border-subtle)]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {detail.dueDate ? (isToday ? `${formattedDueDate}, Today` : formattedDueDate) : 'Set Due Date'}
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

            {/* List Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsListMenuOpen(!isListMenuOpen);
                  setIsPriorityMenuOpen(false);
                  setIsDateMenuOpen(false);
                }}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer shadow-2xs"
              >
                <Layers className="w-3.5 h-3.5 text-[var(--color-brand)]" />
                <span>{detail.list ? detail.list.name : 'Inbox'}</span>
              </button>

              {isListMenuOpen && (
                <div
                  className="absolute left-0 top-full mt-1 z-40 w-44 bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border-default)] shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in duration-100"
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
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color || '#3b82f6' }} />
                      <span className="truncate">{l.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Seamless Natural Notes & Description (Boundary-Free) */}
          <div className="pt-1 flex-1 flex flex-col min-h-[160px]">
            <textarea
              defaultValue={detail.description || ''}
              key={`desc-${detail.id}`}
              onBlur={(e) => {
                if (e.target.value !== (detail.description || '')) {
                  store.updateTaskProperties(detail.id, { description: e.target.value });
                }
              }}
              placeholder="Write notes, thoughts, or task details here..."
              className="w-full flex-1 bg-transparent border-none ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-xs sm:text-[13px] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] resize-none leading-relaxed cursor-text min-h-[140px]"
            />
          </div>

          {/* Logged Sessions History */}
          {detail.timeSessions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[11px] text-[var(--color-text-subtle)] uppercase tracking-wider">
                  Logged Focus Sessions
                </span>
                <button
                  type="button"
                  onClick={() => store.openAddSessionDialog()}
                  className="text-xs text-[var(--color-brand)] hover:underline font-semibold cursor-pointer"
                >
                  + Add Session
                </button>
              </div>

              <div className="space-y-1.5">
                {detail.timeSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-xs group"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-[var(--color-text-strong)] font-mono">
                        {session.durationFormatted}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {new Date(session.startTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      {session.notes && (
                        <span className="text-[11px] text-[var(--color-text-subtle)] italic truncate max-w-[120px]">
                          — {session.notes}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        store.requestConfirmation({
                          title: 'Delete Session',
                          message: 'Are you sure you want to delete this recorded session?',
                          confirmLabel: 'Delete Session',
                          confirmVariant: 'danger',
                          onConfirm: () => store.deleteSession(session.id),
                        })
                      }
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-[var(--color-error)] text-[var(--color-text-muted)] transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT 50%: DEDICATED SUBTASKS CANVAS                      */}
        {/* ========================================================= */}
        <div className="w-full lg:w-1/2 flex flex-col h-full overflow-hidden bg-[var(--color-surface-raised)]/25">
          {/* Subtasks Progress Header */}
          <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GitBranch className="w-4 h-4 text-[var(--color-brand)]" />
                <h3 className="text-sm font-bold text-[var(--color-text-strong)]">Subtasks</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] font-semibold border border-[var(--color-border-subtle)]">
                  {completedSubtasksCount}/{totalSubtasksCount}
                </span>
              </div>

              {totalSubtasksCount > 0 && (
                <span className="text-xs font-bold text-[var(--color-brand)] font-mono">
                  {subtasksPercent}%
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {totalSubtasksCount > 0 && (
              <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-soft)] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${subtasksPercent}%` }}
                />
              </div>
            )}

            {/* Quick Add Subtask Input Card */}
            <div className="flex items-center space-x-2 bg-[var(--color-surface-canvas)] p-2 rounded-xl border border-[var(--color-border-default)] shadow-xs focus-within:border-[var(--color-brand)] transition-all">
              <Plus className="w-4 h-4 text-[var(--color-brand)] shrink-0" />
              <input
                type="text"
                placeholder={`Add a subtask to "${detail.title}"... (Press Enter)`}
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSubtask();
                  }
                }}
                className="flex-1 bg-transparent text-xs border-none ring-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)]"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!subtaskInput.trim()}
                className="px-2.5 py-1 bg-[var(--color-brand)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--color-brand-hover)] disabled:opacity-35 transition cursor-pointer shrink-0"
              >
                Add
              </button>
            </div>
          </div>

          {/* Subtasks Checklist Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {detail.subtasks.length === 0 ? (
              <div className="py-16 text-center text-[var(--color-text-muted)] space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-soft)] flex items-center justify-center mx-auto text-[var(--color-text-muted)] shadow-xs">
                  <GitBranch className="w-6 h-6 stroke-[1.8]" />
                </div>
                <h4 className="text-xs font-bold text-[var(--color-text-strong)]">No subtasks yet</h4>
                <p className="text-[11px] text-[var(--color-text-muted)] max-w-xs mx-auto">
                  Break down "{detail.title}" into smaller actionable subtasks above. You can drill down into any subtask to add its own nested steps.
                </p>
              </div>
            ) : (
              detail.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  onClick={() => store.drillDownSubtask(subtask.id)}
                  className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    subtask.isDone
                      ? 'bg-[var(--color-surface-raised)]/40 border-[var(--color-border-subtle)] opacity-75'
                      : 'bg-[var(--color-surface-raised)] border-[var(--color-border-subtle)] hover:border-[var(--color-brand)] hover:shadow-xs'
                  }`}
                >
                  {/* Left: Checkbox + Title */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        store.toggleTaskStatus(subtask);
                      }}
                      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                        subtask.isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-[var(--color-border-strong)] hover:border-emerald-500 bg-[var(--color-surface-canvas)]'
                      }`}
                    >
                      {subtask.isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-xs font-medium block truncate ${
                          subtask.isDone
                            ? 'line-through text-[var(--color-text-muted)]'
                            : 'text-[var(--color-text-strong)] group-hover:text-[var(--color-brand)]'
                        }`}
                      >
                        {subtask.title}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions: Timer, Delete, Drill-down Arrow */}
                  <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        store.startTimerForTask(subtask.id);
                      }}
                      title="Start focus timer on subtask"
                      className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)] text-[var(--color-text-muted)] transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
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
                      className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--color-error-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition cursor-pointer"
                      title="Delete subtask"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Drill-down Badge & Arrow */}
                    <div className="flex items-center space-x-1 text-xs font-semibold text-[var(--color-brand)] bg-[var(--color-brand-soft)]/50 group-hover:bg-[var(--color-brand-soft)] px-2 py-1 rounded-lg transition shrink-0">
                      <span className="text-[11px] hidden sm:inline">Open</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
