import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { toast } from '@modules/core/ui/primitives/toast';
import type { Task } from '@domain/tasks/models/task';
import type { TaskList } from '@domain/tasks/models/task-list';
import type { TimeSession } from '@domain/tasks/models/time-session';
import type { ActiveTimer } from '@domain/tasks/models/active-timer';
import type { TimeAnalytics } from '@domain/tasks/models/time-analytics';
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

  // Data
  lists: TaskList[] = [];
  inboxCounts = { taskCount: 0, uncompletedCount: 0, totalTimeSeconds: 0 };
  tasks: Task[] = [];
  isLoadingTasks: boolean = false;
  isLoadingLists: boolean = false;

  // Selected Task Detail
  selectedTaskId: string | null = null;
  selectedTaskDetail: (Task & { subtasks: Task[]; timeSessions: TimeSession[]; isActiveTimerRunning: boolean }) | null = null;
  isLoadingDetail: boolean = false;

  // Quick Task Add Inputs
  quickTaskTitle: string = '';
  quickTaskPriority: number = 4;
  quickTaskDueDate: string = '';

  // Subtask Add Input
  newSubtaskTitle: string = '';

  // Expanded tasks in main list view
  expandedTaskIds = new Set<string>();
  taskSubtasksMap = new Map<string, Task[]>();

  // Active Timer
  activeTimer: ActiveTimer | null = null;
  timerElapsedSeconds: number = 0;
  private timerInterval: any = null;
  isStopTimerDialogOpen: boolean = false;
  stopTimerNotes: string = '';

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
      lists: observable,
      inboxCounts: observable,
      tasks: observable,
      isLoadingTasks: observable,
      isLoadingLists: observable,
      selectedTaskId: observable,
      selectedTaskDetail: observable,
      isLoadingDetail: observable,
      quickTaskTitle: observable,
      quickTaskPriority: observable,
      quickTaskDueDate: observable,
      newSubtaskTitle: observable,
      expandedTaskIds: observable,
      taskSubtasksMap: observable,
      activeTimer: observable,
      timerElapsedSeconds: observable,
      isStopTimerDialogOpen: observable,
      stopTimerNotes: observable,
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

      // Actions
      setCurrentView: action,
      setSearchQuery: action,
      setQuickTaskTitle: action,
      setQuickTaskPriority: action,
      setQuickTaskDueDate: action,
      setNewSubtaskTitle: action,
      toggleTaskExpanded: action,
      addInlineSubtask: action,
      setStopTimerNotes: action,
      setIsStopTimerDialogOpen: action,
      setIsListDialogOpen: action,
      setIsSessionDialogOpen: action,
      setSessionDurationMinutes: action,
      setSessionNotesInput: action,
      setSessionDateInput: action,
      requestConfirmation: action,
      closeConfirmation: action,
      setAnalyticsPreset: action,
      setAnalyticsCustomRange: action,
      setAnalyticsListFilter: action,
      setAnalyticsTaskFilter: action,
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
    if (this.currentView === 'next7') return 'Next 7 Days';
    if (this.currentView === 'matrix') return 'Eisenhower Matrix';
    if (this.currentView === 'analytics') return 'Time Analytics';
    if (this.currentView === 'completed') return 'Completed Tasks';
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
    // Urgent & Important (P1)
    return this.tasks.filter((t) => t.priority === 1 && !t.isDone);
  }

  get matrixQ2Tasks(): Task[] {
    // High / Schedule (P2)
    return this.tasks.filter((t) => t.priority === 2 && !t.isDone);
  }

  get matrixQ3Tasks(): Task[] {
    // Medium / Delegate (P3)
    return this.tasks.filter((t) => t.priority === 3 && !t.isDone);
  }

  get matrixQ4Tasks(): Task[] {
    // Low / Backlog (P4)
    return this.tasks.filter((t) => t.priority === 4 && !t.isDone);
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
      toast.error('List name cannot be empty');
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
    runInAction(() => {
      this.isLoadingTasks = true;
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
      params.status = 'active';
      params.includeSubtasks = false;
    } else if (this.currentView === 'completed') {
      params.status = 'done';
    } else if (this.currentView.startsWith('list:')) {
      params.listId = this.currentView.replace('list:', '');
      params.status = 'active';
    }

    const res = await getTasks(params as any);
    runInAction(() => {
      this.isLoadingTasks = false;
      if (res.ok) {
        this.tasks = res.data;
      } else {
        toast.error(res.error.message);
      }
    });
  }

  async selectTask(taskId: string | null) {
    if (!taskId) {
      runInAction(() => {
        this.selectedTaskId = null;
        this.selectedTaskDetail = null;
      });
      return;
    }

    runInAction(() => {
      this.selectedTaskId = taskId;
      this.isLoadingDetail = true;
      this.expandedTaskIds.add(taskId);
    });

    const res = await getTask(taskId);
    runInAction(() => {
      this.isLoadingDetail = false;
      if (res.ok) {
        this.selectedTaskDetail = res.data;
        if (res.data.parentId) {
          this.expandedTaskIds.add(res.data.parentId);
        }
      } else {
        toast.error(res.error.message);
      }
    });
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
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const res = await updateTask(task.id, { status: newStatus });
    if (res.ok) {
      await Promise.all([this.loadTasks(), this.loadLists()]);
      if (this.selectedTaskId === task.id) {
        await this.selectTask(task.id);
      }
    } else {
      toast.error(res.error.message);
    }
  }

  async updateTaskProperties(taskId: string, updates: Parameters<typeof updateTask>[1]) {
    const res = await updateTask(taskId, updates);
    if (res.ok) {
      await Promise.all([this.loadTasks(), this.loadLists()]);
      if (this.selectedTaskId === taskId) {
        await this.selectTask(taskId);
      }
    } else {
      toast.error(res.error.message);
    }
  }

  async deleteTask(taskId: string) {
    const res = await deleteTask(taskId);
    if (res.ok) {
      toast.success('Task deleted');
      if (this.selectedTaskId === taskId) {
        this.selectTask(null);
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

  async toggleTaskExpanded(taskId: string) {
    const next = new Set(this.expandedTaskIds);
    if (next.has(taskId)) {
      next.delete(taskId);
      runInAction(() => {
        this.expandedTaskIds = next;
      });
    } else {
      next.add(taskId);
      runInAction(() => {
        this.expandedTaskIds = next;
      });
      // Fetch subtasks for this task
      const res = await getTask(taskId);
      if (res.ok) {
        runInAction(() => {
          const map = new Map(this.taskSubtasksMap);
          map.set(taskId, res.data.subtasks);
          this.taskSubtasksMap = map;
        });
      }
    }
  }

  async addInlineSubtask(parentTaskId: string, title: string) {
    if (!title.trim()) return;

    const res = await createTask({
      title: title.trim(),
      parentId: parentTaskId,
      priority: 4,
    });

    if (res.ok) {
      toast.success('Subtask added');
      // Refresh subtasks for this parent
      const detailRes = await getTask(parentTaskId);
      if (detailRes.ok) {
        runInAction(() => {
          const map = new Map(this.taskSubtasksMap);
          map.set(parentTaskId, detailRes.data.subtasks);
          this.taskSubtasksMap = map;
        });
      }
      if (this.selectedTaskId === parentTaskId) {
        await this.selectTask(parentTaskId);
      }
      await this.loadTasks();
    } else {
      toast.error(res.error.message);
    }
  }

  async addSubtask(parentTaskId: string) {
    if (!this.newSubtaskTitle.trim()) return;

    const res = await createTask({
      title: this.newSubtaskTitle.trim(),
      parentId: parentTaskId,
      priority: 4,
    });

    if (res.ok) {
      runInAction(() => {
        this.newSubtaskTitle = '';
      });
      toast.success('Subtask added');
      await this.selectTask(parentTaskId);
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
    this.setIsStopTimerDialogOpen(true);
  }

  async completeStopTimer() {
    const res = await stopTimer(this.stopTimerNotes.trim() || undefined);
    if (res.ok) {
      runInAction(() => {
        this.activeTimer = null;
        this.timerElapsedSeconds = 0;
        this.isStopTimerDialogOpen = false;
        this.stopTimerNotes = '';
      });
      toast.success(`Recorded session (${res.data.session.durationFormatted})`);
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
        toast.success('Session updated');
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
        toast.success('Session added');
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
      toast.success('Session deleted');
      await Promise.all([this.selectTask(this.selectedTaskId), this.loadTasks(), this.loadLists()]);
    } else {
      toast.error(res.error.message);
    }
  }

  async deleteAllSessionsForTask(taskId: string) {
    const res = await deleteAllTaskSessions(taskId);
    if (res.ok) {
      toast.success('All sessions deleted');
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
