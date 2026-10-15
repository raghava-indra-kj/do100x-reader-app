import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { addDays, instantAt, validDate, wallAt } from '@reader/calendar-core';
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
interface MatrixQuickDraft { title: string; revision: number; saving: boolean; error: string }
const emptyMatrixQuickDrafts = (): Record<number, MatrixQuickDraft> => Object.fromEntries([1, 2, 3, 4].map(priority => [priority, { title: '', revision: 0, saving: false, error: '' }]));

export class TasksStore {
  // Navigation & View
  currentView: TaskViewMode = 'inbox';
  searchQuery: string = '';
  taskSort: 'manual' | 'priority' | 'due' | 'title' = 'manual';
  isReorderingTasks = false;
  matrixSettings: MatrixSettings = readMatrixSettings();
  matrixQuickListId: string = 'inbox';
  matrixQuickDrafts = emptyMatrixQuickDrafts();
  private matrixDraftLifetime = 0;
  tasksError: string | null = null;
  private taskRequestId = 0;
  private detailRequestId = 0;
  private listRequestId = 0;
  private timerRequestId = 0;
  private analyticsRequestId = 0;
  private disposed = false;
  private taskSaves = new Map<string, Promise<boolean>>();
  savingTaskIds = new Set<string>();
  isCreatingTask = false;
  isSavingList = false;
  creatingSubtasks = new Set<string>();
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
  detailError: string | null = null;
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
  isTimerBusy = false;
  private stopTimerTargetId: string | null = null;
  isStopTimerDialogOpen: boolean = false;
  stopTimerNotes: string = '';
  stopTimerDurationMinutes: number = 1;
  stopTimerOriginalMinutes: number = 1;
  stopTimerOriginalSeconds = 0;
  stopTimerTaskTitle = '';
  stopTimerDurationAdjusted = false;

  // Analytics
  analyticsData: TimeAnalytics | null = null;
  analyticsError: string | null = null;
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
    onConfirm: () => void | boolean | Promise<void | boolean>;
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
  sessionDateInput: string = localCalendarDate();
  sessionTimeInput = '09:00';
  sessionDurationAdjusted = false;
  isSavingSession = false;
  private originalSession: TimeSession | null = null;
  private sessionTaskId: string | null = null;
  private sessionRequestKey = '';

  constructor() {
    makeObservable(this, {
      currentView: observable,
      searchQuery: observable,
      taskSort: observable,
      isReorderingTasks: observable,
      matrixSettings: observable,
      matrixQuickListId: observable,
      matrixQuickDrafts: observable.ref,
      tasksError: observable,
      lists: observable,
      inboxCounts: observable,
      tasks: observable,
      isLoadingTasks: observable,
      isSavingSession: observable,
      isCreatingTask: observable,
      isSavingList: observable,
      creatingSubtasks: observable,
      savingTaskIds: observable,
      isLoadingLists: observable,
      selectedTaskId: observable,
      selectedTaskDetail: observable,
      isLoadingDetail: observable,
      detailError: observable,
      taskBreadcrumbs: observable,
      quickTaskTitle: observable,
      quickTaskPriority: observable,
      quickTaskDueDate: observable,
      newSubtaskTitle: observable,
      activeTimer: observable,
      isTimerBusy: observable,
      timerElapsedSeconds: observable,
      isStopTimerDialogOpen: observable,
      stopTimerNotes: observable,
      stopTimerDurationMinutes: observable,
      stopTimerOriginalMinutes: observable,
      stopTimerOriginalSeconds: observable,
      stopTimerTaskTitle: observable,
      stopTimerDurationAdjusted: observable,
      analyticsData: observable,
      analyticsError: observable,
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
      sessionTimeInput: observable,
      sessionDurationAdjusted: observable,

      // Computed
      filteredTasks: computed,
      canReorderTasks: computed,
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
      setTaskSort: action,
      setMatrixSettings: action,
      setMatrixQuickList: action,
      setMatrixQuickTitle: action,
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

  }

  async init() {
    this.disposed = false;
    await Promise.all([this.loadLists(), this.loadActiveTimer(), this.loadTasks()]);
    if (!this.disposed) this.startTimerTicker();
  }

  destroy() {
    this.disposed = true;
    this.matrixDraftLifetime++;
    runInAction(() => { this.matrixQuickDrafts = Object.fromEntries(Object.entries(this.matrixQuickDrafts).map(([priority, draft]) => [priority, { ...draft, saving: false }])); });
    this.taskRequestId++; this.detailRequestId++; this.listRequestId++; this.timerRequestId++; this.analyticsRequestId++;
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
    return [...list].sort((a, b) => {
      if (this.taskSort === 'priority') return a.priority - b.priority || a.sortOrder - b.sortOrder;
      if (this.taskSort === 'due') return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || (a.dueTime ?? '').localeCompare(b.dueTime ?? '') || a.sortOrder - b.sortOrder;
      if (this.taskSort === 'title') return a.title.localeCompare(b.title) || a.sortOrder - b.sortOrder;
      return a.sortOrder - b.sortOrder;
    });
  }

  get canReorderTasks(): boolean {
    return this.taskSort === 'manual' && !this.searchQuery.trim() && !this.isLoadingTasks && !this.tasksError && (this.currentView === 'inbox' || this.currentView.startsWith('list:'));
  }

  setTaskSort(value: string) { if (['manual', 'priority', 'due', 'title'].includes(value)) this.taskSort = value as typeof this.taskSort; }

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

  setMatrixQuickTitle(priority: number, title: string) {
    const draft = this.matrixQuickDrafts[priority];
    if (!draft || this.disposed) return;
    this.matrixQuickDrafts = { ...this.matrixQuickDrafts, [priority]: { ...draft, title, revision: draft.revision + 1, error: '' } };
  }

  async createMatrixTask(priority: number): Promise<boolean> {
    const draft = this.matrixQuickDrafts[priority];
    if (this.disposed || !draft?.title.trim() || draft.saving) return false;
    const lifetime = this.matrixDraftLifetime;
    // Capture the complete destination before filters, list or title can change.
    const payload = { title: draft.title.trim(), priority, listId: this.matrixQuickListId === 'inbox' ? null : this.matrixQuickListId, dueDate: matrixCreationDate(this.matrixSettings.date) };
    this.matrixQuickDrafts = { ...this.matrixQuickDrafts, [priority]: { ...draft, saving: true, error: '' } };
    let res: Awaited<ReturnType<typeof createTask>>;
    try { res = await createTask(payload); }
    catch (error) {
      if (this.disposed || lifetime !== this.matrixDraftLifetime) return false;
      const message = error instanceof Error && error.message ? error.message : 'Couldn’t add this task. Your draft is still here.';
      runInAction(() => {
        const current = this.matrixQuickDrafts[priority];
        this.matrixQuickDrafts = { ...this.matrixQuickDrafts, [priority]: { ...current, saving: false, error: current.revision === draft.revision ? message : '' } };
      });
      toast.error(message); return false;
    }
    if (this.disposed || lifetime !== this.matrixDraftLifetime) return false;
    runInAction(() => {
      const current = this.matrixQuickDrafts[priority];
      const matches = current.revision === draft.revision;
      this.matrixQuickDrafts = { ...this.matrixQuickDrafts, [priority]: {
        ...current, saving: false,
        ...(res.ok && matches ? { title: '', revision: current.revision + 1 } : {}),
        error: !res.ok && matches ? res.error.message || 'Couldn’t add this task. Your draft is still here.' : '',
      } };
    });
    if (!res.ok) { toast.error(res.error.message || 'Couldn’t add this task. Your draft is still here.'); return false; }
    toast.success('Task added');
    // A refresh failure cannot turn an acknowledged create into a failed create.
    await Promise.allSettled([this.refreshCurrentView(), this.loadLists()]);
    return true;
  }

  // ==========================================
  // ACTIONS & DATA FETCHING
  // ==========================================

  setCurrentView(view: TaskViewMode) {
    void this.selectTask(null);
    ++this.taskRequestId;
    runInAction(() => {
      this.currentView = view;
    });
    void this.refreshCurrentView();
  }

  async refreshCurrentView() {
    if (this.disposed) return;
    if (this.currentView === 'analytics') await this.loadAnalytics();
    else await this.loadTasks();
  }

  async refreshWorkspace() {
    if (this.disposed) return;
    await Promise.all([
      this.refreshCurrentView(), this.loadLists(), this.loadActiveTimer(),
      this.selectedTaskId ? this.selectTask(this.selectedTaskId) : Promise.resolve(),
    ]);
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
      this.sessionDurationMinutes = Math.min(527040, Math.max(1, Math.round(Number.isFinite(val) ? val : 1)));
      this.sessionDurationAdjusted = true;
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

  setSessionTimeInput(val: string) { runInAction(() => { this.sessionTimeInput = val; }); }

  // ==========================================
  // LISTS
  // ==========================================

  async loadLists() {
    const requestId = ++this.listRequestId;
    runInAction(() => {
      this.isLoadingLists = true;
    });
    const res = await getTaskLists();
    runInAction(() => {
      if (this.disposed || requestId !== this.listRequestId) return;
      this.isLoadingLists = false;
      if (res.ok) {
        this.lists = res.data.lists;
        this.inboxCounts = res.data.inbox;
        const available = new Set(this.lists.map(list => list.id));
        if (this.matrixQuickListId !== 'inbox' && !available.has(this.matrixQuickListId)) this.matrixQuickListId = 'inbox';
        if (!['all', 'inbox'].includes(this.analyticsListId) && !available.has(this.analyticsListId)) {
          this.analyticsListId = 'all';
          if (this.currentView === 'analytics') void this.loadAnalytics();
        }
        if (this.currentView.startsWith('list:') && !available.has(this.currentView.slice(5))) this.setCurrentView('inbox');
      } else toast.error(res.error.message);
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
    if (this.isSavingList) return;
    if (!this.listNameInput.trim()) {
      toast.error('Enter a list name.');
      return;
    }

    runInAction(() => { this.isSavingList = true; });
    try {
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
        if (!this.disposed) this.setCurrentView(`list:${res.data.id}`);
      } else {
        toast.error(res.error.message);
      }
    }
    } finally { runInAction(() => { this.isSavingList = false; }); }
  }

  async deleteList(id: string) {
    const res = await deleteTaskList(id, false);
    if (res.ok) {
      toast.success('List deleted');
      if (this.currentView === `list:${id}`) {
        this.setCurrentView('inbox');
      }
      await this.loadLists();
      await this.refreshCurrentView();
      return true;
    } else {
      toast.error(res.error.message);
      return false;
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

    const params: Record<string, unknown> = { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };

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
      if (this.disposed || requestId !== this.taskRequestId) return;
      this.isLoadingTasks = false;
      if (res.ok) {
        this.tasks = res.data;
      } else {
        this.tasksError = res.error.message;
        this.tasks = [];
        toast.error(res.error.message);
      }
    });
  }

  async selectTask(taskId: string | null, options?: { isDrillDown?: boolean; showInList?: boolean }) {
    const requestId = ++this.detailRequestId;
    runInAction(() => { this.detailError = null; });
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
      if (this.selectedTaskId !== taskId) this.selectedTaskDetail = null;
      this.selectedTaskId = taskId;
      // Background refreshes must not unmount the editor or discard a draft.
      this.isLoadingDetail = !this.selectedTaskDetail;
    });

    const res = await getTask(taskId);
    runInAction(() => {
      if (this.disposed || requestId !== this.detailRequestId || this.selectedTaskId !== taskId) return;
      this.isLoadingDetail = false;
      if (res.ok) {
        this.selectedTaskDetail = res.data;
        if (options?.showInList) {
          ++this.taskRequestId;
          this.searchQuery = '';
          this.currentView = res.data.status === 'done' ? 'completed' : res.data.listId ? `list:${res.data.listId}` : 'inbox';
          void this.loadTasks();
        }

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
        this.detailError = res.error.message;
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
    if (!this.quickTaskTitle.trim() || this.isCreatingTask) return;
    const draft = { title: this.quickTaskTitle, priority: this.quickTaskPriority, date: this.quickTaskDueDate, view: this.currentView };
    runInAction(() => { this.isCreatingTask = true; });

    let targetListId: string | null = null;
    if (this.currentView.startsWith('list:')) {
      targetListId = this.currentView.replace('list:', '');
    }

    let dueDate: string | null = this.quickTaskDueDate || null;
    if (this.currentView === 'today' && !dueDate) {
      dueDate = localCalendarDate();
    }

    const res = await createTask({
      title: this.quickTaskTitle.trim(),
      listId: targetListId,
      priority: this.quickTaskPriority,
      dueDate,
    });
    runInAction(() => { this.isCreatingTask = false; });
    if (this.disposed) return;

    if (res.ok) {
      runInAction(() => {
        if (this.quickTaskTitle === draft.title) this.quickTaskTitle = '';
        if (this.quickTaskPriority === draft.priority) this.quickTaskPriority = 4;
        if (this.quickTaskDueDate === draft.date) this.quickTaskDueDate = '';
      });
      toast.success('Task created');
      await Promise.all([this.refreshCurrentView(), this.loadLists()]);
      if (this.currentView === draft.view) void this.selectTask(res.data.id);
    } else {
      toast.error(res.error.message);
    }
  }

  async toggleTaskStatus(task: Task) {
    await this.updateTaskProperties(task.id, { status: task.isDone ? 'todo' : 'done' });
  }

  async updateTaskProperties(taskId: string, updates: Parameters<typeof updateTask>[1]) {
    const previous = this.taskSaves.get(taskId);
    const pending = previous ? previous.catch(() => {}).then(() => this.persistTaskProperties(taskId, updates)) : this.persistTaskProperties(taskId, updates);
    this.taskSaves.set(taskId, pending);
    this.savingTaskIds.add(taskId);
    try { return await pending; } finally {
      if (this.taskSaves.get(taskId) === pending) {
        this.taskSaves.delete(taskId);
        runInAction(() => { this.savingTaskIds.delete(taskId); });
      }
    }
  }

  private async persistTaskProperties(taskId: string, updates: Parameters<typeof updateTask>[1]) {
    if (this.disposed) return false;
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
    const version = [...targets][0]?.version;
    const res = await updateTask(taskId, version === undefined ? updates : { ...updates, expectedVersion: version });
    if (this.disposed) return false;
    if (res.ok) {
      // Keep the acknowledged revision even when the following refresh is offline.
      runInAction(() => { for (const target of targets) Object.assign(target, res.data); this.tasks = [...this.tasks]; });
      await Promise.all([this.refreshCurrentView(), this.loadLists()]);
      if (this.selectedTaskId) {
        await this.selectTask(this.selectedTaskId);
      }
      return true;
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
      return false;
    }
  }

  async deleteTask(taskId: string) {
    const res = await deleteTask(taskId);
    if (res.ok) {
      toast.success('Task deleted');
      if (this.selectedTaskId === taskId || this.taskBreadcrumbs.some(item => item.id === taskId)) {
        this.selectTask(null);
      } else if (this.selectedTaskId) {
        await this.selectTask(this.selectedTaskId);
      }
      await Promise.all([this.refreshCurrentView(), this.loadLists(), this.loadActiveTimer()]);
      return true;
    } else {
      toast.error(res.error.message);
      return false;
    }
  }

  async moveTaskOrder(index: number, direction: 'up' | 'down') {
    if (!this.canReorderTasks || this.isReorderingTasks) return;
    const previous = this.tasks, list = this.filteredTasks, view = this.currentView;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || index >= list.length || targetIndex < 0 || targetIndex >= list.length) return;
    const oldOrders = new Map(list.map(task => [task.id, task.sortOrder]));
    const expectedVersions = Object.fromEntries(list.filter(task => task.version !== undefined).map(task => [task.id, task.version!]));
    [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
    const requestId = ++this.taskRequestId;
    runInAction(() => { this.isReorderingTasks = true; list.forEach((task, order) => { task.sortOrder = order; }); this.tasks = list; });
    try {
      const result = await reorderTasks(list.map(task => task.id), Object.keys(expectedVersions).length === list.length ? expectedVersions : undefined);
      if (this.disposed) return;
      if (!result.ok) {
        runInAction(() => { if (this.currentView === view && this.taskRequestId === requestId) { previous.forEach(task => { task.sortOrder = oldOrders.get(task.id)!; }); this.tasks = previous; } });
        toast.error(result.error.message);
      } else if (this.currentView === view) await this.loadTasks();
    } finally { runInAction(() => { this.isReorderingTasks = false; }); }
  }

  // ==========================================
  // SUBTASKS
  // ==========================================

  async addSubtask(parentTaskId: string, title?: string) {
    const text = (title || this.newSubtaskTitle).trim();
    if (!text || this.creatingSubtasks.has(parentTaskId)) return false;
    runInAction(() => { this.creatingSubtasks.add(parentTaskId); });
    try {

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
      return true;
    } else {
      toast.error(res.error.message);
      return false;
    }
    } finally { runInAction(() => { this.creatingSubtasks.delete(parentTaskId); }); }
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
        if (['matrix', 'today', 'next7', 'analytics'].includes(this.currentView)) void this.refreshCurrentView();
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
    if (this.isTimerBusy) return;
    const requestId = ++this.timerRequestId;
    const res = await getActiveTimer();
    runInAction(() => {
      if (this.disposed || requestId !== this.timerRequestId || !res.ok) return;
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
    if (this.isTimerBusy || this.disposed) return;
    this.isTimerBusy = true; ++this.timerRequestId;
    try {
    const res = await startTimer(taskId, undefined, this.activeTimer?.id ?? null);
    if (res.ok) {
      runInAction(() => {
        this.activeTimer = res.data;
        this.timerElapsedSeconds = res.data.currentElapsedSeconds;
      });
      toast.success('Timer started');
      if (this.selectedTaskId === taskId) {
        await this.selectTask(taskId);
      }
    } else {
      toast.error(res.error.message);
    }
    } finally {
      runInAction(() => { this.isTimerBusy = false; });
      if (!this.disposed) await this.loadActiveTimer();
    }
  }

  async pauseActiveTimer() {
    if (this.isTimerBusy || this.disposed) return;
    this.isTimerBusy = true; ++this.timerRequestId;
    try {
    const res = await pauseTimer(this.activeTimer?.id ?? null);
    if (res.ok) {
      runInAction(() => {
        this.activeTimer = res.data;
        this.timerElapsedSeconds = res.data.accumulatedSeconds;
      });
      toast.show('Timer paused');
    } else {
      toast.error(res.error.message);
    }
    } finally {
      runInAction(() => { this.isTimerBusy = false; });
      if (!this.disposed) await this.loadActiveTimer();
    }
  }

  async resumeActiveTimer() {
    if (this.isTimerBusy || this.disposed) return;
    this.isTimerBusy = true; ++this.timerRequestId;
    try {
    const res = await resumeTimer(this.activeTimer?.id ?? null);
    if (res.ok) {
      runInAction(() => {
        this.activeTimer = res.data;
      });
      toast.show('Timer resumed');
    } else {
      toast.error(res.error.message);
    }
    } finally {
      runInAction(() => { this.isTimerBusy = false; });
      if (!this.disposed) await this.loadActiveTimer();
    }
  }

  promptStopTimer() {
    if (!this.activeTimer || this.isTimerBusy) return;
    this.stopTimerTargetId = this.activeTimer.id;
    const elapsedMins = Math.max(1, Math.round(this.timerElapsedSeconds / 60));
    runInAction(() => {
      this.stopTimerOriginalSeconds = Math.max(1, this.timerElapsedSeconds);
      this.stopTimerTaskTitle = this.activeTimer!.taskTitle ?? 'Task timer';
      this.stopTimerDurationAdjusted = false;
      this.stopTimerOriginalMinutes = elapsedMins;
      this.stopTimerDurationMinutes = elapsedMins;
      this.stopTimerNotes = '';
      this.isStopTimerDialogOpen = true;
    });
  }

  setStopTimerDurationMinutes(mins: number) {
    if (Number.isFinite(mins)) runInAction(() => { this.stopTimerDurationMinutes = Math.max(1, Math.min(366 * 1440, Math.round(mins))); this.stopTimerDurationAdjusted = true; });
  }

  resetStopTimerDuration() {
    runInAction(() => { this.stopTimerDurationMinutes = this.stopTimerOriginalMinutes; this.stopTimerDurationAdjusted = false; });
  }

  adjustStopTimerMinutes(deltaMinutes: number) {
    this.setStopTimerDurationMinutes(this.stopTimerDurationMinutes + deltaMinutes);
  }

  adjustSessionDuration(deltaMinutes: number) {
    this.setSessionDurationMinutes(this.sessionDurationMinutes + deltaMinutes);
  }

  async completeStopTimer() {
    if (this.isTimerBusy || this.disposed) return;
    this.isTimerBusy = true; ++this.timerRequestId;
    try {
    const durationSeconds = this.stopTimerDurationAdjusted ? this.stopTimerDurationMinutes * 60 : this.stopTimerOriginalSeconds;
    const res = await stopTimer(this.stopTimerNotes.trim() || undefined, durationSeconds, this.stopTimerTargetId);
    if (res.ok) {
      runInAction(() => {
        this.activeTimer = null;
        this.timerElapsedSeconds = 0;
        this.isStopTimerDialogOpen = false;
        this.stopTimerNotes = '';
      });
      toast.success(`Time saved (${res.data.session.durationFormatted})`);
      await Promise.all([this.refreshCurrentView(), this.loadLists()]);
      if (this.selectedTaskId) {
        await this.selectTask(this.selectedTaskId);
      }
    } else {
      toast.error(res.error.message);
    }
    } finally {
      runInAction(() => { this.isTimerBusy = false; });
      if (!this.disposed) await this.loadActiveTimer();
    }
  }

  async discardActiveTimer() {
    if (this.isTimerBusy || this.disposed) return false;
    this.isTimerBusy = true; ++this.timerRequestId;
    try {
    const res = await discardTimer(this.isStopTimerDialogOpen ? this.stopTimerTargetId : this.activeTimer?.id ?? null);
    if (res.ok) {
      runInAction(() => {
        this.activeTimer = null;
        this.timerElapsedSeconds = 0;
        this.isStopTimerDialogOpen = false;
      });
      toast.show('Timer discarded');
      return true;
    } else {
      toast.error(res.error.message);
      return false;
    }
    } finally {
      runInAction(() => { this.isTimerBusy = false; });
      if (!this.disposed) await this.loadActiveTimer();
    }
  }

  // ==========================================
  // MANUAL SESSIONS
  // ==========================================

  openAddSessionDialog() {
    this.originalSession = null;
    this.sessionTaskId = this.selectedTaskId;
    this.sessionRequestKey = crypto.randomUUID();
    runInAction(() => {
      this.editingSessionId = null;
      this.sessionDurationMinutes = 25;
      this.sessionNotesInput = '';
      const start = wallAt(new Date(Date.now() - 25 * 60_000), Intl.DateTimeFormat().resolvedOptions().timeZone);
      this.sessionDateInput = start.slice(0, 10);
      this.sessionTimeInput = start.slice(11, 16);
      this.sessionDurationAdjusted = false;
      this.isSessionDialogOpen = true;
    });
  }

  openEditSessionDialog(session: TimeSession) {
    this.originalSession = session;
    this.sessionTaskId = session.taskId;
    runInAction(() => {
      this.editingSessionId = session.id;
      this.sessionDurationMinutes = Math.max(1, Math.round(session.durationSeconds / 60));
      this.sessionNotesInput = session.notes || '';
      this.sessionDateInput = wallAt(session.startTime, Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 10);
      this.sessionTimeInput = wallAt(session.startTime, Intl.DateTimeFormat().resolvedOptions().timeZone).slice(11, 16);
      this.sessionDurationAdjusted = false;
      this.isSessionDialogOpen = true;
    });
  }

  async saveSession() {
    if (!this.sessionTaskId || this.isSavingSession) return;
    const taskId = this.sessionTaskId;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const original = this.originalSession;
    const wall = wallAt(original?.startTime ?? new Date(), timezone);
    const start = instantAt(`${this.sessionDateInput}T${this.sessionTimeInput}`, timezone);
    if (!start || !Number.isInteger(this.sessionDurationMinutes) || this.sessionDurationMinutes <= 0 || this.sessionDurationMinutes > 527040) { toast.error('Choose a valid date, time and duration.'); return; }
    this.isSavingSession = true;
    try {

    const durationSeconds = Math.round(this.sessionDurationMinutes * 60);
    const startTime = original && `${this.sessionDateInput}T${this.sessionTimeInput}` === wall.slice(0, 16) ? original.startTime : start.toISOString();

    if (this.editingSessionId) {
      const res = await updateSession(this.editingSessionId, {
        ...(original?.startTime === startTime ? {} : { startTime }),
        ...(original && !this.sessionDurationAdjusted ? {} : { durationSeconds }),
        notes: this.sessionNotesInput.trim(),
        expectedUpdatedAt: original?.updatedAt,
      });
      if (res.ok) {
        toast.success('Time entry updated');
        this.setIsSessionDialogOpen(false);
        await Promise.all([this.selectedTaskId === taskId ? this.selectTask(taskId) : Promise.resolve(), this.refreshCurrentView(), this.loadLists()]);
      } else {
        toast.error(res.error.message);
      }
    } else {
      const res = await addSession(taskId, {
        startTime,
        durationSeconds,
        notes: this.sessionNotesInput.trim() || undefined,
        requestKey: this.sessionRequestKey,
      });
      if (res.ok) {
        toast.success('Time entry added');
        this.setIsSessionDialogOpen(false);
        await Promise.all([this.selectedTaskId === taskId ? this.selectTask(taskId) : Promise.resolve(), this.refreshCurrentView(), this.loadLists()]);
      } else {
        toast.error(res.error.message);
      }
    }
    } finally { runInAction(() => { this.isSavingSession = false; }); }
  }

  async deleteSession(sessionId: string) {
    const taskId = this.selectedTaskId;
    if (!taskId) return false;
    const res = await deleteSession(sessionId, this.selectedTaskDetail?.timeSessions.find(item => item.id === sessionId)?.updatedAt);
    if (res.ok) {
      toast.success('Time entry deleted');
      await Promise.all([this.selectedTaskId === taskId ? this.selectTask(taskId) : Promise.resolve(), this.refreshCurrentView(), this.loadLists()]);
      return true;
    } else {
      toast.error(res.error.message);
      return false;
    }
  }

  async deleteAllSessionsForTask(taskId: string) {
    const res = await deleteAllTaskSessions(taskId);
    if (res.ok) {
      toast.success('All time entries deleted');
      await Promise.all([this.selectedTaskId === taskId ? this.selectTask(taskId) : Promise.resolve(), this.refreshCurrentView(), this.loadLists()]);
      return true;
    } else {
      toast.error(res.error.message);
      return false;
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
    onConfirm: () => void | boolean | Promise<void | boolean>;
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
      } else if (!this.analyticsStartDate || !this.analyticsEndDate) {
        this.analyticsEndDate = localCalendarDate();
        this.analyticsStartDate = addDays(this.analyticsEndDate, -6);
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
    const requestId = ++this.analyticsRequestId;
    if (this.disposed) return;
    if (this.analyticsPreset === 'custom' && (!validDate(this.analyticsStartDate) || !validDate(this.analyticsEndDate) || this.analyticsStartDate > this.analyticsEndDate)) {
      runInAction(() => { this.analyticsError = 'Choose a valid start and end date.'; this.analyticsData = null; this.isLoadingAnalytics = false; });
      return;
    }
    runInAction(() => {
      this.isLoadingAnalytics = true;
      this.analyticsError = null;
    });

    const res = await getTimeAnalytics({
      preset: this.analyticsPreset,
      startDate: this.analyticsPreset === 'custom' ? this.analyticsStartDate : undefined,
      endDate: this.analyticsPreset === 'custom' ? this.analyticsEndDate : undefined,
      listId: this.analyticsListId !== 'all' ? this.analyticsListId : undefined,
      taskId: this.analyticsTaskId !== 'all' ? this.analyticsTaskId : undefined,
    });

    if (requestId !== this.analyticsRequestId || this.disposed) return;
    runInAction(() => {
      this.isLoadingAnalytics = false;
      if (res.ok) {
        this.analyticsData = res.data;
      } else {
        this.analyticsData = null;
        this.analyticsError = res.error.message;
      }
    });
  }
}
