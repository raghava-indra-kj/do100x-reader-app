import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { toast } from '@modules/core/ui/primitives/toast';
import type { Task } from '@domain/tasks/models/task';
import type { TaskList } from '@domain/tasks/models/task-list';
import type { TimeSession } from '@domain/tasks/models/time-session';
import type { ActiveTimer } from '@domain/tasks/models/active-timer';
import type { TimeAnalytics } from '@domain/tasks/models/time-analytics';
import { readMatrixSettings, saveMatrixSettings, matrixCreationDate, localCalendarDate, type MatrixSettings } from './matrix-settings';
import {
  getTaskLists,
  createTaskList,
  updateTaskList,
  deleteTaskList,
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getActiveTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  discardTimer,
  addSession,
  updateSession,
  deleteSession,
  deleteAllTaskSessions,
  getTimeAnalytics,
} from '@domain/tasks/services/task-service';

export type TaskViewMode = 'inbox' | 'today' | 'next7' | 'matrix' | 'analytics' | 'completed' | string;

export class TasksStore {
  // Navigation & View
  currentView: TaskViewMode = 'inbox';
  searchQuery: string = '';
  matrixSettings: MatrixSettings = readMatrixSettings();
  matrixQuickListId: string = 'inbox';
  tasksError: string | null = null;
  private taskRequestId = 0;
  private calendarDay = localCalendarDate();

  // Data
  lists: TaskList[] = [];
  inboxCounts = { taskCount: 0, uncompletedCount: 0, totalTimeSeconds: 0 };
  tasks: Task[] = [];
  isLoadingTasks: boolean = false;
  isLoadingLists: boolean = false;

  // Selected Task Detail & Drill-down Breadcrumbs
  selectedTaskId: string | null = null;
  selectedTaskDetail: (Task & { subtasks: Task[]; timeSessions: TimeSession[]; isActiveTimerRunning: boolean }) | null = null;
  isLoadingDetail: boolean = false;
  taskBreadcrumbs: Array<{ id: string; title: string }> = [];

  // Quick Task Add Inputs
  quickTaskTitle: string = '';
  quickTaskPriority: number = 4;
  quickTaskDueDate: string = '';

  // Subtask Add Input
  newSubtaskTitle: string = '';

  // Active Timer
  activeTimer: ActiveTimer | null = null;
  timerElapsedSeconds: number = 0;
  private timerInterval: any = null;
  isStopTimerDialogOpen: boolean = false;
  stopTimerNotes: string = '';
  stopTimerDurationMinutes: number = 1;
  stopTimerOriginalMinutes: number = 1;

  // Analytics
  analyticsData: TimeAnalytics | null = null;
  analyticsPeriodDays: number = 7;
  analyticsPreset: string = '7';
  analyticsStartDate: string = '';
  analyticsEndDate: string = '';
  analyticsListId: string = 'all';
  analyticsTaskId: string = 'all';
  isLoadingAnalytics: boolean = false;

  // Custom In-App Confirmation Modal (Never use browser alert/confirm)
  confirmationModal: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
  } | null = null;

  // List Dialogs
  isListDialogOpen: boolean = false;
  editingListId: string | null = null;
  listNameInput: string = '';
  listColorInput: string = '#3b82f6';
  listIconInput: string = 'List';

  // Manual Session Dialog
  isSessionDialogOpen: boolean = false;
  editingSessionId: string | null = null;
  sessionDurationMinutes: number = 25;
  sessionNotesInput: string = '';
  sessionDateInput: string = new Date().toISOString().slice(0, 10);

  constructor() {
    makeObservable(this, {
      currentView: observable,
      searchQuery: observable,
      matrixSettings: observable,
      matrixQuickListId: observable,
      tasksError: observable,
      lists: observable,
      inboxCounts: observable,
      tasks: observable,
      isLoadingTasks: observable,
      isLoadingLists: observable,
      selectedTaskId: observable,
      selectedTaskDetail: observable,
      isLoadingDetail: observable,
      taskBreadcrumbs: observable,
      quickTaskTitle: observable,
      quickTaskPriority: observable,
      quickTaskDueDate: observable,
      newSubtaskTitle: observable,
      activeTimer: observable,
      timerElapsedSeconds: observable,
      isStopTimerDialogOpen: observable,
      stopTimerNotes: observable,
      stopTimerDurationMinutes: observable,
      stopTimerOriginalMinutes: observable,
      analyticsData: observable,
      analyticsPeriodDays: observable,
      analyticsPreset: observable,
      analyticsStartDate: observable,
      analyticsEndDate: observable,
      analyticsListId: observable,
      analyticsTaskId: observable,
      isLoadingAnalytics: observable,
      confirmationModal: observable,
      isListDialogOpen: observable,
      editingListId: observable,
      listNameInput: observable,
      listColorInput: observable,
      listIconInput: observable,
      isSessionDialogOpen: observable,
      editingSessionId: observable,
      sessionDurationMinutes: observable,
      sessionNotesInput: observable,
      sessionDateInput: observable,

      // Computed
      filteredTasks: computed,
      activeListName: computed,
      isTimerRunning: computed,
      formattedTimerElapsed: computed,
      matrixQ1Tasks: computed,
      matrixQ2Tasks: computed,
      matrixQ3Tasks: computed,
      matrixQ4Tasks: computed,
      matrixTasks: computed,

      // Actions
      setCurrentView: action,
      setSearchQuery: action,
      setMatrixSettings: action,
      setMatrixQuickList: action,
      createMatrixTask: action,
      setQuickTaskTitle: action,
      setQuickTaskPriority: action,
      setQuickTaskDueDate: action,
      setNewSubtaskTitle: action,
      selectTask: action,
      drillDownSubtask: action,
      drillUpToParent: action,
      drillToBreadcrumb: action,
      createQuickTask: action,
      toggleTaskStatus: action,
      updateTaskProperties: action,
      deleteTask: action,
      moveTaskOrder: action,
      addSubtask: action,
      setStopTimerNotes: action,
      setStopTimerDurationMinutes: action,
      adjustStopTimerMinutes: action,
      adjustSessionDuration: action,
      promptStopTimer: action,
      completeStopTimer: action,
      discardActiveTimer: action,
      startTimerForTask: action,
      pauseActiveTimer: action,
      resumeActiveTimer: action,
      setIsStopTimerDialogOpen: action,
      setIsListDialogOpen: action,
      openCreateListDialog: action,
      openEditListDialog: action,
      saveList: action,
      deleteList: action,
      setIsSessionDialogOpen: action,
      openAddSessionDialog: action,
      openEditSessionDialog: action,
      saveSession: action,
      deleteSession: action,
      deleteAllSessionsForTask: action,
      setSessionDurationMinutes: action,
      setSessionNotesInput: action,
      setSessionDateInput: action,
      requestConfirmation: action,
      closeConfirmation: action,
      setAnalyticsPreset: action,
      setAnalyticsCustomRange: action,
      setAnalyticsListFilter: action,
      setAnalyticsTaskFilter: action,
      loadAnalytics: action,
      loadLists: action,
      loadTasks: action,
      loadActiveTimer: action,
      setListNameInput: action,
      setListColorInput: action,
      setListIconInput: action,
    });

    this.init();
  }

  async init() {
    await Promise.all([this.loadLists(), this.loadActiveTimer(), this.loadTasks()]);
    this.startTimerTicker();
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ==========================================
  // COMPUTED PROPERTIES
  // ==========================================

  get isTimerRunning(): boolean {
    return Boolean(this.activeTimer && !this.activeTimer.isPaused);
  }

  get formattedTimerElapsed(): string {
    const total = this.timerElapsedSeconds;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  get activeListName(): string {
    if (this.currentView === 'inbox') return 'Inbox';
    if (this.currentView === 'today') return 'Today';
    if (this.currentView === 'next7') return 'Next 7 days';
    if (this.currentView === 'matrix') return 'Priority matrix';
    if (this.currentView === 'analytics') return 'Time reports';
    if (this.currentView === 'completed') return 'Completed tasks';
    if (this.currentView.startsWith('list:')) {
      const listId = this.currentView.replace('list:', '');
      const list = this.lists.find((l) => l.id === listId);
      return list?.name || 'List';
    }
    return 'Tasks';
  }

  get filteredTasks(): Task[] {
    let list = this.tasks;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return list;
  }

  get matrixQ1Tasks(): Task[] {
    return this.matrixTasks.filter((t) => t.priority === 1);
  }

  get matrixQ2Tasks(): Task[] {
    return this.matrixTasks.filter((t) => t.priority === 2);
  }

  get matrixQ3Tasks(): Task[] {
    return this.matrixTasks.filter((t) => t.priority === 3);
  }

  get matrixQ4Tasks(): Task[] {
    return this.matrixTasks.filter((t) => t.priority === 4);
  }

  get matrixTasks(): Task[] {
    return this.filteredTasks.filter(task => task.status !== 'cancelled' &&
      (this.matrixSettings.status === 'all' || (this.matrixSettings.status === 'completed' ? task.isDone : !task.isDone)))
      .sort((a, b) => Number(a.isDone) - Number(b.isDone) ||
        (a.isDone ? (b.completedAt ?? '').localeCompare(a.completedAt ?? '') : (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')) || a.sortOrder - b.sortOrder);
  }

  setMatrixSettings(updates: Partial<MatrixSettings>) {
    this.matrixSettings = { ...this.matrixSettings, ...updates };
    saveMatrixSettings(this.matrixSettings);
    if (this.currentView === 'matrix') void this.loadTasks();
  }

  setMatrixQuickList(listId: string) { this.matrixQuickListId = listId; }

  async createMatrixTask(title: string, priority: number): Promise<boolean> {
    if (!title.trim()) return false;
    const listId = this.matrixQuickListId === 'inbox' ? null : this.matrixQuickListId;
    const res = await createTask({ title: title.trim(), priority, listId, dueDate: matrixCreationDate(this.matrixSettings.date) });
    if (!res.ok) { toast.error(res.error.message); return false; }
    toast.success('Task added');
    await Promise.all([this.loadTasks(), this.loadLists()]);
    return true;
  }

  // ==========================================
  // ACTIONS & DATA FETCHING
  // ==========================================

  setCurrentView(view: TaskViewMode) {
    runInAction(() => {
      this.currentView = view;
      this.selectedTaskId = null;
      this.selectedTaskDetail = null;
    });
    if (view === 'analytics') {
      this.loadAnalytics();
    } else {
      this.loadTasks();
    }
  }

  setSearchQuery(q: string) {
    runInAction(() => {
      this.searchQuery = q;
    });
  }

  setQuickTaskTitle(val: string) {
    runInAction(() => {
      this.quickTaskTitle = val;
    });
  }

  setQuickTaskPriority(val: number) {
    runInAction(() => {
      this.quickTaskPriority = val;
    });
  }

  setQuickTaskDueDate(val: string) {
    runInAction(() => {
      this.quickTaskDueDate = val;
    });
  }

  setNewSubtaskTitle(val: string) {
    runInAction(() => {
      this.newSubtaskTitle = val;
    });
  }

  setStopTimerNotes(val: string) {
    runInAction(() => {
      this.stopTimerNotes = val;
    });
  }

  setIsStopTimerDialogOpen(val: boolean) {
    runInAction(() => {
      this.isStopTimerDialogOpen = val;
      if (!val) this.stopTimerNotes = '';
    });
  }

  setIsListDialogOpen(val: boolean) {
    runInAction(() => {
      this.isListDialogOpen = val;
    });
  }

  setListNameInput(val: string) {
    runInAction(() => {
      this.listNameInput = val;
    });
  }

  setListColorInput(val: string) {
    runInAction(() => {
      this.listColorInput = val;
    });
  }

  setListIconInput(val: string) {
    runInAction(() => {
      this.listIconInput = val;
    });
  }

  setIsSessionDialogOpen(val: boolean) {
    runInAction(() => {
      this.isSessionDialogOpen = val;
    });
  }

  setSessionDurationMinutes(val: number) {
    runInAction(() => {
      this.sessionDurationMinutes = val;
    });
  }

  setSessionNotesInput(val: string) {
    runInAction(() => {
      this.sessionNotesInput = val;
    });
  }

  setSessionDateInput(val: string) {
    runInAction(() => {
      this.sessionDateInput = val;
    });
  }

  // ==========================================
  // LISTS
  // ==========================================

  async loadLists() {
    runInAction(() => {
      this.isLoadingLists = true;
    });
    const res = await getTaskLists();
    runInAction(() => {
      this.isLoadingLists = false;
      if (res.ok) {
        this.lists = res.data.lists;
        this.inboxCounts = res.data.inbox;
      }
    });
  }

  openCreateListDialog() {
    runInAction(() => {
      this.editingListId = null;
      this.listNameInput = '';
      this.listColorInput = '#3b82f6';
      this.listIconInput = 'List';
      this.isListDialogOpen = true;
    });
  }

  openEditListDialog(list: TaskList) {
    runInAction(() => {
      this.editingListId = list.id;
      this.listNameInput = list.name;
      this.listColorInput = list.color || '#3b82f6';
      this.listIconInput = list.icon || 'List';
      this.isListDialogOpen = true;
    });
  }

  async saveList() {
    if (!this.listNameInput.trim()) {
      toast.error('Enter a list name.');
      return;
    }

    if (this.editingListId) {
      const res = await updateTaskList(this.editingListId, {
        name: this.listNameInput.trim(),
        color: this.listColorInput,
        icon: this.listIconInput,
      });
      if (res.ok) {
        toast.success('List updated');
        this.setIsListDialogOpen(false);
        await this.loadLists();
      } else {
        toast.error(res.error.message);
      }
    } else {
      const res = await createTaskList({
        name: this.listNameInput.trim(),
        color: this.listColorInput,
        icon: this.listIconInput,
      });
      if (res.ok) {
        toast.success('List created');
        this.setIsListDialogOpen(false);
        await this.loadLists();
        this.setCurrentView(`list:${res.data.id}`);
      } else {
        toast.error(res.error.message);
      }
    }
  }

  async deleteList(id: string) {
    const res = await deleteTaskList(id, false);
    if (res.ok) {
      toast.success('List deleted');
      if (this.currentView === `list:${id}`) {
        this.setCurrentView('inbox');
      }
      await this.loadLists();
      await this.loadTasks();
    } else {
      toast.error(res.error.message);
    }
  }

  // ==========================================
  // TASKS
  // ==========================================

  async loadTasks() {
    const requestId = ++this.taskRequestId;
    runInAction(() => {
      this.isLoadingTasks = true;
      this.tasksError = null;
    });

    const params: Record<string, unknown> = {};

    if (this.currentView === 'inbox') {
      params.listId = 'inbox';
      params.status = 'active';
    } else if (this.currentView === 'today') {
      params.due = 'today';
      params.status = 'active';
    } else if (this.currentView === 'next7') {
      params.due = 'next7';
      params.status = 'active';
    } else if (this.currentView === 'matrix') {
      params.status = this.matrixSettings.status === 'completed' ? 'done' : this.matrixSettings.status;
      params.includeSubtasks = true;
      params.matrixDate = this.matrixSettings.date;
      params.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      params.includeOverdue = this.matrixSettings.date === 'today' && this.matrixSettings.status !== 'completed' && this.matrixSettings.includeOverdue;
    } else if (this.currentView === 'completed') {
      params.status = 'done';
    } else if (this.currentView.startsWith('list:')) {
      params.listId = this.currentView.replace('list:', '');
      params.status = 'active';
    }

    const res = await getTasks(params as any);
    runInAction(() => {
      if (requestId !== this.taskRequestId) return;
      this.isLoadingTasks = false;
      if (res.ok) {
        this.tasks = res.data;
      } else {
        this.tasksError = res.error.message;
        if (this.currentView === 'matrix') this.tasks = [];
        toast.error(res.error.message);
      }
    });
  }

  async selectTask(taskId: string | null, options?: { isDrillDown?: boolean }) {
    if (!taskId) {
      runInAction(() => {
        this.selectedTaskId = null;
        this.selectedTaskDetail = null;
        this.taskBreadcrumbs = [];
        this.isLoadingDetail = false;
      });
      return;
    }

    runInAction(() => {
      this.selectedTaskId = taskId;
      this.isLoadingDetail = true;
    });

    const res = await getTask(taskId);
    runInAction(() => {
      if (this.selectedTaskId !== taskId) return;
      this.isLoadingDetail = false;
      if (res.ok) {
        this.selectedTaskDetail = res.data;

        if (options?.isDrillDown) {
          const idx = this.taskBreadcrumbs.findIndex((b) => b.id === taskId);
          if (idx >= 0) {
            this.taskBreadcrumbs = this.taskBreadcrumbs.slice(0, idx + 1);
          } else {
            this.taskBreadcrumbs = [...this.taskBreadcrumbs, { id: res.data.id, title: res.data.title }];
          }
        } else {
          const existingIdx = this.taskBreadcrumbs.findIndex((b) => b.id === taskId);
          if (existingIdx >= 0) {
            // Keep existing trail up to this item and update title if changed
            const updated = [...this.taskBreadcrumbs.slice(0, existingIdx + 1)];
            updated[existingIdx] = { id: res.data.id, title: res.data.title };
            this.taskBreadcrumbs = updated;
          } else {
            this.taskBreadcrumbs = [{ id: res.data.id, title: res.data.title }];
          }
        }
      } else {
        toast.error(res.error.message);
      }
    });
  }

  async drillDownSubtask(subtaskId: string) {
    await this.selectTask(subtaskId, { isDrillDown: true });
  }

  async drillUpToParent() {
    if (this.taskBreadcrumbs.length > 1) {
      const target = this.taskBreadcrumbs[this.taskBreadcrumbs.length - 2];
      this.taskBreadcrumbs = this.taskBreadcrumbs.slice(0, -1);
      await this.selectTask(target.id, { isDrillDown: false });
    } else if (this.selectedTaskDetail?.parentId) {
      await this.selectTask(this.selectedTaskDetail.parentId, { isDrillDown: false });
    } else {
      this.selectTask(null);
    }
  }

  async drillToBreadcrumb(targetIndex: number) {
    if (targetIndex >= 0 && targetIndex < this.taskBreadcrumbs.length) {
      const target = this.taskBreadcrumbs[targetIndex];
      this.taskBreadcrumbs = this.taskBreadcrumbs.slice(0, targetIndex + 1);
      await this.selectTask(target.id, { isDrillDown: false });
    }
  }

  async createQuickTask() {
    if (!this.quickTaskTitle.trim()) return;

    let targetListId: string | null = null;
    if (this.currentView.startsWith('list:')) {
      targetListId = this.currentView.replace('list:', '');
    }

    let dueDate: string | null = this.quickTaskDueDate || null;
    if (this.currentView === 'today' && !dueDate) {
      dueDate = new Date().toISOString().slice(0, 10);
    }

    const res = await createTask({
      title: this.quickTaskTitle.trim(),
      listId: targetListId,
      priority: this.quickTaskPriority,
      dueDate,
    });

    if (res.ok) {
      runInAction(() => {
        this.quickTaskTitle = '';
        this.quickTaskPriority = 4;
        this.quickTaskDueDate = '';
      });
      toast.success('Task created');
      await Promise.all([this.loadTasks(), this.loadLists()]);
      this.selectTask(res.data.id);
    } else {
      toast.error(res.error.message);
    }
  }

  async toggleTaskStatus(task: Task) {
    await this.updateTaskProperties(task.id, { status: task.isDone ? 'todo' : 'done' });
  }

  async updateTaskProperties(taskId: string, updates: Parameters<typeof updateTask>[1]) {
    const optimistic = updates.status === undefined ? updates : {
      ...updates, completedAt: updates.status === 'done' ? new Date().toISOString() : null,
    };
    const targets = new Set<Task>([
      ...this.tasks.filter(task => task.id === taskId),
      ...(this.selectedTaskDetail?.id === taskId ? [this.selectedTaskDetail] : []),
      ...(this.selectedTaskDetail?.subtasks.filter(task => task.id === taskId) ?? []),
    ]);
    const previous = [...targets].map(task => ({ task, values: Object.fromEntries(Object.keys(optimistic).map(key => [key, (task as unknown as Record<string, unknown>)[key]])) }));
    // 1. Instant optimistic update
    runInAction(() => {
      if (this.selectedTaskDetail) {
        if (this.selectedTaskDetail.id === taskId) {
          Object.assign(this.selectedTaskDetail, optimistic);
        }
        const sub = this.selectedTaskDetail.subtasks.find((s) => s.id === taskId);
        if (sub) {
          Object.assign(sub, optimistic);
        }
      }
      const task = this.tasks.find((t) => t.id === taskId);
      if (task) {
        Object.assign(task, optimistic);
      }
      // Task model instances are not observable; invalidate matrix groups now,
      // rather than waiting for the network refresh to move/complete a row.
      this.tasks = [...this.tasks];
    });

    // 2. Persist to API
    const res = await updateTask(taskId, updates);
    if (res.ok) {
      await Promise.all([this.loadTasks(), this.loadLists()]);
      if (this.selectedTaskId) {
        const selectedId = this.selectedTaskId;
        const detailRes = await getTask(selectedId);
        if (detailRes.ok && this.selectedTaskId === selectedId) {
          runInAction(() => {
            this.selectedTaskDetail = detailRes.data;
          });
        }
      }
    } else {
      runInAction(() => {
        for (const { task, values } of previous) {
          for (const [key, value] of Object.entries(values)) {
            const row = task as unknown as Record<string, unknown>;
            // A failed older save must not overwrite a newer local edit.
            if (row[key] === (optimistic as Record<string, unknown>)[key]) row[key] = value;
          }
        }
        this.tasks = [...this.tasks];
      });
      toast.error(res.error.message);
    }
  }

  async deleteTask(taskId: string) {
    const res = await deleteTask(taskId);
    if (res.ok) {
      toast.success('Task deleted');
      if (this.selectedTaskId === taskId) {
        this.selectTask(null);
      } else if (this.selectedTaskId) {
        const detailRes = await getTask(this.selectedTaskId);
        if (detailRes.ok) {
          runInAction(() => {
            this.selectedTaskDetail = detailRes.data;
          });
        }
      }
      await Promise.all([this.loadTasks(), this.loadLists()]);
    } else {
      toast.error(res.error.message);
    }
  }

  async moveTaskOrder(index: number, direction: 'up' | 'down') {
    const list = [...this.tasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    runInAction(() => {
      this.tasks = list;
    });

    const orderedIds = list.map((t) => t.id);
    await reorderTasks(orderedIds);
  }

  // ==========================================
  // SUBTASKS
  // ==========================================

  async addSubtask(parentTaskId: string, title?: string) {
    const text = (title || this.newSubtaskTitle).trim();
    if (!text) return;

    const res = await createTask({
      title: text,
      parentId: parentTaskId,
      priority: 4,
    });

    if (res.ok) {
      runInAction(() => {
        this.newSubtaskTitle = '';
      });
      toast.success('Subtask added');
      if (this.selectedTaskId === parentTaskId) {
        await this.selectTask(parentTaskId, { isDrillDown: false });
      }
      await this.loadTasks();
    } else {
      toast.error(res.error.message);
    }
  }

  // ==========================================
  // LIVE TIMER TICKER & ACTIONS
  // ==========================================

  private startTimerTicker() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const day = localCalendarDate();
      if (day !== this.calendarDay) {
        this.calendarDay = day;
        if (this.currentView === 'matrix') void this.loadTasks();
      }
      if (this.activeTimer && !this.activeTimer.isPaused) {
        const now = new Date();
        const start = new Date(this.activeTimer.startTime);
        const elapsedSinceStart = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
        runInAction(() => {
          this.timerElapsedSeconds = this.activeTimer!.accumulatedSeconds + elapsedSinceStart;
        });
      }
    }, 1000);
  }

  async loadActiveTimer() {
    const res = await getActiveTimer();
    runInAction(() => {
      if (res.ok && res.data.active && res.data.timer) {
        this.activeTimer = res.data.timer;
        this.timerElapsedSeconds = res.data.timer.currentElapsedSeconds;
      } else {
        this.activeTimer = null;
        this.timerElapsedSeconds = 0;
      }
    });
  }

  async startTimerForTask(taskId: string) {
    const res = await startTimer(taskId);
    if (res.ok) {
      runInAction(() => {
        this.activeTimer = res.data;
        this.timerElapsedSeconds = 0;
      });
      toast.success('Timer started');
      if (this.selectedTaskId === taskId) {
        await this.selectTask(taskId);
      }
    } else {
      toast.error(res.error.message);
    }
  }

  async pauseActiveTimer() {
    const res = await pauseTimer();
    if (res.ok) {
      runInAction(() => {
        this.activeTimer = res.data;
        this.timerElapsedSeconds = res.data.accumulatedSeconds;
      });
      toast.show('Timer paused');
    } else {
      toast.error(res.error.message);
    }
  }

  async resumeActiveTimer() {
    const res = await resumeTimer();
    if (res.ok) {
      runInAction(() => {
        this.activeTimer = res.data;
      });
      toast.show('Timer resumed');
    } else {
      toast.error(res.error.message);
    }
  }

  promptStopTimer() {
    const elapsedMins = Math.max(1, Math.round(this.timerElapsedSeconds / 60));
    runInAction(() => {
      this.stopTimerOriginalMinutes = elapsedMins;
      this.stopTimerDurationMinutes = elapsedMins;
      this.stopTimerNotes = '';
      this.isStopTimerDialogOpen = true;
    });
  }

  setStopTimerDurationMinutes(mins: number) {
    this.stopTimerDurationMinutes = Math.max(1, mins);
  }

  adjustStopTimerMinutes(deltaMinutes: number) {
    this.stopTimerDurationMinutes = Math.max(1, this.stopTimerDurationMinutes + deltaMinutes);
  }

  adjustSessionDuration(deltaMinutes: number) {
    this.sessionDurationMinutes = Math.max(1, this.sessionDurationMinutes + deltaMinutes);
  }

  async completeStopTimer() {
    const durationSeconds = this.stopTimerDurationMinutes * 60;
    const res = await stopTimer(this.stopTimerNotes.trim() || undefined, durationSeconds);
    if (res.ok) {
      runInAction(() => {
        this.activeTimer = null;
        this.timerElapsedSeconds = 0;
        this.isStopTimerDialogOpen = false;
        this.stopTimerNotes = '';
      });
      toast.success(`Time saved (${res.data.session.durationFormatted})`);
      await Promise.all([this.loadTasks(), this.loadLists()]);
      if (this.selectedTaskId) {
        await this.selectTask(this.selectedTaskId);
      }
    } else {
      toast.error(res.error.message);
    }
  }

  async discardActiveTimer() {
    const res = await discardTimer();
    if (res.ok) {
      runInAction(() => {
        this.activeTimer = null;
        this.timerElapsedSeconds = 0;
        this.isStopTimerDialogOpen = false;
      });
      toast.show('Timer discarded');
    } else {
      toast.error(res.error.message);
    }
  }

  // ==========================================
  // MANUAL SESSIONS
  // ==========================================

  openAddSessionDialog() {
    runInAction(() => {
      this.editingSessionId = null;
      this.sessionDurationMinutes = 25;
      this.sessionNotesInput = '';
      this.sessionDateInput = new Date().toISOString().slice(0, 10);
      this.isSessionDialogOpen = true;
    });
  }

  openEditSessionDialog(session: TimeSession) {
    runInAction(() => {
      this.editingSessionId = session.id;
      this.sessionDurationMinutes = Math.max(1, Math.round(session.durationSeconds / 60));
      this.sessionNotesInput = session.notes || '';
      this.sessionDateInput = session.startTime.slice(0, 10);
      this.isSessionDialogOpen = true;
    });
  }

  async saveSession() {
    if (!this.selectedTaskId) return;

    const durationSeconds = this.sessionDurationMinutes * 60;
    const startTime = new Date(this.sessionDateInput).toISOString();

    if (this.editingSessionId) {
      const res = await updateSession(this.editingSessionId, {
        startTime,
        durationSeconds,
        notes: this.sessionNotesInput.trim() || undefined,
      });
      if (res.ok) {
        toast.success('Time entry updated');
        this.setIsSessionDialogOpen(false);
        await Promise.all([this.selectTask(this.selectedTaskId), this.loadTasks(), this.loadLists()]);
      } else {
        toast.error(res.error.message);
      }
    } else {
      const res = await addSession(this.selectedTaskId, {
        startTime,
        durationSeconds,
        notes: this.sessionNotesInput.trim() || undefined,
      });
      if (res.ok) {
        toast.success('Time entry added');
        this.setIsSessionDialogOpen(false);
        await Promise.all([this.selectTask(this.selectedTaskId), this.loadTasks(), this.loadLists()]);
      } else {
        toast.error(res.error.message);
      }
    }
  }

  async deleteSession(sessionId: string) {
    if (!this.selectedTaskId) return;
    const res = await deleteSession(sessionId);
    if (res.ok) {
      toast.success('Time entry deleted');
      await Promise.all([this.selectTask(this.selectedTaskId), this.loadTasks(), this.loadLists()]);
    } else {
      toast.error(res.error.message);
    }
  }

  async deleteAllSessionsForTask(taskId: string) {
    const res = await deleteAllTaskSessions(taskId);
    if (res.ok) {
      toast.success('All time entries deleted');
      await Promise.all([this.selectTask(taskId), this.loadTasks(), this.loadLists()]);
    } else {
      toast.error(res.error.message);
    }
  }

  // ==========================================
  // CONFIRMATION MODAL (No native alerts)
  // ==========================================

  requestConfirmation(options: {
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
  }) {
    runInAction(() => {
      this.confirmationModal = {
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        confirmVariant: options.confirmVariant || 'danger',
        onConfirm: options.onConfirm,
      };
    });
  }

  closeConfirmation() {
    runInAction(() => {
      this.confirmationModal = null;
    });
  }

  // ==========================================
  // ANALYTICS
  // ==========================================

  async setAnalyticsPreset(preset: string) {
    runInAction(() => {
      this.analyticsPreset = preset;
      if (preset !== 'custom') {
        this.analyticsStartDate = '';
        this.analyticsEndDate = '';
      }
    });
    await this.loadAnalytics();
  }

  async setAnalyticsCustomRange(startDate: string, endDate: string) {
    runInAction(() => {
      this.analyticsPreset = 'custom';
      this.analyticsStartDate = startDate;
      this.analyticsEndDate = endDate;
    });
    await this.loadAnalytics();
  }

  async setAnalyticsListFilter(listId: string) {
    runInAction(() => {
      this.analyticsListId = listId;
    });
    await this.loadAnalytics();
  }

  async setAnalyticsTaskFilter(taskId: string) {
    runInAction(() => {
      this.analyticsTaskId = taskId;
    });
    await this.loadAnalytics();
  }

  async loadAnalytics() {
    runInAction(() => {
      this.isLoadingAnalytics = true;
    });

    const res = await getTimeAnalytics({
      preset: this.analyticsPreset,
      startDate: this.analyticsStartDate || undefined,
      endDate: this.analyticsEndDate || undefined,
      listId: this.analyticsListId !== 'all' ? this.analyticsListId : undefined,
      taskId: this.analyticsTaskId !== 'all' ? this.analyticsTaskId : undefined,
    });

    runInAction(() => {
      this.isLoadingAnalytics = false;
      if (res.ok) {
        this.analyticsData = res.data;
      } else {
        toast.error(res.error.message);
      }
    });
  }
}
