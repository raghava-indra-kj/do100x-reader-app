import { describe, expect, it } from "vitest";
import { filterMatrixTasks, matrixOptions, tomorrowDueFilter, type MatrixOptions } from "./task-matrix";

const now = new Date("2026-10-06T02:00:00Z");
const options: MatrixOptions = { date: "today", status: "active", timeZone: "Asia/Kolkata", includeOverdue: false };
const task = (id: string, due: string | null, status = "todo", completed: string | null = null) => ({ id, status, dueDate: due ? new Date(due) : null, completedAt: completed ? new Date(completed) : null });
const tasks = [task("today", "2026-10-06"), task("tomorrow", "2026-10-07"), task("overdue", "2026-10-05"), task("undated", null), task("done-today", "2026-10-09", "done", "2026-10-05T20:00:00Z"), task("done-yesterday", "2026-10-06", "done", "2026-10-05T16:00:00Z"), task("cancelled", "2026-10-06", "cancelled")];
const ids = (updates: Partial<MatrixOptions> = {}) => filterMatrixTasks(tasks, { ...options, ...updates }, now).map(task => task.id);

describe("priority matrix calendar and status rules", () => {
  it("uses each active task's due date; tomorrow and undated are separate", () => {
    expect(ids()).toEqual(["today"]);
    expect(ids({ date: "tomorrow" })).toEqual(["tomorrow"]);
    expect(ids({ date: "all" })).toEqual(["today", "tomorrow", "overdue", "undated"]);
  });
  it("uses completion instants in the selected local zone, not completed tasks' due dates", () => {
    expect(ids({ status: "done" })).toEqual(["done-today"]);
    expect(ids({ status: "done", timeZone: "UTC" })).toEqual([]);
    expect(ids({ status: "done", date: "tomorrow" })).toEqual([]);
    expect(ids({ status: "done", date: "all" })).toEqual(["done-today", "done-yesterday"]);
  });
  it("All status combines the appropriate date rules and excludes cancelled tasks", () => {
    expect(ids({ status: "all" })).toEqual(["today", "done-today"]);
    expect(ids({ status: "all", date: "all" })).toHaveLength(6);
  });
  it("overdue only affects active Today tasks", () => {
    expect(ids({ includeOverdue: true })).toEqual(["today", "overdue"]);
    expect(ids({ includeOverdue: true, date: "tomorrow" })).toEqual(["tomorrow"]);
    expect(ids({ includeOverdue: true, status: "done" })).toEqual(["done-today"]);
  });
  it("handles tomorrow across year and leap-day boundaries", () => {
    const opts = { ...options, date: "tomorrow" as const, timeZone: "UTC" };
    expect(filterMatrixTasks([task("new-year", "2027-01-01")], opts, new Date("2026-12-31T22:00Z"))).toHaveLength(1);
    expect(filterMatrixTasks([task("leap", "2028-02-29")], opts, new Date("2028-02-28T22:00Z"))).toHaveLength(1);
  });
  it("handles local midnight and DST without assuming a 24-hour completion day", () => {
    const rows = [task("before", null, "done", "2026-03-08T04:59:59Z"), task("midnight", null, "done", "2026-03-08T05:00:00Z"), task("after-jump", null, "done", "2026-03-08T07:01:00Z")];
    expect(filterMatrixTasks(rows, { ...options, status: "done", timeZone: "America/New_York" }, new Date("2026-03-08T12:00Z")).map(task => task.id)).toEqual(["midnight", "after-jump"]);
  });
  it("validates matrix query options and supplies explicit defaults", () => {
    expect(matrixOptions(undefined, undefined, undefined, undefined)).toBeNull();
    expect(matrixOptions("all", undefined, undefined, "true")).toEqual({ date: "all", status: "active", timeZone: "UTC", includeOverdue: true });
    for (const args of [["invalid", "active", "UTC", false], ["all", "invalid", "UTC", false], ["all", "active", "bad/zone", false], ["all", "active", "UTC", "invalid"]]) {
      expect(() => matrixOptions(...args as [unknown, unknown, unknown, unknown])).toThrow();
    }
  });
  it("the general Tomorrow filter is half-open at local midnight", () => {
    const range = tomorrowDueFilter(new Date(2026, 11, 31, 23));
    expect(range.gte).toEqual(new Date(2027, 0, 1));
    expect(range.lt).toEqual(new Date(2027, 0, 2));
  });
});
