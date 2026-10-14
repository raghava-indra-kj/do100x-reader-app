import { observer } from "mobx-react-lite";
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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Loader } from "@modules/core/ui/primitives/loader/loader";
import { Button } from "@modules/core/ui/primitives/button";
import { Select } from "@modules/core/ui/primitives/select";
import { Tooltip } from "@modules/core/ui/primitives/tooltip";
import type { TasksStore } from "../store";
import { localCalendarDate } from "../matrix-settings";
import { addDays } from "@reader/calendar-core";
const priorities = {
  "1": "P1 · Urgent",
  "2": "P2 · High",
  "3": "P3 · Medium",
  "4": "P4 · Low",
};
const priorityColors: Record<number, string> = {
  1: "#ef4444",
  2: "#f59e0b",
  3: "#3b82f6",
  4: "#9ca3af",
};
const dateLabel = (date: string) =>
  new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
export const TaskListPane = observer(({ store }: { store: TasksStore }) => {
  const [dateOpen, setDateOpen] = useState(false);
  const [rearranging, setRearranging] = useState(false);
  const setDate = (date: string) => {
    store.setQuickTaskDueDate(date);
    setDateOpen(false);
  };
  return (
    <section
      aria-label="Task list"
      className="flex-1 flex flex-col h-full min-w-0 bg-[var(--color-surface-canvas)]"
    >
      <header className="p-4 border-b border-[var(--color-border-subtle)] space-y-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-base font-semibold break-words">
              {store.activeListName}
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {store.filteredTasks.filter((task) => !task.isDone).length}{" "}
              pending ·{" "}
              {store.filteredTasks.filter((task) => task.isDone).length}{" "}
              completed
            </p>
          </div>
          <label className="flex items-center gap-2 rounded-md border border-[var(--color-border-subtle)] px-2 py-1.5 w-40 sm:w-48">
            <Search
              size={14}
              className="shrink-0 text-[var(--color-text-muted)]"
            />
            <input
              aria-label="Search tasks"
              placeholder="Search tasks…"
              value={store.searchQuery}
              onChange={(event) => store.setSearchQuery(event.target.value)}
              className="min-w-0 w-full text-xs outline-none bg-transparent"
            />
          </label>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void store.createQuickTask();
          }}
          className="space-y-2"
        >
          <div className="flex gap-2 items-center rounded-md border border-[var(--color-border-default)] p-2 focus-within:border-[var(--color-brand)]">
            <Plus size={17} className="text-[var(--color-brand)] shrink-0" />
            <input
              aria-label="New task title"
              maxLength={1000}
              disabled={store.isCreatingTask}
              value={store.quickTaskTitle}
              onChange={(event) => store.setQuickTaskTitle(event.target.value)}
              placeholder="Add a task…"
              className="min-w-0 flex-1 bg-transparent outline-none text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!store.quickTaskTitle.trim() || store.isCreatingTask}
              loading={store.isCreatingTask}
            >
              Add
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select
              ariaLabel="New task priority"
              tooltip="Priority"
              value={String(store.quickTaskPriority)}
              items={priorities}
              disabled={store.isCreatingTask}
              onValueChange={(value) => {
                if (value) store.setQuickTaskPriority(Number(value));
              }}
              className="py-1.5 px-2 text-xs"
            />
            <Popover.Root open={dateOpen} onOpenChange={setDateOpen}>
              <Popover.Trigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={store.isCreatingTask}
                    aria-label="New task due date"
                    tooltip="Due date"
                    startIcon={<Calendar size={14} />}
                  />
                }
              >
                {store.quickTaskDueDate
                  ? dateLabel(store.quickTaskDueDate)
                  : "No date"}
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner sideOffset={5} className="z-40">
                  <Popover.Popup className="w-56 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-lg p-3 space-y-2 outline-none">
                    <Popover.Title className="text-sm font-semibold">
                      Due date
                    </Popover.Title>
                    {[
                      ["Today", 0],
                      ["Tomorrow", 1],
                      ["Next week", 7],
                    ].map(([label, days]) => (
                      <button
                        key={label}
                        type="button"
                        className="flex w-full justify-between rounded px-2 py-2 text-sm hover:bg-[var(--color-surface-soft)]"
                        onClick={() =>
                          setDate(addDays(localCalendarDate(), Number(days)))
                        }
                      >
                        <span>{label}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {dateLabel(
                            addDays(localCalendarDate(), Number(days)),
                          )}
                        </span>
                      </button>
                    ))}
                    <label className="block text-xs border-t border-[var(--color-border-subtle)] pt-2">
                      Choose a date
                      <input
                        aria-label="Choose a due date"
                        type="date"
                        min="1900-01-01"
                        max="9998-12-31"
                        value={store.quickTaskDueDate}
                        onInput={(event) =>
                          store.setQuickTaskDueDate(event.currentTarget.value)
                        }
                        className="mt-2 block w-full rounded border border-[var(--color-border-subtle)] p-2 bg-[var(--color-surface-canvas)] text-sm"
                      />
                    </label>
                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDate("")}
                      >
                        Clear date
                      </Button>
                      <Popover.Close
                        render={
                          <Button type="button" size="sm" variant="outlined" />
                        }
                      >
                        Done
                      </Popover.Close>
                    </div>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            ariaLabel="Task order"
            value={store.taskSort ?? "manual"}
            items={{
              manual: "Manual order",
              priority: "Priority",
              due: "Due date",
              title: "Title",
            }}
            onValueChange={(value) => {
              if (value) {
                store.setTaskSort(value);
                setRearranging(false);
              }
            }}
            disabled={store.isReorderingTasks}
            className="text-xs py-1.5"
          />
          {(store.currentView === "inbox" ||
            store.currentView.startsWith("list:")) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={rearranging && store.canReorderTasks}
              disabled={
                !store.canReorderTasks ||
                store.isReorderingTasks ||
                store.filteredTasks.length < 2
              }
              startIcon={<ArrowUpDown size={14} />}
              onClick={() => setRearranging((value) => !value)}
            >
              {rearranging && store.canReorderTasks
                ? "Done arranging"
                : "Rearrange"}
            </Button>
          )}
          {store.isReorderingTasks && (
            <span
              role="status"
              className="text-xs text-[var(--color-text-muted)]"
            >
              Saving order…
            </span>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-2">
        {store.isLoadingTasks ? (
          <div
            role="status"
            className="py-12 flex items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]"
          >
            <Loader size={18} />
            Loading tasks…
          </div>
        ) : store.tasksError ? (
          <div role="alert" className="p-4 text-sm">
            <p>{store.tasksError}</p>
            <Button
              variant="outlined"
              size="sm"
              className="mt-3"
              onClick={() => void store.loadTasks()}
            >
              Retry tasks
            </Button>
          </div>
        ) : !store.filteredTasks.length ? (
          <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">
            {store.searchQuery
              ? "No tasks match your search."
              : store.currentView === "completed"
                ? "Completed tasks will appear here."
                : "No tasks here. Add a task above."}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border-subtle)]">
            {store.filteredTasks.map((task, index) => {
              const active = store.activeTimer?.taskId === task.id;
              const timerLabel = active
                ? store.isTimerRunning
                  ? "Pause timer"
                  : "Resume timer"
                : "Start timer";
              const statusLabel = task.isDone
                ? `Reopen ${task.title}`
                : `Complete ${task.title}`;
              return (
                <li
                  key={task.id}
                  className={`flex items-start gap-2 p-2 rounded-md ${store.selectedTaskId === task.id ? "bg-[var(--color-brand-soft)]" : "hover:bg-[var(--color-surface-soft)]"}`}
                >
                  {rearranging && store.canReorderTasks && (
                    <div className="flex flex-col shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Move ${task.title} up`}
                        tooltip="Move up"
                        disabled={index === 0 || store.isReorderingTasks}
                        onClick={() => void store.moveTaskOrder(index, "up")}
                      >
                        <ArrowUp size={13} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Move ${task.title} down`}
                        tooltip="Move down"
                        disabled={
                          index === store.filteredTasks.length - 1 ||
                          store.isReorderingTasks
                        }
                        onClick={() => void store.moveTaskOrder(index, "down")}
                      >
                        <ArrowDown size={13} />
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    role="checkbox"
                    aria-checked={task.isDone}
                    aria-label={statusLabel}
                    disabled={store.savingTaskIds?.has(task.id)}
                    tooltip={task.isDone ? "Reopen task" : "Complete task"}
                    onClick={() => void store.toggleTaskStatus(task)}
                  >
                    <span
                      className={`w-4 h-4 border rounded flex items-center justify-center ${task.isDone ? "bg-[var(--color-brand)] border-[var(--color-brand)] text-white" : "border-[var(--color-border-strong)]"}`}
                    >
                      {task.isDone && <Check size={13} />}
                    </span>
                  </Button>
                  <button
                    type="button"
                    aria-label={`Open ${task.title}`}
                    onClick={() => void store.selectTask(task.id)}
                    className="text-left min-w-0 flex-1 py-1.5"
                  >
                    <span
                      className={`block text-sm break-words ${task.isDone ? "line-through text-[var(--color-text-muted)]" : "text-[var(--color-text-strong)]"}`}
                    >
                      {task.title}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
                      {task.dueDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={11} />
                          {dateLabel(task.dueDate)}
                          {task.dueTime ? ` · ${task.dueTime}` : ""}
                        </span>
                      )}
                      {task.parentTitle && (
                        <span className="inline-flex items-center gap-1">
                          <GitBranch size={11} />
                          {task.parentTitle}
                        </span>
                      )}
                      {task.subtaskCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <GitBranch size={11} />
                          {task.completedSubtaskCount}/{task.subtaskCount}{" "}
                          subtasks
                        </span>
                      )}
                      {task.totalTimeFormatted && (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          {task.totalTimeFormatted}
                        </span>
                      )}
                    </span>
                  </button>
                  <div className="flex items-center shrink-0 gap-0.5">
                    <Tooltip
                      content={
                        priorities[
                          String(task.priority) as keyof typeof priorities
                        ] ?? "Priority"
                      }
                    >
                      <span
                        className="px-1"
                        tabIndex={0}
                        aria-label={
                          priorities[
                            String(task.priority) as keyof typeof priorities
                          ]
                        }
                      >
                        <Flag
                          size={12}
                          style={{ color: priorityColors[task.priority] }}
                        />
                      </span>
                    </Tooltip>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`${timerLabel} for ${task.title}`}
                      tooltip={
                        active
                          ? `${timerLabel} · ${store.formattedTimerElapsed}`
                          : timerLabel
                      }
                      disabled={store.isTimerBusy}
                      className={active ? "text-[var(--color-brand)]" : ""}
                      onClick={() => {
                        if (active) {
                          if (store.isTimerRunning)
                            void store.pauseActiveTimer();
                          else void store.resumeActiveTimer();
                        } else void store.startTimerForTask(task.id);
                      }}
                    >
                      {active && store.isTimerRunning ? (
                        <Pause size={14} />
                      ) : (
                        <Play size={14} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`Delete ${task.title}`}
                      tooltip="Delete task"
                      onClick={() =>
                        store.requestConfirmation({
                          title: "Delete task",
                          message: `Delete “${task.title}”${task.subtaskCount ? " and its subtasks" : ""}? Logged time will be kept in reports.`,
                          confirmLabel: "Delete task",
                          confirmVariant: "danger",
                          onConfirm: () => store.deleteTask(task.id),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
});
