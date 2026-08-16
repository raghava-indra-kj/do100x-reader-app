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
} from 'lucide-react';
import type { TasksStore } from '../store';
import { useState } from 'react';

interface Props {
  store: TasksStore;
}

export const TaskDetailPane = observer(({ store }: Props) => {
  const detail = store.selectedTaskDetail;
  const isRunningForThis = store.activeTimer?.taskId === detail?.id;

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descInput, setDescInput] = useState('');

  if (!store.selectedTaskId) {
    return (
      <div className="w-96 flex-shrink-0 border-l border-border bg-card/20 p-8 flex flex-col items-center justify-center text-center text-muted-foreground select-none">
        <Clock className="w-12 h-12 stroke-[1.5] mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium">No task selected</p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
          Select a task from the list to view details, track time, and manage subtasks.
        </p>
      </div>
    );
  }

  if (store.isLoadingDetail || !detail) {
    return (
      <div className="w-96 flex-shrink-0 border-l border-border bg-card/20 p-8 flex items-center justify-center text-sm text-muted-foreground">
        Loading task details...
      </div>
    );
  }

  return (
    <div className="w-96 flex-shrink-0 border-l border-border bg-card/40 backdrop-blur flex flex-col h-full overflow-hidden">
      {/* Detail Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Task Details
          </span>
        </div>
        <button
          type="button"
          onClick={() => store.selectTask(null)}
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Detail Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Title & Status */}
        <div className="space-y-3">
          <div className="flex items-start space-x-2.5">
            <button
              type="button"
              onClick={() => store.toggleTaskStatus(detail)}
              className={`w-6 h-6 rounded-full border mt-0.5 flex items-center justify-center transition-all flex-shrink-0 ${
                detail.isDone
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                  : 'border-muted-foreground/40 hover:border-emerald-500'
              }`}
            >
              {detail.isDone && <Check className="w-4 h-4 stroke-[3]" />}
            </button>

            <input
              type="text"
              defaultValue={detail.title}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== detail.title) {
                  store.updateTaskProperties(detail.id, { title: e.target.value.trim() });
                }
              }}
              className="text-base font-semibold bg-transparent focus:bg-background focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5 w-full border border-transparent hover:border-border transition text-foreground"
            />
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-xl border border-border text-xs">
            {/* Priority */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Priority</label>
              <select
                value={detail.priority}
                onChange={(e) => store.updateTaskProperties(detail.id, { priority: parseInt(e.target.value, 10) })}
                className="w-full bg-background border border-border rounded px-2 py-1 focus:outline-none text-foreground"
              >
                <option value={1}>🚩 P1 Urgent</option>
                <option value={2}>📙 P2 High</option>
                <option value={3}>📘 P3 Med</option>
                <option value={4}>⚪ P4 Low</option>
              </select>
            </div>

            {/* List */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">List</label>
              <select
                value={detail.listId || 'inbox'}
                onChange={(e) => store.updateTaskProperties(detail.id, { listId: e.target.value === 'inbox' ? null : e.target.value })}
                className="w-full bg-background border border-border rounded px-2 py-1 focus:outline-none text-foreground"
              >
                <option value="inbox">📥 Inbox</option>
                {store.lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Due Date</label>
              <input
                type="date"
                value={detail.dueDate ? new Date(detail.dueDate).toISOString().slice(0, 10) : ''}
                onChange={(e) => store.updateTaskProperties(detail.id, { dueDate: e.target.value || null })}
                className="w-full bg-background border border-border rounded px-2 py-1 focus:outline-none text-foreground"
              />
            </div>

            {/* Due Time */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Due Time</label>
              <input
                type="time"
                value={detail.dueTime || ''}
                onChange={(e) => store.updateTaskProperties(detail.id, { dueTime: e.target.value || null })}
                className="w-full bg-background border border-border rounded px-2 py-1 focus:outline-none text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Live Server Stopwatch Widget */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Live Server Timer</span>
            </span>
            {isRunningForThis && (
              <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
                {store.isTimerRunning ? 'RUNNING' : 'PAUSED'}
              </span>
            )}
          </div>

          <div className="text-center py-1">
            <div className="text-3xl font-mono font-bold tracking-tight text-foreground">
              {isRunningForThis ? store.formattedTimerElapsed : '00:00'}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total Recorded: <strong className="text-foreground">{detail.totalTimeFormatted || '0m'}</strong>
            </p>
          </div>

          <div className="flex items-center justify-center space-x-2">
            {isRunningForThis ? (
              <>
                {store.isTimerRunning ? (
                  <button
                    type="button"
                    onClick={() => store.pauseActiveTimer()}
                    className="flex-1 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm hover:opacity-90 transition"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => store.resumeActiveTimer()}
                    className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm hover:opacity-90 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => store.promptStopTimer()}
                  className="flex-1 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm hover:opacity-90 transition"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Finish</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Discard timer without saving session?')) {
                      store.discardActiveTimer();
                    }
                  }}
                  title="Discard timer"
                  className="p-1.5 bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg text-xs transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => store.startTimerForTask(detail.id)}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm hover:opacity-90 transition"
              >
                <Play className="w-4 h-4 fill-primary-foreground" />
                <span>Start Live Timer</span>
              </button>
            )}
          </div>
        </div>

        {/* Markdown Notes & Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes & Description
            </span>
            <button
              type="button"
              onClick={() => {
                if (isEditingDescription) {
                  store.updateTaskProperties(detail.id, { description: descInput });
                  setIsEditingDescription(false);
                } else {
                  setDescInput(detail.description || '');
                  setIsEditingDescription(true);
                }
              }}
              className="text-xs text-primary hover:underline font-medium"
            >
              {isEditingDescription ? 'Save' : 'Edit'}
            </button>
          </div>

          {isEditingDescription ? (
            <textarea
              rows={4}
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="Write detailed notes (Markdown supported)..."
              className="w-full p-2.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          ) : (
            <div
              onClick={() => {
                setDescInput(detail.description || '');
                setIsEditingDescription(true);
              }}
              className="p-3 rounded-xl border border-border bg-muted/20 text-xs text-foreground/90 min-h-[60px] whitespace-pre-wrap cursor-pointer hover:bg-muted/40 transition"
            >
              {detail.description ? (
                detail.description
              ) : (
                <span className="text-muted-foreground/60 italic">Click to add description or notes...</span>
              )}
            </div>
          )}
        </div>

        {/* Infinite Subtasks Manager */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Subtasks ({detail.subtasks.length})</span>
            </span>
          </div>

          {/* Subtask input */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="+ Add subtask..."
              value={store.newSubtaskTitle}
              onChange={(e) => store.setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && store.newSubtaskTitle.trim()) {
                  store.addSubtask(detail.id);
                }
              }}
              className="flex-1 bg-muted/50 border border-border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
            <button
              type="button"
              onClick={() => store.addSubtask(detail.id)}
              disabled={!store.newSubtaskTitle.trim()}
              className="px-2.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Subtask Items */}
          <div className="space-y-1.5">
            {detail.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs group"
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => store.toggleTaskStatus(subtask)}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                      subtask.isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-muted-foreground/40 hover:border-emerald-500'
                    }`}
                  >
                    {subtask.isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>
                  <span className={`truncate ${subtask.isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {subtask.title}
                  </span>
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => store.startTimerForTask(subtask.id)}
                    title="Start timer for subtask"
                    className="p-1 hover:text-primary"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => store.deleteTask(subtask.id)}
                    className="p-1 hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Tracking Log History */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Time Sessions</span>
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => store.openAddSessionDialog()}
                className="text-xs text-primary hover:underline font-medium"
              >
                + Log Time
              </button>
              {detail.timeSessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete all time sessions for this task?')) {
                      store.deleteAllSessionsForTask(detail.id);
                    }
                  }}
                  className="text-[11px] text-destructive hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {detail.timeSessions.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
              No sessions logged yet.
            </div>
          ) : (
            <div className="space-y-2">
              {detail.timeSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-2.5 rounded-xl border border-border bg-card text-xs flex items-center justify-between group"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-foreground">{session.durationFormatted}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(session.startTime).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {session.notes && <p className="text-[11px] text-muted-foreground truncate">{session.notes}</p>}
                  </div>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => store.openEditSessionDialog(session)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => store.deleteSession(session.id)}
                      className="p-1 text-muted-foreground hover:text-destructive"
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
