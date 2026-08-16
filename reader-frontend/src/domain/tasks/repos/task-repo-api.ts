import { err, ok, type AsyncResult } from '@raghava.indra/result-ts';
import { AppError } from '../../../core/errors/app-error';
import { apiClient, getApiErrorMessage } from '../../../core/api/api-client';
import { TaskSchema, type TaskData } from '../models/task';
import { TaskListSchema, type TaskListData } from '../models/task-list';
import { TimeSessionSchema, type TimeSessionData } from '../models/time-session';
import { ActiveTimerSchema, type ActiveTimerData } from '../models/active-timer';
import { TimeAnalyticsSchema, type TimeAnalyticsData } from '../models/time-analytics';
import type { ITaskRepo } from './task-repo';

export class TaskRepoApi implements ITaskRepo {
  // Lists
  async getLists(): AsyncResult<{ lists: TaskListData[]; inbox: { taskCount: number; uncompletedCount: number; totalTimeSeconds: number } }, AppError> {
    try {
      const { data } = await apiClient.get('/task-lists');
      const lists = (data.lists as unknown[]).map((item) => TaskListSchema.parse(item));
      return ok({ lists, inbox: data.inbox });
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to fetch task lists'), cause: error }));
    }
  }

  async createList(params: { name: string; color?: string; icon?: string }): AsyncResult<TaskListData, AppError> {
    try {
      const { data } = await apiClient.post('/task-lists', params);
      return ok(TaskListSchema.parse(data));
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to create task list'), cause: error }));
    }
  }

  async updateList(id: string, params: { name?: string; color?: string; icon?: string; sortOrder?: number }): AsyncResult<TaskListData, AppError> {
    try {
      const { data } = await apiClient.patch(`/task-lists/${id}`, params);
      return ok(TaskListSchema.parse(data));
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to update task list'), cause: error }));
    }
  }

  async deleteList(id: string, deleteTasks?: boolean): AsyncResult<void, AppError> {
    try {
      await apiClient.delete(`/task-lists/${id}`, { params: { deleteTasks } });
      return ok(undefined);
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to delete task list'), cause: error }));
    }
  }

  // Tasks
  async getTasks(params: {
    listId?: string;
    status?: string;
    priority?: number;
    due?: string;
    search?: string;
    parentId?: string;
    includeSubtasks?: boolean;
  }): AsyncResult<TaskData[], AppError> {
    try {
      const { data } = await apiClient.get('/tasks', { params });
      return ok((data.tasks as unknown[]).map((item) => TaskSchema.parse(item)));
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to fetch tasks'), cause: error }));
    }
  }

  async getTask(id: string): AsyncResult<TaskData & { subtasks: TaskData[]; timeSessions: TimeSessionData[]; isActiveTimerRunning: boolean }, AppError> {
    try {
      const { data } = await apiClient.get(`/tasks/${id}`);
      const task = TaskSchema.parse(data);
      const subtasks = (data.subtasks as unknown[]).map((s) => TaskSchema.parse(s));
      const timeSessions = (data.timeSessions as unknown[]).map((s) => TimeSessionSchema.parse(s));
      return ok({
        ...task,
        subtasks,
        timeSessions,
        isActiveTimerRunning: Boolean(data.isActiveTimerRunning),
      });
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to fetch task details'), cause: error }));
    }
  }

  async createTask(params: {
    title: string;
    description?: string;
    listId?: string | null;
    parentId?: string | null;
    priority?: number;
    dueDate?: string | null;
    dueTime?: string | null;
  }): AsyncResult<TaskData, AppError> {
    try {
      const { data } = await apiClient.post('/tasks', params);
      return ok(TaskSchema.parse(data));
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to create task'), cause: error }));
    }
  }

  async updateTask(id: string, params: {
    title?: string;
    description?: string | null;
    status?: string;
    priority?: number;
    dueDate?: string | null;
    dueTime?: string | null;
    listId?: string | null;
    parentId?: string | null;
    sortOrder?: number;
  }): AsyncResult<TaskData, AppError> {
    try {
      const { data } = await apiClient.patch(`/tasks/${id}`, params);
      return ok(TaskSchema.parse(data));
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to update task'), cause: error }));
    }
  }

  async deleteTask(id: string): AsyncResult<void, AppError> {
    try {
      await apiClient.delete(`/tasks/${id}`);
      return ok(undefined);
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to delete task'), cause: error }));
    }
  }

  async reorderTasks(orderedIds: string[]): AsyncResult<void, AppError> {
    try {
      await apiClient.post('/tasks/reorder', { orderedIds });
      return ok(undefined);
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to reorder tasks'), cause: error }));
    }
  }

  // Live Timer
  async getActiveTimer(): AsyncResult<{ active: boolean; timer: ActiveTimerData | null }, AppError> {
    try {
      const { data } = await apiClient.get('/timer/active');
      return ok({
        active: Boolean(data.active),
        timer: data.timer ? ActiveTimerSchema.parse(data.timer) : null,
      });
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to get active timer'), cause: error }));
    }
  }

  async startTimer(taskId: string, notes?: string): AsyncResult<ActiveTimerData, AppError> {
    try {
      const { data } = await apiClient.post('/timer/start', { taskId, notes });
      return ok(ActiveTimerSchema.parse(data.timer));
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to start timer'), cause: error }));
    }
  }

  async pauseTimer(): AsyncResult<ActiveTimerData, AppError> {
    try {
      const { data } = await apiClient.post('/timer/pause');
      return ok(ActiveTimerSchema.parse(data.timer));
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to pause timer'), cause: error }));
    }
  }

  async resumeTimer(): AsyncResult<ActiveTimerData, AppError> {
    try {
      const { data } = await apiClient.post('/timer/resume');
      return ok(ActiveTimerSchema.parse(data.timer));
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to resume timer'), cause: error }));
    }
  }

  async stopTimer(notes?: string): AsyncResult<{ session: TimeSessionData; taskTotalTimeSeconds: number }, AppError> {
    try {
      const { data } = await apiClient.post('/timer/stop', { notes });
      return ok({
        session: TimeSessionSchema.parse(data.session),
        taskTotalTimeSeconds: data.taskTotalTimeSeconds,
      });
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to stop timer'), cause: error }));
    }
  }

  async discardTimer(): AsyncResult<void, AppError> {
    try {
      await apiClient.post('/timer/discard');
      return ok(undefined);
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to discard timer'), cause: error }));
    }
  }

  // Sessions
  async getTaskSessions(taskId: string): AsyncResult<TimeSessionData[], AppError> {
    try {
      const { data } = await apiClient.get(`/timer/tasks/${taskId}/sessions`);
      return ok((data.sessions as unknown[]).map((s) => TimeSessionSchema.parse(s)));
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to fetch task sessions'), cause: error }));
    }
  }

  async addSession(taskId: string, params: { startTime: string; endTime?: string; durationSeconds: number; notes?: string }): AsyncResult<{ session: TimeSessionData; taskTotalTimeSeconds: number }, AppError> {
    try {
      const { data } = await apiClient.post(`/timer/tasks/${taskId}/sessions`, params);
      return ok({
        session: TimeSessionSchema.parse(data.session),
        taskTotalTimeSeconds: data.taskTotalTimeSeconds,
      });
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to add time session'), cause: error }));
    }
  }

  async updateSession(sessionId: string, params: { startTime?: string; endTime?: string; durationSeconds?: number; notes?: string }): AsyncResult<{ session: TimeSessionData; taskTotalTimeSeconds: number }, AppError> {
    try {
      const { data } = await apiClient.patch(`/timer/sessions/${sessionId}`, params);
      return ok({
        session: TimeSessionSchema.parse(data.session),
        taskTotalTimeSeconds: data.taskTotalTimeSeconds,
      });
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to update session'), cause: error }));
    }
  }

  async deleteSession(sessionId: string): AsyncResult<{ taskTotalTimeSeconds: number }, AppError> {
    try {
      const { data } = await apiClient.delete(`/timer/sessions/${sessionId}`);
      return ok({ taskTotalTimeSeconds: data.taskTotalTimeSeconds });
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to delete session'), cause: error }));
    }
  }

  async deleteAllTaskSessions(taskId: string): AsyncResult<void, AppError> {
    try {
      await apiClient.delete(`/timer/tasks/${taskId}/sessions`);
      return ok(undefined);
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to delete all sessions'), cause: error }));
    }
  }

  // Analytics
  async getTimeAnalytics(params?: {
    days?: number;
    preset?: string;
    startDate?: string;
    endDate?: string;
    listId?: string;
    taskId?: string;
  }): AsyncResult<TimeAnalyticsData, AppError> {
    try {
      const { data } = await apiClient.get('/timer/analytics', { params });
      return ok(TimeAnalyticsSchema.parse(data));
    } catch (error) {
      return err(new AppError({ message: getApiErrorMessage(error, 'Failed to fetch time analytics'), cause: error }));
    }
  }
}
