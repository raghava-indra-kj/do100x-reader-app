import type { AsyncResult } from '@raghava.indra/result-ts';
import type { AppError } from '../../../core/errors/app-error';
import type { TaskData } from '../models/task';
import type { TaskListData } from '../models/task-list';
import type { TimeSessionData } from '../models/time-session';
import type { ActiveTimerData } from '../models/active-timer';
import type { TimeAnalyticsData } from '../models/time-analytics';

export interface ITaskRepo {
  // Lists
  getLists(): AsyncResult<{ lists: TaskListData[]; inbox: { taskCount: number; uncompletedCount: number; totalTimeSeconds: number } }, AppError>;
  createList(params: { name: string; color?: string; icon?: string }): AsyncResult<TaskListData, AppError>;
  updateList(id: string, params: { name?: string; color?: string; icon?: string; sortOrder?: number }): AsyncResult<TaskListData, AppError>;
  deleteList(id: string, deleteTasks?: boolean): AsyncResult<void, AppError>;

  // Tasks
  getTasks(params: {
    listId?: string;
    status?: string;
    priority?: number;
    due?: string;
    search?: string;
    parentId?: string;
    includeSubtasks?: boolean;
  }): AsyncResult<TaskData[], AppError>;

  getTask(id: string): AsyncResult<TaskData & { subtasks: TaskData[]; timeSessions: TimeSessionData[]; isActiveTimerRunning: boolean }, AppError>;
  createTask(params: {
    title: string;
    description?: string;
    listId?: string | null;
    parentId?: string | null;
    priority?: number;
    dueDate?: string | null;
    dueTime?: string | null;
  }): AsyncResult<TaskData, AppError>;

  updateTask(id: string, params: {
    title?: string;
    description?: string | null;
    status?: string;
    priority?: number;
    dueDate?: string | null;
    dueTime?: string | null;
    listId?: string | null;
    parentId?: string | null;
    sortOrder?: number;
  }): AsyncResult<TaskData, AppError>;

  deleteTask(id: string): AsyncResult<void, AppError>;
  reorderTasks(orderedIds: string[]): AsyncResult<void, AppError>;

  // Live Timer
  getActiveTimer(): AsyncResult<{ active: boolean; timer: ActiveTimerData | null }, AppError>;
  startTimer(taskId: string, notes?: string): AsyncResult<ActiveTimerData, AppError>;
  pauseTimer(): AsyncResult<ActiveTimerData, AppError>;
  resumeTimer(): AsyncResult<ActiveTimerData, AppError>;
  stopTimer(notes?: string, durationSeconds?: number): AsyncResult<{ session: TimeSessionData; taskTotalTimeSeconds: number }, AppError>;
  discardTimer(): AsyncResult<void, AppError>;

  // Manual Sessions
  getTaskSessions(taskId: string): AsyncResult<TimeSessionData[], AppError>;
  addSession(taskId: string, params: { startTime: string; endTime?: string; durationSeconds: number; notes?: string }): AsyncResult<{ session: TimeSessionData; taskTotalTimeSeconds: number }, AppError>;
  updateSession(sessionId: string, params: { startTime?: string; endTime?: string; durationSeconds?: number; notes?: string }): AsyncResult<{ session: TimeSessionData; taskTotalTimeSeconds: number }, AppError>;
  deleteSession(sessionId: string): AsyncResult<{ taskTotalTimeSeconds: number }, AppError>;
  deleteAllTaskSessions(taskId: string): AsyncResult<void, AppError>;

  // Analytics
  getTimeAnalytics(params?: {
    days?: number;
    preset?: string;
    startDate?: string;
    endDate?: string;
    listId?: string;
    taskId?: string;
  }): AsyncResult<TimeAnalyticsData, AppError>;
}
