import { TaskHierarchyError } from "./task-hierarchy";

export type MatrixDate = "today" | "tomorrow" | "all";
type MatrixStatus = "active" | "done" | "all";
export interface MatrixOptions { date: MatrixDate; status: MatrixStatus; timeZone: string; includeOverdue: boolean }

export function matrixOptions(date: unknown, status: unknown, timeZone: unknown, includeOverdue: unknown): MatrixOptions | null {
  if (date === undefined) return null;
  if (!["today", "tomorrow", "all"].includes(date as string) || !["active", "done", "all"].includes((status ?? "active") as string)) {
    throw new TaskHierarchyError(400, "Choose a valid matrix date and status.");
  }
  const zone = timeZone ?? "UTC";
  try { if (typeof zone !== "string") throw new Error(); new Intl.DateTimeFormat("en", { timeZone: zone }).format(); }
  catch { throw new TaskHierarchyError(400, "Choose a valid time zone."); }
  if (includeOverdue !== undefined && ![true, false, "true", "false"].includes(includeOverdue as boolean | string)) {
    throw new TaskHierarchyError(400, "Include overdue must be true or false.");
  }
  return { date: date as MatrixDate, status: (status ?? "active") as MatrixStatus, timeZone: zone as string, includeOverdue: includeOverdue === true || includeOverdue === "true" };
}

function calendarDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Due dates are calendar dates stored at UTC midnight, not instants to shift
// into the browser's zone. Completion timestamps ARE instants in that zone.
export function filterMatrixTasks<T extends { status: string; dueDate: Date | null; completedAt: Date | null }>(tasks: T[], options: MatrixOptions, now = new Date()): T[] {
  const today = calendarDate(now, options.timeZone);
  const target = options.date === "tomorrow" ? new Date(Date.parse(`${today}T00:00:00Z`) + 86400000).toISOString().slice(0, 10) : today;
  return tasks.filter(task => {
    const completed = task.status === "done";
    if (task.status === "cancelled" || (options.status === "done" && !completed) || (options.status === "active" && completed)) return false;
    if (options.date === "all") return true;
    if (completed) return !!task.completedAt && calendarDate(task.completedAt, options.timeZone) === target;
    const due = task.dueDate?.toISOString().slice(0, 10);
    return due === target || (options.date === "today" && options.includeOverdue && !!due && due < today);
  });
}

export function tomorrowDueFilter(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  return { gte: start, lt: end };
}
