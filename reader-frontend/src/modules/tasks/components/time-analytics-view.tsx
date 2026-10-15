import { observer } from "mobx-react-lite";
import {
  Clock,
  BarChart2,
  Flame,
  Award,
  Layers,
  Calendar,
  Filter,
} from "lucide-react";
import { Select } from "@modules/core/ui/primitives/select";
import { Loader } from "@modules/core/ui/primitives/loader/loader";
import type { TasksStore } from "../store";
import { useState } from "react";
import { localCalendarDate } from "../matrix-settings";
import { addDays } from "@reader/calendar-core";
import { formatTrackedDuration } from "@domain/tasks/models/duration";

interface Props {
  store: TasksStore;
}

const PRESET_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7", label: "7 days" },
  { id: "14", label: "14 days" },
  { id: "30", label: "30 days" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom range" },
];

export const TimeAnalyticsView = observer(({ store }: Props) => {
  const data = store.analyticsData;
  const [customStart, setCustomStart] = useState(
    store.analyticsStartDate || addDays(localCalendarDate(), -6),
  );
  const [customEnd, setCustomEnd] = useState(
    store.analyticsEndDate || localCalendarDate(),
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--color-surface-canvas)] min-w-0 border-r border-[var(--color-border-subtle)] p-4 sm:p-6 overflow-y-auto space-y-6">
      {/* Analytics Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-strong)]">
            Time tracked
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Time by task and list, grouped by each session’s start date in your
            timezone.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-1 bg-[var(--color-surface-soft)] p-1 rounded-2xl border border-[var(--color-border-subtle)]">
          {PRESET_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={store.analyticsPreset === opt.id}
              onClick={() => store.setAnalyticsPreset(opt.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-xl transition cursor-pointer ${
                store.analyticsPreset === opt.id
                  ? "bg-[var(--color-surface-raised)] text-[var(--color-text-strong)] shadow-xs font-bold"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range & Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--color-surface-raised)] p-3 rounded-2xl border border-[var(--color-border-subtle)] text-xs">
        {/* Custom Range Pickers (if custom selected) */}
        {store.analyticsPreset === "custom" && (
          <div className="flex flex-wrap items-center gap-2 bg-[var(--color-surface-soft)] px-3 py-1.5 rounded-xl border border-[var(--color-border-default)]">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-brand)]" />
            <input
              type="date"
              value={customStart}
              aria-label="Report start date"
              onInput={(e) => setCustomStart(e.currentTarget.value)}
              className="bg-transparent text-xs text-[var(--color-text-strong)] focus:outline-none cursor-pointer font-medium"
            />
            <span className="text-[var(--color-text-muted)]">to</span>
            <input
              type="date"
              value={customEnd}
              aria-label="Report end date"
              onInput={(e) => setCustomEnd(e.currentTarget.value)}
              className="bg-transparent text-xs text-[var(--color-text-strong)] focus:outline-none cursor-pointer font-medium"
            />
            <button
              type="button"
              onClick={() =>
                store.setAnalyticsCustomRange(customStart, customEnd)
              }
              className="px-2.5 py-0.5 bg-[var(--color-brand)] text-[var(--color-text-on-brand)] font-bold rounded-lg hover:bg-[var(--color-brand-hover)] transition cursor-pointer text-[11px]"
            >
              Apply
            </button>
          </div>
        )}

        {/* Project Scope Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <span className="text-[11px] font-bold text-[var(--color-text-subtle)] uppercase">
            Scope:
          </span>
          <Select
            ariaLabel="Time report list"
            value={store.analyticsListId}
            onValueChange={(value) => {
              if (value) store.setAnalyticsListFilter(value);
            }}
            items={{
              all: "All lists",
              inbox: "Inbox",
              ...Object.fromEntries(
                store.lists.map((list) => [list.id, list.name]),
              ),
            }}
            className="text-xs py-1.5"
          />
        </div>

        {/* Period Label Chip */}
        {data && (
          <div className="ml-auto text-[11px] font-bold text-[var(--color-brand)] bg-[var(--color-brand-soft)]/40 px-3 py-1 rounded-xl">
            {data.periodLabel}
          </div>
        )}
      </div>

      {store.analyticsError ? (
        <div role="alert" className="text-sm text-[var(--color-error)]">
          {store.analyticsError}
          <button
            className="ml-3 underline"
            onClick={() => void store.loadAnalytics()}
          >
            Retry
          </button>
        </div>
      ) : store.isLoadingAnalytics ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-2 text-[var(--color-text-muted)] select-none">
          <Loader size={24} className="text-[var(--color-brand)]" />
          <span className="text-xs font-medium">Loading tracked time…</span>
        </div>
      ) : (
        data && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Time */}
              <div className="p-5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-xs space-y-2">
                <div className="flex items-center justify-between text-[var(--color-text-muted)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Tracked time
                  </span>
                  <Clock className="w-4 h-4 text-[var(--color-brand)]" />
                </div>
                <div className="text-3xl font-bold tracking-tight font-mono text-[var(--color-text-strong)]">
                  {data.totalFormatted}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {data.periodLabel}
                </p>
              </div>

              {/* Sessions Count */}
              <div className="p-5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-xs space-y-2">
                <div className="flex items-center justify-between text-[var(--color-text-muted)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Time entries
                  </span>
                  <Flame className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-3xl font-bold tracking-tight text-[var(--color-text-strong)]">
                  {data.sessionsCount}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Saved time entries
                </p>
              </div>

              {/* Top Project */}
              <div className="p-5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-xs space-y-2">
                <div className="flex items-center justify-between text-[var(--color-text-muted)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Most tracked list
                  </span>
                  <Award className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-3xl font-bold tracking-tight text-[var(--color-text-strong)] truncate">
                  {data.byList[0]?.name || "None"}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {data.byList[0]
                    ? `${formatTrackedDuration(data.byList[0].seconds)} tracked`
                    : "No time recorded for these dates."}
                </p>
              </div>
            </div>

            {/* Breakdown by Lists / Projects */}
            <div className="p-5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[var(--color-brand)]" />
                  <span>Time by list</span>
                </h2>
              </div>

              {data.byList.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--color-text-muted)] italic">
                  No time recorded for these dates.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.byList.map((item) => {
                    const pct =
                      data.totalSeconds > 0
                        ? Math.round((item.seconds / data.totalSeconds) * 100)
                        : 0;
                    return (
                      <div key={item.listId ?? "inbox"} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 font-medium text-[var(--color-text-strong)]">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <div className="space-x-2 text-[var(--color-text-muted)]">
                            <strong className="text-[var(--color-text-strong)]">
                              {formatTrackedDuration(item.seconds)}
                            </strong>
                            <span>({pct}%)</span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--color-surface-soft)] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Breakdown by Top Tasks */}
            <div className="p-5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-[var(--color-brand)]" />
                  <span>Tasks by tracked time</span>
                </h2>
              </div>

              {data.byTask.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--color-text-muted)] italic">
                  No tasks with tracked time for these dates.
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border-subtle)]">
                  {data.byTask.map((task, idx) => {
                    const pct =
                      data.totalSeconds > 0
                        ? Math.round((task.seconds / data.totalSeconds) * 100)
                        : 0;
                    const content = (
                      <>
                        <span className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-bold text-[var(--color-text-subtle)] w-4 shrink-0">
                            {idx + 1}.
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-[var(--color-text-strong)] truncate">
                              {task.title}
                            </span>
                            <span className="block text-[10px] text-[var(--color-text-muted)]">
                              {task.listName}
                              {task.deleted
                                ? " · Deleted task · time retained"
                                : ""}
                            </span>
                          </span>
                        </span>
                        <span className="text-right space-y-0.5 shrink-0">
                          <span className="block font-bold text-[var(--color-text-strong)]">
                            {formatTrackedDuration(task.seconds)}
                          </span>
                          <span className="block text-[10px] text-[var(--color-text-muted)]">
                            {pct}% of total
                          </span>
                        </span>
                      </>
                    );
                    return task.deleted ? (
                      <div
                        key={task.taskId}
                        className="py-3 flex items-center justify-between gap-3 text-xs px-2"
                      >
                        {content}
                      </div>
                    ) : (
                      <button
                        type="button"
                        key={task.taskId}
                        aria-label={`Open task ${task.title}`}
                        onClick={() => void store.selectTask(task.taskId)}
                        className="py-3 flex w-full text-left items-center justify-between gap-3 text-xs hover:bg-[var(--color-surface-soft)]/50 focus-visible:outline-2 focus-visible:outline-[var(--color-brand)] rounded-xl px-2 transition cursor-pointer"
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
});
