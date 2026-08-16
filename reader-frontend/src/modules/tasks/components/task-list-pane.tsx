import { observer } from 'mobx-react-lite';
import {
  Search,
  Play,
  Pause,
  Clock,
  Calendar,
  Check,
  ChevronRight,
  ChevronDown,
  Trash2,
  GitBranch,
  Flag,
  Plus,
  CornerDownRight,
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

export const TaskListPane = observer(({ store }: Props) => {
  const activeTimerTaskId = store.activeTimer?.taskId;

  const [isPriorityMenuOpen, setIsPriorityMenuOpen] = useState(false);
  const [inlineSubtaskInputs, setInlineSubtaskInputs] = useState<Record<string, string>>({});

  const currentPriorityMeta = PRIORITY_META[store.quickTaskPriority] || PRIORITY_META[4];

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-surface-canvas)] min-w-0 border-r border-[var(--color-border-subtle)]">
      {/* Pane Header */}
      <div className="p-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]/60 backdrop-blur space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-strong)]">{store.activeListName}</h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {store.filteredTasks.filter((t) => !t.isDone).length} pending • {store.filteredTasks.filter((t) => t.isDone).length} completed
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={store.searchQuery}
              onChange={(e) => store.setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-raised)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] transition shadow-2xs"
            />
          </div>
        </div>

        {/* Quick Add Task Bar */}
        <div className="flex items-center space-x-2 bg-[var(--color-surface-raised)] p-2 rounded-2xl border border-[var(--color-border-default)] shadow-xs transition-focus focus-within:ring-2 focus-within:ring-[var(--color-brand)]/40 focus-within:border-[var(--color-brand)]">
          <input
            type="text"
            placeholder={`+ Add a task to ${store.activeListName}... (Press Enter to save)`}
            value={store.quickTaskTitle}
            onChange={(e) => store.setQuickTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && store.quickTaskTitle.trim()) {
                store.createQuickTask();
              }
            }}
            className="flex-1 bg-transparent text-xs px-2.5 py-1 focus:outline-none text-[var(--color-text-strong)] placeholder:text-[var(--color-text-muted)] font-medium"
          />

          {/* Custom Priority Dropdown Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPriorityMenuOpen(!isPriorityMenuOpen)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${currentPriorityMeta.bg} ${currentPriorityMeta.text} ${currentPriorityMeta.border}`}
            >
              <Flag className="w-3 h-3" style={{ color: currentPriorityMeta.flagColor }} />
              <span>{currentPriorityMeta.label}</span>
            </button>

            {isPriorityMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 z-40 w-36 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border-default)] shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
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
                      className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left font-medium transition ${
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

          {/* Quick Due Date Input */}
          <div className="flex items-center space-x-1 bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)] px-2 py-1 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <input
              type="date"
              value={store.quickTaskDueDate}
              onChange={(e) => store.setQuickTaskDueDate(e.target.value)}
              className="bg-transparent text-xs text-[var(--color-text-strong)] focus:outline-none cursor-pointer"
            />
          </div>

          {/* Add Button */}
          <button
            type="button"
            onClick={() => store.createQuickTask()}
            disabled={!store.quickTaskTitle.trim()}
            className="px-3.5 py-1.5 bg-[var(--color-brand)] text-white text-xs font-bold rounded-xl hover:bg-[var(--color-brand-hover)] disabled:opacity-35 transition shadow-xs flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Task List Hierarchy */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {store.isLoadingTasks ? (
          <div className="py-16 text-center text-xs text-[var(--color-text-muted)]">Loading tasks...</div>
        ) : store.filteredTasks.length === 0 ? (
          <div className="py-20 text-center text-[var(--color-text-muted)]">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-soft)] flex items-center justify-center mx-auto mb-3 text-[var(--color-text-muted)] shadow-xs">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <p className="text-sm font-bold text-[var(--color-text-strong)]">No tasks in this view</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Add your first task above to get organized.
            </p>
          </div>
        ) : (
          store.filteredTasks.map((task) => {
            const isSelected = store.selectedTaskId === task.id;
            const isTimerActiveForThis = activeTimerTaskId === task.id;
            const pConfig = PRIORITY_META[task.priority] || PRIORITY_META[4];
            const isExpanded = store.expandedTaskIds.has(task.id);
            const subtasks = store.taskSubtasksMap.get(task.id) || [];

            return (
              <div key={task.id} className="space-y-1">
                {/* Main Task Item Card */}
                <div
                  onClick={() => store.selectTask(task.id)}
                  className={`group relative flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[var(--color-surface-raised)] border-[var(--color-brand)] shadow-sm ring-1 ring-[var(--color-brand)]/30'
                      : 'bg-[var(--color-surface-raised)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] hover:shadow-2xs'
                  }`}
                >
                  {/* Left: Priority bar accent + Checkbox + Title */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Expand/Collapse Chevron (if task has subtasks) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        store.toggleTaskExpanded(task.id);
                      }}
                      className={`p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface-soft)] transition ${
                        task.subtaskCount === 0 && !isExpanded ? 'opacity-0 group-hover:opacity-40' : ''
                      }`}
                      title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>

                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        store.toggleTaskStatus(task);
                      }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        task.isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                          : 'border-[var(--color-border-strong)] hover:border-emerald-500 hover:bg-emerald-500/10'
                      }`}
                    >
                      {task.isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Title & Metadata row */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold leading-normal truncate ${
                          task.isDone
                            ? 'line-through text-[var(--color-text-muted)]'
                            : 'text-[var(--color-text-strong)]'
                        }`}
                      >
                        {task.title}
                      </p>

                      {/* Metadata Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center space-x-1 ${pConfig.bg} ${pConfig.text} ${pConfig.border}`}
                        >
                          <Flag className="w-2.5 h-2.5" style={{ color: pConfig.flagColor }} />
                          <span>{pConfig.label}</span>
                        </span>

                        {/* Due Date Chip */}
                        {task.dueDate && (
                          <span className="flex items-center space-x-1 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded-md font-medium">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{new Date(task.dueDate).toISOString().slice(0, 10)}</span>
                            {task.dueTime && <span>• {task.dueTime}</span>}
                          </span>
                        )}

                        {/* Subtasks Count */}
                        {task.subtaskCount > 0 && (
                          <span className="flex items-center space-x-1 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-soft)] px-2 py-0.5 rounded-md font-medium">
                            <GitBranch className="w-2.5 h-2.5 text-[var(--color-brand)]" />
                            <span>
                              {task.completedSubtaskCount}/{task.subtaskCount}
                            </span>
                          </span>
                        )}

                        {/* Total Time Badge */}
                        {task.totalTimeFormatted && (
                          <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{task.totalTimeFormatted}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Live Timer Button & Delete */}
                  <div className="flex items-center space-x-1.5 pl-3 shrink-0">
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
                      title={isTimerActiveForThis ? 'Toggle active live timer' : 'Start stopwatch on task'}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-xs ${
                        isTimerActiveForThis
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-[var(--color-surface-soft)] hover:bg-[var(--color-brand)] hover:text-white text-[var(--color-text-strong)]'
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
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--color-error-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Nested Subtasks Hierarchy Tree (When expanded) */}
                {isExpanded && (
                  <div className="pl-6 ml-4 border-l-2 border-[var(--color-border-default)] space-y-1.5 py-1 animate-in fade-in duration-150">
                    {subtasks.length === 0 ? (
                      <p className="text-[11px] text-[var(--color-text-muted)] italic py-1">No subtasks yet.</p>
                    ) : (
                      subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          onClick={() => store.selectTask(subtask.id)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-raised)]/70 hover:bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] text-xs group/sub cursor-pointer transition"
                        >
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <CornerDownRight className="w-3 h-3 text-[var(--color-text-subtle)] shrink-0" />
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
                          </div>
                        </div>
                      ))
                    )}

                    {/* Inline Quick Add Subtask */}
                    <div className="flex items-center space-x-1.5 pt-0.5">
                      <CornerDownRight className="w-3 h-3 text-[var(--color-text-subtle)]" />
                      <input
                        type="text"
                        placeholder="+ Add subtask (Press Enter)..."
                        value={inlineSubtaskInputs[task.id] || ''}
                        onChange={(e) =>
                          setInlineSubtaskInputs({
                            ...inlineSubtaskInputs,
                            [task.id]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && inlineSubtaskInputs[task.id]?.trim()) {
                            store.addInlineSubtask(task.id, inlineSubtaskInputs[task.id]);
                            setInlineSubtaskInputs({ ...inlineSubtaskInputs, [task.id]: '' });
                          }
                        }}
                        className="flex-1 bg-[var(--color-surface-soft)] border border-[var(--color-border-subtle)] text-[11px] rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] text-[var(--color-text-strong)]"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
