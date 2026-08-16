import { observer } from 'mobx-react-lite';
import {
  Search,
  Play,
  Pause,
  Clock,
  Calendar,
  Check,
  ChevronUp,
  ChevronDown,
  Trash2,
  GitBranch,
} from 'lucide-react';
import type { TasksStore } from '../store';

interface Props {
  store: TasksStore;
}

const PRIORITY_COLORS: Record<number, { bg: string; text: string; border: string; label: string }> = {
  1: { bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30', label: 'P1 Urgent' },
  2: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', label: 'P2 High' },
  3: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', label: 'P3 Med' },
  4: { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-500/30', label: 'P4 Low' },
};

export const TaskListPane = observer(({ store }: Props) => {
  const activeTimerTaskId = store.activeTimer?.taskId;

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0 border-r border-border">
      {/* Pane Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{store.activeListName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {store.filteredTasks.length} {store.filteredTasks.length === 1 ? 'task' : 'tasks'}
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={store.searchQuery}
              onChange={(e) => store.setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Quick Add Task Bar */}
        <div className="flex items-center space-x-2 bg-card p-2 rounded-xl border border-border shadow-sm">
          <input
            type="text"
            placeholder="+ Add a task (Press Enter to save)..."
            value={store.quickTaskTitle}
            onChange={(e) => store.setQuickTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && store.quickTaskTitle.trim()) {
                store.createQuickTask();
              }
            }}
            className="flex-1 bg-transparent text-sm px-2 focus:outline-none text-foreground placeholder:text-muted-foreground"
          />

          {/* Priority selector */}
          <select
            value={store.quickTaskPriority}
            onChange={(e) => store.setQuickTaskPriority(parseInt(e.target.value, 10))}
            className="text-xs bg-muted/60 border border-border rounded-lg px-2 py-1 focus:outline-none cursor-pointer text-foreground"
          >
            <option value={1}>🚩 P1 Urgent</option>
            <option value={2}>📙 P2 High</option>
            <option value={3}>📘 P3 Med</option>
            <option value={4}>⚪ P4 Low</option>
          </select>

          {/* Due date picker */}
          <input
            type="date"
            value={store.quickTaskDueDate}
            onChange={(e) => store.setQuickTaskDueDate(e.target.value)}
            className="text-xs bg-muted/60 border border-border rounded-lg px-2 py-1 focus:outline-none text-foreground"
          />

          <button
            type="button"
            onClick={() => store.createQuickTask()}
            disabled={!store.quickTaskTitle.trim()}
            className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 transition"
          >
            Add
          </button>
        </div>
      </div>

      {/* Task List Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {store.isLoadingTasks ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading tasks...</div>
        ) : store.filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No tasks found</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Add your first task above to get started
            </p>
          </div>
        ) : (
          store.filteredTasks.map((task, index) => {
            const isSelected = store.selectedTaskId === task.id;
            const isTimerActiveForThis = activeTimerTaskId === task.id;
            const pConfig = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[4];

            return (
              <div
                key={task.id}
                onClick={() => store.selectTask(task.id)}
                className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/20'
                    : 'bg-card border-border hover:border-foreground/20 hover:bg-muted/30'
                }`}
              >
                {/* Left: Checkbox + Title + Meta */}
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Completion Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      store.toggleTaskStatus(task);
                    }}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      task.isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                        : 'border-muted-foreground/40 hover:border-emerald-500 hover:bg-emerald-500/10'
                    }`}
                  >
                    {task.isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  {/* Title & Chips */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-sm font-medium leading-snug truncate ${
                          task.isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    {/* Meta info tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {/* Priority Tag */}
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${pConfig.bg} ${pConfig.text} ${pConfig.border}`}
                      >
                        {pConfig.label}
                      </span>

                      {/* Due Date Chip */}
                      {task.dueDate && (
                        <span className="flex items-center space-x-1 text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span>{new Date(task.dueDate).toISOString().slice(0, 10)}</span>
                          {task.dueTime && <span>{task.dueTime}</span>}
                        </span>
                      )}

                      {/* Subtasks Count */}
                      {task.subtaskCount > 0 && (
                        <span className="flex items-center space-x-1 text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          <GitBranch className="w-3 h-3" />
                          <span>
                            {task.completedSubtaskCount}/{task.subtaskCount}
                          </span>
                        </span>
                      )}

                      {/* Total Time Spent */}
                      {task.totalTimeFormatted && (
                        <span className="flex items-center space-x-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <Clock className="w-3 h-3" />
                          <span>{task.totalTimeFormatted}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Timer Button & Actions */}
                <div className="flex items-center space-x-1 pl-2 flex-shrink-0">
                  {/* Timer Start/Pause Button */}
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
                    title={isTimerActiveForThis ? 'Running live timer' : 'Start tracking time'}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-sm ${
                      isTimerActiveForThis
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-muted hover:bg-primary hover:text-primary-foreground text-foreground/80'
                    }`}
                  >
                    {isTimerActiveForThis ? (
                      store.isTimerRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-mono">{store.formattedTimerElapsed}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-mono">{store.formattedTimerElapsed}</span>
                        </>
                      )
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Move Up/Down */}
                  <div className="opacity-0 group-hover:opacity-100 flex flex-col transition">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        store.moveTaskOrder(index, 'up');
                      }}
                      disabled={index === 0}
                      className="p-0.5 hover:text-primary disabled:opacity-20"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        store.moveTaskOrder(index, 'down');
                      }}
                      disabled={index === store.filteredTasks.length - 1}
                      className="p-0.5 hover:text-primary disabled:opacity-20"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete task "${task.title}"?`)) {
                        store.deleteTask(task.id);
                      }
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
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
