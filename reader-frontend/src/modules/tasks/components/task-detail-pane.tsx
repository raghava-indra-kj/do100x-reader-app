import { observer } from 'mobx-react-lite';
import {
  X,
  Play,
  Pause,
  Square,
  Trash2,
  Plus,
  Clock,
  Edit2,
  RotateCcw,
  Check,
  GitBranch,
  Flag,
  FileText,
  ArrowLeft,
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

  // Empty State (No task selected)
  if (!store.selectedTaskId) {
    return (
      <div className="w-96 flex-shrink-0 border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]/40 p-6 flex flex-col items-center justify-center text-center text-[var(--color-text-muted)] select-none">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-soft)] flex items-center justify-center mb-3 shadow-xs text-[var(--color-brand)]">
          <Clock className="w-7 h-7 stroke-[1.8]" />
        </div>
        <h2 className="text-sm font-bold text-[var(--color-text-strong)]">Focus & Task Details</h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-[220px]">
          Select any task from your list to manage subtasks, write markdown notes, and run the server live timer.
        </p>

        {/* Quick status pill if a timer is running elsewhere */}
        {store.activeTimer && (
          <div className="mt-6 p-4 rounded-2xl bg-[var(--color-surface-raised)] border border-rose-500/30 shadow-sm w-full text-left space-y-2">
            <div className="flex items-center space-x-2 text-rose-500 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Timer Running on Another Task</span>
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
      <div className="w-96 flex-shrink-0 border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]/40 p-6 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
        Loading details...
      </div>
    );
  }

  const pConfig = PRIORITY_META[detail.priority] || PRIORITY_META[4];
  const completedSubtasksCount = detail.subtasks.filter((s) => s.isDone).length;
  const subtasksPercent =
    detail.subtasks.length > 0 ? Math.round((completedSubtasksCount / detail.subtasks.length) * 100) : 0;

  return (
    <div className="w-96 flex-shrink-0 border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] flex flex-col h-full overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {detail.parentId ? (
            <button
              type="button"
              onClick={() => store.selectTask(detail.parentId!)}
              className="flex items-center space-x-1.5 text-xs text-[var(--color-brand)] hover:underline font-bold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Parent Task</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pConfig.flagColor }} />
              <span className="text-xs font-bold text-[var(--color-text-strong)]">
                {detail.list ? detail.list.name : 'Inbox'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1">
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
            title="Close details"
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Title & Checkbox */}
        <div className="space-y-3">
          <div className="flex items-start space-x-2.5">
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
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== detail.title) {
                  store.updateTaskProperties(detail.id, { title: e.target.value.trim() });
                }
              }}
              className="text-sm font-bold bg-transparent focus:bg-[var(--color-surface-soft)] focus:ring-1 focus:ring-[var(--color-brand)] rounded-lg px-2 py-1 w-full border border-transparent hover:border-[var(--color-border-subtle)] transition text-[var(--color-text-strong)] cursor-text"
            />
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 gap-2 bg-[var(--color-surface-soft)]/50 p-3 rounded-2xl border border-[var(--color-border-subtle)] text-xs">
            {/* Priority Picker */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--color-text-subtle)] uppercase">Priority</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPriorityMenuOpen(!isPriorityMenuOpen)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border font-semibold cursor-pointer ${pConfig.bg} ${pConfig.text} ${pConfig.border}`}
                >
                  <div className="flex items-center space-x-1.5">
                    <Flag className="w-3 h-3" style={{ color: pConfig.flagColor }} />
                    <span>{pConfig.label}</span>
                  </div>
                </button>

                {isPriorityMenuOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 z-30 w-full bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border-default)] shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
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
                          className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-left font-medium transition cursor-pointer ${
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
            </div>

            {/* List Picker */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--color-text-subtle)] uppercase">List</label>
              <select
                value={detail.listId || 'inbox'}
                onChange={(e) => store.updateTaskProperties(detail.id, { listId: e.target.value === 'inbox' ? null : e.target.value })}
                className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-xl px-2.5 py-1.5 text-xs focus:outline-none text-[var(--color-text-strong)] font-medium cursor-pointer"
              >
                <option value="inbox">📥 Inbox</option>
                {store.lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    📁 {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--color-text-subtle)] uppercase">Due Date</label>
              <input
                type="date"
                value={detail.dueDate ? new Date(detail.dueDate).toISOString().slice(0, 10) : ''}
                onChange={(e) => store.updateTaskProperties(detail.id, { dueDate: e.target.value || null })}
                className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-xl px-2 py-1 text-xs focus:outline-none text-[var(--color-text-strong)] font-medium cursor-pointer"
              />
            </div>

            {/* Due Time */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--color-text-subtle)] uppercase">Due Time</label>
              <input
                type="time"
                value={detail.dueTime || ''}
                onChange={(e) => store.updateTaskProperties(detail.id, { dueTime: e.target.value || null })}
                className="w-full bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-xl px-2 py-1 text-xs focus:outline-none text-[var(--color-text-strong)] font-medium cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Live Stopwatch Timer Card */}
        <div className="p-4 rounded-2xl border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)]/20 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand)] flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Server Live Stopwatch</span>
            </span>
            {isRunningForThis && (
              <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                {store.isTimerRunning ? 'RUNNING' : 'PAUSED'}
              </span>
            )}
          </div>

          <div className="text-center py-1">
            <div className="text-3xl font-mono font-bold tracking-tight text-[var(--color-text-strong)]">
              {isRunningForThis ? store.formattedTimerElapsed : '00:00'}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Total Focus Recorded: <strong className="text-[var(--color-text-strong)]">{detail.totalTimeFormatted || '0m'}</strong>
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

        {/* Markdown Notes & Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-subtle)] flex items-center space-x-1.5">
              <FileText className="w-3 h-3" />
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
              onBlur={(e) => {
                if (e.target.value !== (detail.description || '')) {
                  store.updateTaskProperties(detail.id, { description: e.target.value });
                }
              }}
              placeholder="Write detailed notes (Markdown supported)..."
              className="w-full p-3 text-xs rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] transition cursor-text"
            />
          ) : (
            <div className="p-3.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)]/30 text-xs text-[var(--color-text-body)] min-h-[80px] whitespace-pre-wrap">
              {detail.description ? (
                detail.description
              ) : (
                <span className="text-[var(--color-text-muted)] italic">No notes added yet.</span>
              )}
            </div>
          )}
        </div>

        {/* Infinite Subtasks Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-subtle)] flex items-center space-x-1.5">
              <GitBranch className="w-3 h-3" />
              <span>Subtasks ({detail.subtasks.length})</span>
            </span>
            {detail.subtasks.length > 0 && (
              <span className="text-[10px] font-bold text-[var(--color-brand)]">
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

          {/* Inline Add Subtask Input */}
          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              placeholder="+ Add subtask (Press Enter)..."
              value={store.newSubtaskTitle}
              onChange={(e) => store.setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && store.newSubtaskTitle.trim()) {
                  store.addSubtask(detail.id);
                }
              }}
              className="flex-1 bg-[var(--color-surface-soft)] border border-[var(--color-border-default)] text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] text-[var(--color-text-strong)]"
            />
            <button
              type="button"
              onClick={() => store.addSubtask(detail.id)}
              disabled={!store.newSubtaskTitle.trim()}
              className="p-1.5 bg-[var(--color-brand)] text-white text-xs font-bold rounded-xl hover:bg-[var(--color-brand-hover)] disabled:opacity-35 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Subtasks List - Clicking opens the subtask as the selected task */}
          <div className="space-y-1">
            {detail.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                onClick={() => store.selectTask(subtask.id)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-soft)]/50 hover:bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] text-xs group/item cursor-pointer transition"
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
                        ? 'bg-emerald-500 border-emerald-500 text-white'
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

                <div className="flex items-center space-x-1 opacity-0 group-hover/item:opacity-100 transition">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      store.startTimerForTask(subtask.id);
                    }}
                    title="Start stopwatch on subtask"
                    className="p-1 hover:text-[var(--color-brand)] text-[var(--color-text-muted)] cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      store.deleteTask(subtask.id);
                    }}
                    className="p-1 hover:text-[var(--color-error)] text-[var(--color-text-muted)] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Sessions History */}
        <div className="space-y-2.5 pt-2 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-subtle)] flex items-center space-x-1.5">
              <Clock className="w-3 h-3" />
              <span>Time Sessions</span>
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => store.openAddSessionDialog()}
                className="text-[11px] text-[var(--color-brand)] hover:underline font-bold cursor-pointer"
              >
                + Log Time
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
                  Clear All
                </button>
              )}
            </div>
          </div>

          {detail.timeSessions.length === 0 ? (
            <div className="text-center py-4 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-soft)]/30 rounded-2xl border border-dashed border-[var(--color-border-subtle)]">
              No sessions logged yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {detail.timeSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-soft)]/40 text-xs flex items-center justify-between group/sess"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[var(--color-text-strong)] font-mono text-[11px]">
                        {session.durationFormatted}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {new Date(session.startTime).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {session.notes && (
                      <p className="text-[11px] text-[var(--color-text-muted)] truncate">{session.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover/sess:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => store.openEditSessionDialog(session)}
                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => store.deleteSession(session.id)}
                      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error)] cursor-pointer"
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
