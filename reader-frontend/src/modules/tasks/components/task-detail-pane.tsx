import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Popover } from "@base-ui/react/popover";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Layers,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@modules/core/ui/primitives/button";
import { Select } from "@modules/core/ui/primitives/select";
import { Tooltip } from "@modules/core/ui/primitives/tooltip";
import { Loader } from "@modules/core/ui/primitives/loader/loader";
import { addDays } from "@reader/calendar-core";
import type { TasksStore } from "../store";
import type { Task } from "@domain/tasks/models/task";
import { localCalendarDate } from "../matrix-settings";

const field =
  "w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] p-2 text-sm focus-visible:outline-[var(--color-brand)]";
const priorities = {
  "1": "P1 · Urgent",
  "2": "P2 · High",
  "3": "P3 · Medium",
  "4": "P4 · Low",
};
const dateLabel = (date: string) =>
  new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const sessionLabel = (start: string) =>
  new Date(start).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const TimerControls = observer(
  ({ store, task }: { store: TasksStore; task: Task }) => {
    const active = store.activeTimer?.taskId === task.id;
    const label = active
      ? store.isTimerRunning
        ? "Pause timer"
        : "Resume timer"
      : "Start timer";
    return (
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant={active ? "outlined" : "ghost"}
          aria-label={`${label} for ${task.title}`}
          tooltip={label}
          disabled={store.isTimerBusy}
          startIcon={
            active && store.isTimerRunning ? (
              <Pause size={14} />
            ) : (
              <Play size={14} />
            )
          }
          onClick={() => {
            if (!active) void store.startTimerForTask(task.id);
            else if (store.isTimerRunning) void store.pauseActiveTimer();
            else void store.resumeActiveTimer();
          }}
        >
          {active ? (
            <span className="tabular-nums">{store.formattedTimerElapsed}</span>
          ) : (
            "Start timer"
          )}
        </Button>
        {active && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Save tracked time"
            tooltip="Save tracked time"
            disabled={store.isTimerBusy}
            onClick={() => store.promptStopTimer()}
          >
            <Square size={14} />
          </Button>
        )}
      </div>
    );
  },
);

const DueDateEditor = observer(
  ({ store, task }: { store: TasksStore; task: Task }) => {
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState(""),
      [time, setTime] = useState("");
    const busy = store.savingTaskIds?.has(task.id);
    const changeOpen = (next: boolean) => {
      if (busy) return;
      if (next) {
        setDate(task.dueDate?.slice(0, 10) ?? "");
        setTime(task.dueTime ?? "");
      }
      setOpen(next);
    };
    const save = async (clear = false) => {
      if (
        await store.updateTaskProperties(task.id, {
          dueDate: clear ? null : date || null,
          dueTime: clear || !date ? null : time || null,
        })
      )
        setOpen(false);
    };
    return (
      <Popover.Root open={open} onOpenChange={changeOpen}>
        <Popover.Trigger
          render={
            <Button
              variant="outlined"
              size="sm"
              aria-label="Change task due date and time"
              startIcon={<Calendar size={14} />}
            />
          }
        >
          {task.dueDate
            ? `${dateLabel(task.dueDate)}${task.dueTime ? ` · ${task.dueTime}` : ""}`
            : "Set due date"}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} className="z-50">
            <Popover.Popup className="w-72 max-w-[calc(100vw-24px)] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-4 shadow-lg outline-none">
              <Popover.Title className="font-semibold text-sm mb-3">
                Due date & time
              </Popover.Title>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <fieldset disabled={busy} className="space-y-3">
                  <div className="flex gap-1">
                    {[
                      ["Today", 0],
                      ["Tomorrow", 1],
                      ["Next week", 7],
                    ].map(([label, days]) => (
                      <Button
                        key={label}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDate(addDays(localCalendarDate(), Number(days)))
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <label className="block text-xs">
                    Date
                    <input
                      aria-label="Task due date"
                      type="date"
                      min="1900-01-01"
                      max="9998-12-31"
                      value={date}
                      onInput={(event) => setDate(event.currentTarget.value)}
                      className={`${field} mt-1`}
                    />
                  </label>
                  <label className="block text-xs">
                    Time (optional)
                    <input
                      aria-label="Task due time"
                      type="time"
                      value={time}
                      disabled={!date || busy}
                      onInput={(event) => setTime(event.currentTarget.value)}
                      className={`${field} mt-1`}
                    />
                  </label>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    For a scheduled task, this moves its next calendar block.
                    Clear date also removes its schedule.
                  </p>
                </fieldset>
                <div className="flex justify-between gap-2 mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void save(true)}
                  >
                    Clear date
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    loading={busy}
                    disabled={busy}
                  >
                    Apply
                  </Button>
                </div>
              </form>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  },
);

// Null drafts follow refreshed server values; typed drafts survive background refreshes.
const TaskTextEditor = observer(
  ({ store, task }: { store: TasksStore; task: Task }) => {
    const [title, setTitle] = useState<string | null>(null),
      [notes, setNotes] = useState<string | null>(null);
    const [saving, setSaving] = useState(false),
      [failed, setFailed] = useState(false);
    const dirty =
      (title !== null && title !== task.title) ||
      (notes !== null && notes !== (task.description ?? ""));
    const save = async () => {
      if (saving || !dirty) return;
      if (title !== null && !title.trim()) {
        setFailed(true);
        return;
      }
      const savedTitle = title,
        savedNotes = notes;
      setSaving(true);
      setFailed(false);
      const success = await store.updateTaskProperties(task.id, {
        ...(title === null ? {} : { title: title.trim() }),
        ...(notes === null ? {} : { description: notes }),
      });
      setSaving(false);
      if (success) {
        setTitle((current) => (current === savedTitle ? null : current));
        setNotes((current) => (current === savedNotes ? null : current));
      } else setFailed(true);
    };
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-3"
      >
        <label className="block">
          <span className="sr-only">Task title</span>
          <textarea
            aria-label="Task title"
            rows={2}
            maxLength={1000}
            value={title ?? task.title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => void save()}
            className={`w-full resize-y bg-transparent text-xl font-semibold leading-snug p-1 rounded focus-visible:outline-[var(--color-brand)] ${task.isDone ? "line-through text-[var(--color-text-muted)]" : ""}`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--color-text-muted)]">Notes</span>
          <textarea
            aria-label="Task notes"
            rows={4}
            maxLength={100000}
            value={notes ?? task.description ?? ""}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => void save()}
            placeholder="Add notes, links or a next step…"
            className={`${field} mt-1 resize-y leading-relaxed`}
          />
        </label>
        {(dirty || saving || failed) && (
          <div className="flex gap-2 items-center justify-between text-xs">
            <span
              role={failed ? "alert" : "status"}
              className={
                failed
                  ? "text-[var(--color-error)]"
                  : "text-[var(--color-text-muted)]"
              }
            >
              {saving
                ? "Saving changes…"
                : failed
                  ? "Changes not saved. Check the title and try again."
                  : "Unsaved changes"}
            </span>
            <Button
              type="submit"
              variant="outlined"
              size="sm"
              disabled={saving}
              loading={saving}
            >
              Save changes
            </Button>
          </div>
        )}
      </form>
    );
  },
);

const DetailContent = observer(({ store }: { store: TasksStore }) => {
  const detail = store.selectedTaskDetail!;
  const [subtask, setSubtask] = useState("");
  const busy = store.savingTaskIds?.has(detail.id);
  const completed = detail.subtasks.filter((task) => task.isDone).length;
  const addSubtask = async () => {
    const submitted = subtask;
    if (
      submitted.trim() &&
      (await store.addSubtask(detail.id, submitted.trim()))
    )
      setSubtask((current) => (current === submitted ? "" : current));
  };
  const deleteTask = (task: Task) =>
    store.requestConfirmation({
      title: "Delete task",
      message: `Delete “${task.title}” and its subtasks? Logged time will remain in reports.`,
      confirmLabel: "Delete task",
      confirmVariant: "danger",
      onConfirm: () => store.deleteTask(task.id),
    });
  return (
    <section className="flex-1 flex flex-col min-h-0 min-w-0 h-full bg-[var(--color-surface-canvas)]">
      <header className="px-3 py-2 border-b border-[var(--color-border-subtle)] shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {(detail.parentId || store.taskBreadcrumbs.length > 1) && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                tooltip="Back to parent task"
                aria-label="Back to parent task"
                onClick={() => void store.drillUpToParent()}
              >
                <ArrowLeft size={16} />
              </Button>
            )}
            <nav
              aria-label="Task hierarchy"
              className="flex items-center gap-1 min-w-0 text-xs overflow-x-auto"
            >
              {store.taskBreadcrumbs.map((crumb, index) => (
                <span
                  key={crumb.id}
                  className="flex items-center gap-1 shrink-0"
                >
                  {index > 0 && <ChevronRight size={12} />}
                  <button
                    type="button"
                    aria-current={
                      index === store.taskBreadcrumbs.length - 1
                        ? "page"
                        : undefined
                    }
                    disabled={index === store.taskBreadcrumbs.length - 1}
                    onClick={() => void store.drillToBreadcrumb(index)}
                    className="max-w-40 truncate hover:text-[var(--color-brand)] disabled:text-[var(--color-text-muted)]"
                  >
                    {crumb.title}
                  </button>
                </span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip="Refresh task"
              aria-label="Refresh selected task"
              disabled={busy}
              onClick={() => void store.selectTask(detail.id)}
            >
              <RefreshCw size={15} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip="Delete task"
              aria-label="Delete selected task"
              onClick={() => deleteTask(detail)}
            >
              <Trash2 size={15} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              tooltip="Close details"
              aria-label="Close details"
              onClick={() => void store.selectTask(null)}
            >
              <X size={17} />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-between flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            role="checkbox"
            aria-checked={detail.isDone}
            aria-label={
              detail.isDone ? "Reopen selected task" : "Complete selected task"
            }
            disabled={busy}
            startIcon={
              <span
                className={`flex items-center justify-center w-4 h-4 border rounded ${detail.isDone ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]" : "border-[var(--color-border-strong)]"}`}
              >
                {detail.isDone && <Check size={12} />}
              </span>
            }
            onClick={() => void store.toggleTaskStatus(detail)}
          >
            {detail.isDone ? "Completed" : "Mark complete"}
          </Button>
          <TimerControls store={store} task={detail} />
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        {store.detailError && (
          <div
            role="alert"
            className="text-sm border border-[var(--color-border-subtle)] rounded-md p-3"
          >
            <p>{store.detailError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void store.selectTask(detail.id)}
            >
              Retry refresh
            </Button>
          </div>
        )}
        <TaskTextEditor key={detail.id} store={store} task={detail} />
        <div className="flex flex-wrap gap-2 items-center">
          <Select
            ariaLabel="Task priority"
            value={String(detail.priority)}
            items={priorities}
            disabled={busy}
            onValueChange={(value) => {
              if (value)
                void store.updateTaskProperties(detail.id, {
                  priority: Number(value),
                });
            }}
            className="text-xs py-1.5"
          />
          {detail.parentId ? (
            <Tooltip content="Inherited from parent task">
              <span
                tabIndex={0}
                aria-label={`Task list: ${detail.list?.name ?? "Inbox"}, inherited from parent task`}
                className="inline-flex gap-2 items-center text-xs px-2 py-1.5"
              >
                <Layers size={14} />
                {detail.list?.name ?? "Inbox"}
              </span>
            </Tooltip>
          ) : (
            <Select
              ariaLabel="Change task list"
              value={detail.listId ?? "inbox"}
              items={{
                inbox: "Inbox",
                ...Object.fromEntries(
                  store.lists.map((list) => [list.id, list.name]),
                ),
              }}
              disabled={busy}
              onValueChange={(value) => {
                if (value)
                  void store.updateTaskProperties(detail.id, {
                    listId: value === "inbox" ? null : value,
                  });
              }}
              className="text-xs py-1.5 max-w-full"
            />
          )}
          <DueDateEditor store={store} task={detail} />
          <Link
            to={`/calendar?task=${detail.id}`}
            className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-xs text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
          >
            <Calendar size={14} />
            Plan in Calendar
          </Link>
        </div>
        <section
          aria-label="Subtasks"
          className="border-t border-[var(--color-border-subtle)] pt-4"
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Subtasks</h3>
            <span className="text-xs text-[var(--color-text-muted)]">
              {completed} of {detail.subtasks.length} done
            </span>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void addSubtask();
            }}
            className="flex gap-2 mb-3"
          >
            <input
              aria-label="New subtask title"
              value={subtask}
              maxLength={1000}
              onChange={(event) => setSubtask(event.target.value)}
              disabled={store.creatingSubtasks?.has(detail.id)}
              placeholder="Break this into smaller steps…"
              className={`${field} min-w-0 flex-1`}
            />
            <Button
              type="submit"
              size="sm"
              disabled={
                !subtask.trim() || store.creatingSubtasks?.has(detail.id)
              }
              aria-label="Add subtask"
              tooltip="Add subtask"
              iconOnly
            >
              <Plus size={17} />
            </Button>
          </form>
          {!detail.subtasks.length ? (
            <p className="text-xs text-[var(--color-text-muted)] py-2">
              No subtasks yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-subtle)]">
              {detail.subtasks.map((task) => (
                <li key={task.id} className="flex items-start gap-1 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    role="checkbox"
                    aria-checked={task.isDone}
                    aria-label={`${task.isDone ? "Reopen" : "Complete"} subtask ${task.title}`}
                    tooltip={
                      task.isDone ? "Reopen subtask" : "Complete subtask"
                    }
                    disabled={store.savingTaskIds?.has(task.id)}
                    onClick={() => void store.toggleTaskStatus(task)}
                  >
                    <span
                      className={`w-4 h-4 border rounded flex items-center justify-center ${task.isDone ? "bg-[var(--color-brand)] text-white" : ""}`}
                    >
                      {task.isDone && <Check size={12} />}
                    </span>
                  </Button>
                  <button
                    type="button"
                    aria-label={`Open subtask ${task.title}`}
                    className={`flex-1 min-w-0 text-left text-sm py-1.5 break-words ${task.isDone ? "line-through text-[var(--color-text-muted)]" : ""}`}
                    onClick={() => void store.drillDownSubtask(task.id)}
                  >
                    {task.title}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    tooltip="Start timer"
                    aria-label={`Start timer for subtask ${task.title}`}
                    disabled={store.isTimerBusy}
                    onClick={() => void store.startTimerForTask(task.id)}
                  >
                    <Play size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    tooltip="Delete subtask"
                    aria-label={`Delete subtask ${task.title}`}
                    onClick={() => deleteTask(task)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          aria-label="Tracked time"
          className="border-t border-[var(--color-border-subtle)] pt-4"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Clock size={15} />
              Tracked time · {detail.totalTimeFormatted || "0m"}
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => store.openAddSessionDialog()}
              startIcon={<Plus size={14} />}
            >
              Add time
            </Button>
          </div>
          {!detail.timeSessions.length ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              Start a timer or add time you’ve already spent.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-subtle)]">
              {detail.timeSessions.map((session) => (
                <li key={session.id} className="flex gap-2 py-2 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">
                      <strong className="tabular-nums">
                        {session.durationFormatted}
                      </strong>
                      <span className="ml-2 text-[var(--color-text-muted)]">
                        {sessionLabel(session.startTime)}
                      </span>
                    </p>
                    {session.notes && (
                      <p className="text-xs leading-relaxed mt-1 break-words whitespace-pre-wrap">
                        {session.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    tooltip="Edit time entry"
                    aria-label={`Edit time entry ${sessionLabel(session.startTime)}`}
                    onClick={() => store.openEditSessionDialog(session)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    tooltip="Delete time entry"
                    aria-label={`Delete time entry ${sessionLabel(session.startTime)}`}
                    onClick={() =>
                      store.requestConfirmation({
                        title: "Delete time entry",
                        message:
                          "Delete this time entry? This also updates the task total and time reports.",
                        confirmLabel: "Delete time entry",
                        confirmVariant: "danger",
                        onConfirm: () => store.deleteSession(session.id),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
});

export const TaskDetailPane = observer(({ store }: { store: TasksStore }) => {
  if (!store.selectedTaskId) return null;
  if (store.detailError && !store.selectedTaskDetail)
    return (
      <div className="p-5 text-sm space-y-3" role="alert">
        <p>{store.detailError}</p>
        <Button
          variant="outlined"
          size="sm"
          onClick={() => void store.selectTask(store.selectedTaskId)}
        >
          Retry task
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void store.selectTask(null)}
        >
          Close details
        </Button>
      </div>
    );
  if (store.isLoadingDetail || !store.selectedTaskDetail)
    return (
      <div role="status" className="p-6 flex gap-2 justify-center text-sm">
        <Loader size={18} />
        Loading task…
      </div>
    );
  return <DetailContent key={store.selectedTaskDetail.id} store={store} />;
});
