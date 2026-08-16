import { ok, type AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import { Task, type TaskData } from '../models/task';
import { TaskList, type TaskListData } from '../models/task-list';
import { TimeSession, type TimeSessionData } from '../models/time-session';
import { ActiveTimer, type ActiveTimerData } from '../models/active-timer';
import { TimeAnalytics, type TimeAnalyticsData } from '../models/time-analytics';
import type { ITaskRepo } from '../repos/task-repo';
import { container, TYPES } from '@di/container';

function toTask(data: TaskData): Task {
  return new Task(data);
}

function toTaskList(data: TaskListData): TaskList {
  return new TaskList(data);
}

function toTimeSession(data: TimeSessionData): TimeSession {
  return new TimeSession(data);
}

function toActiveTimer(data: ActiveTimerData): ActiveTimer {
  return new ActiveTimer(data);
}

function toTimeAnalytics(data: TimeAnalyticsData): TimeAnalytics {
  return new TimeAnalytics(data);
}

export async function getTaskLists(): AsyncResult<{ lists: TaskList[]; inbox: { taskCount: number; uncompletedCount: number; totalTimeSeconds: number } }, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.getLists();
  if (!res.ok) return res;
  return ok({
    lists: res.data.lists.map(toTaskList),
    inbox: res.data.inbox,
  });
}

export async function createTaskList(params: { name: string; color?: string; icon?: string }): AsyncResult<TaskList, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.createList(params);
  if (!res.ok) return res;
  return ok(toTaskList(res.data));
}

export async function updateTaskList(id: string, params: { name?: string; color?: string; icon?: string; sortOrder?: number }): AsyncResult<TaskList, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.updateList(id, params);
  if (!res.ok) return res;
  return ok(toTaskList(res.data));
}

export async function deleteTaskList(id: string, deleteTasks?: boolean): AsyncResult<void, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  return repo.deleteList(id, deleteTasks);
}

export async function getTasks(params: {
  listId?: string;
  status?: string;
  priority?: number;
  due?: string;
  search?: string;
  parentId?: string;
  includeSubtasks?: boolean;
}): AsyncResult<Task[], AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.getTasks(params);
  if (!res.ok) return res;
  return ok(res.data.map(toTask));
}

export async function getTask(id: string): AsyncResult<Task & { subtasks: Task[]; timeSessions: TimeSession[]; isActiveTimerRunning: boolean }, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.getTask(id);
  if (!res.ok) return res;
  const task = toTask(res.data);
  return ok(
    Object.assign(task, {
      subtasks: res.data.subtasks.map(toTask),
      timeSessions: res.data.timeSessions.map(toTimeSession),
      isActiveTimerRunning: res.data.isActiveTimerRunning,
    })
  );
}

export async function createTask(params: {
  title: string;
  description?: string;
  listId?: string | null;
  parentId?: string | null;
  priority?: number;
  dueDate?: string | null;
  dueTime?: string | null;
}): AsyncResult<Task, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.createTask(params);
  if (!res.ok) return res;
  return ok(toTask(res.data));
}

export async function updateTask(id: string, params: {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: number;
  dueDate?: string | null;
  dueTime?: string | null;
  listId?: string | null;
  parentId?: string | null;
  sortOrder?: number;
}): AsyncResult<Task, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.updateTask(id, params);
  if (!res.ok) return res;
  return ok(toTask(res.data));
}

export async function deleteTask(id: string): AsyncResult<void, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  return repo.deleteTask(id);
}

export async function reorderTasks(orderedIds: string[]): AsyncResult<void, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  return repo.reorderTasks(orderedIds);
}

// Live Timer
export async function getActiveTimer(): AsyncResult<{ active: boolean; timer: ActiveTimer | null }, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.getActiveTimer();
  if (!res.ok) return res;
  return ok({
    active: res.data.active,
    timer: res.data.timer ? toActiveTimer(res.data.timer) : null,
  });
}

export async function startTimer(taskId: string, notes?: string): AsyncResult<ActiveTimer, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.startTimer(taskId, notes);
  if (!res.ok) return res;
  return ok(toActiveTimer(res.data));
}

export async function pauseTimer(): AsyncResult<ActiveTimer, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.pauseTimer();
  if (!res.ok) return res;
  return ok(toActiveTimer(res.data));
}

export async function resumeTimer(): AsyncResult<ActiveTimer, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.resumeTimer();
  if (!res.ok) return res;
  return ok(toActiveTimer(res.data));
}

export async function stopTimer(notes?: string): AsyncResult<{ session: TimeSession; taskTotalTimeSeconds: number }, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.stopTimer(notes);
  if (!res.ok) return res;
  return ok({
    session: toTimeSession(res.data.session),
    taskTotalTimeSeconds: res.data.taskTotalTimeSeconds,
  });
}

export async function discardTimer(): AsyncResult<void, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  return repo.discardTimer();
}

// Sessions
export async function getTaskSessions(taskId: string): AsyncResult<TimeSession[], AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.getTaskSessions(taskId);
  if (!res.ok) return res;
  return ok(res.data.map(toTimeSession));
}

export async function addSession(taskId: string, params: { startTime: string; endTime?: string; durationSeconds: number; notes?: string }): AsyncResult<{ session: TimeSession; taskTotalTimeSeconds: number }, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.addSession(taskId, params);
  if (!res.ok) return res;
  return ok({
    session: toTimeSession(res.data.session),
    taskTotalTimeSeconds: res.data.taskTotalTimeSeconds,
  });
}

export async function updateSession(sessionId: string, params: { startTime?: string; endTime?: string; durationSeconds?: number; notes?: string }): AsyncResult<{ session: TimeSession; taskTotalTimeSeconds: number }, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.updateSession(sessionId, params);
  if (!res.ok) return res;
  return ok({
    session: toTimeSession(res.data.session),
    taskTotalTimeSeconds: res.data.taskTotalTimeSeconds,
  });
}

export async function deleteSession(sessionId: string): AsyncResult<{ taskTotalTimeSeconds: number }, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  return repo.deleteSession(sessionId);
}

export async function deleteAllTaskSessions(taskId: string): AsyncResult<void, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  return repo.deleteAllTaskSessions(taskId);
}

export async function getTimeAnalytics(days?: number): AsyncResult<TimeAnalytics, AppError> {
  const repo = container.get<ITaskRepo>(TYPES.ITaskRepo);
  const res = await repo.getTimeAnalytics(days);
  if (!res.ok) return res;
  return ok(toTimeAnalytics(res.data));
}
