import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, err } from '@raghava.indra/result-ts';
import { AppError } from '@core/errors/app-error';
import { Task, TaskSchema } from '@domain/tasks/models/task';
import { TimeSession } from '@domain/tasks/models/time-session';
const services = vi.hoisted(() => ({ getTasks: vi.fn(), getTaskLists: vi.fn(), createTaskList: vi.fn(), createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(), getTask: vi.fn(), getActiveTimer: vi.fn(), reorderTasks: vi.fn(), startTimer: vi.fn(), stopTimer: vi.fn(), addSession: vi.fn(), updateSession: vi.fn(), deleteSession: vi.fn(), deleteAllTaskSessions: vi.fn(), getTimeAnalytics: vi.fn() }));
vi.mock('@domain/tasks/services/task-service', () => services);
vi.mock('@modules/core/ui/primitives/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { TasksStore } from './store';
import { matrixCreationDate } from './matrix-settings';
import { moveMatrixTask } from './matrix-drag';
import { MatrixView } from './components/matrix-view';
import { renderToStaticMarkup } from 'react-dom/server';
import { autorun } from 'mobx';

const task = (id: string, priority = 4, status: 'todo' | 'done' | 'cancelled' = 'todo') => new Task(TaskSchema.parse({ id, title: id, priority, status }));
const failure = () => err(new AppError({ message: 'Offline' }));
let store: TasksStore;
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(TasksStore.prototype, 'init').mockResolvedValue(undefined);
  services.getTasks.mockResolvedValue(ok([]));
  services.getActiveTimer.mockResolvedValue(ok({ active: false, timer: null }));
  services.getTaskLists.mockResolvedValue(ok({ lists: [], inbox: { taskCount: 0, uncompletedCount: 0, totalTimeSeconds: 0 } }));
  store = new TasksStore(); store.currentView = 'matrix';
});
afterEach(() => { store.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('matrix store and rendered controls', () => {
  it.each([['work', 'todo', 'list:work'], [null, 'todo', 'inbox'], ['work', 'done', 'completed']] as const)('opens a linked %s task in its matching %s view', async (listId, status, view) => {
    services.getTask.mockResolvedValue(ok({ ...task('linked', 2, status), listId, subtasks: [], timeSessions: [] }));
    store.searchQuery = 'old search';
    await store.selectTask('linked', { showInList: true });
    expect(store.currentView).toBe(view); expect(store.selectedTaskDetail?.id).toBe('linked');
    expect(store.searchQuery).toBe(''); expect(services.getTasks).toHaveBeenCalled();
  });
  it('does not change lists when a deep link resolves after the user navigates away', async () => {
    let resolve!: (value: ReturnType<typeof ok<any>>) => void;
    services.getTask.mockReturnValueOnce(new Promise(value => { resolve = value; }));
    const opening = store.selectTask('late', { showInList: true });
    store.setCurrentView('today');
    resolve(ok({ ...task('late'), listId: 'work', subtasks: [], timeSessions: [] })); await opening;
    expect(store.currentView).toBe('today'); expect(store.selectedTaskId).toBeNull();
  });
  it('refreshes the visible report and its filters after returning from another tab', async () => {
    store.currentView = 'analytics'; store.analyticsListId = 'inbox'; store.analyticsPreset = 'today';
    services.getTimeAnalytics.mockResolvedValue(ok({ totalSeconds: 90 }));
    await store.refreshWorkspace();
    expect(services.getTimeAnalytics).toHaveBeenCalledWith(expect.objectContaining({ preset: 'today', listId: 'inbox' }));
    expect(store.analyticsData).toMatchObject({ totalSeconds: 90 });
    expect(services.getTasks).not.toHaveBeenCalled();
    expect(services.getTaskLists).toHaveBeenCalled(); expect(services.getActiveTimer).toHaveBeenCalled();
  });
  it('refreshes an open report after saving time without clearing its task selection', async () => {
    store.currentView = 'analytics'; store.selectedTaskId = 'task';
    services.getTask.mockResolvedValue(ok({ ...task('task'), subtasks: [], timeSessions: [] }));
    services.addSession.mockResolvedValue(ok({ success: true }));
    services.getTimeAnalytics.mockResolvedValue(ok({ totalSeconds: 1500 }));
    store.openAddSessionDialog(); await store.saveSession();
    expect(store.analyticsData).toMatchObject({ totalSeconds: 1500 });
    expect(store.selectedTaskId).toBe('task'); expect(store.isSessionDialogOpen).toBe(false);
  });
  it('recovers navigation and quick-add from a list deleted in another tab', async () => {
    store.currentView = 'list:removed'; store.matrixQuickListId = 'removed'; store.selectedTaskId = 'task';
    store.taskBreadcrumbs = [{ id: 'task', title: 'Task' }];
    await store.loadLists();
    expect(store.currentView).toBe('inbox'); expect(store.matrixQuickListId).toBe('inbox');
    expect(store.selectedTaskId).toBeNull(); expect(store.taskBreadcrumbs).toEqual([]);
    expect(services.getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ listId: 'inbox', status: 'active' }));
  });
  it('resets a deleted report list and ignores the stale report response', async () => {
    store.currentView = 'analytics'; store.analyticsListId = 'removed';
    let resolve!: (value: ReturnType<typeof ok<any>>) => void;
    services.getTimeAnalytics.mockReturnValueOnce(new Promise(value => { resolve = value; }));
    services.getTimeAnalytics.mockResolvedValueOnce(ok({ totalSeconds: 120 }));
    const refreshing = store.refreshWorkspace();
    await Promise.resolve(); await Promise.resolve();
    resolve(ok({ totalSeconds: 30 })); await refreshing;
    expect(store.analyticsListId).toBe('all'); expect(store.analyticsData).toMatchObject({ totalSeconds: 120 });
    expect(services.getTimeAnalytics).toHaveBeenLastCalledWith(expect.objectContaining({ listId: undefined }));
  });
  it('keeps the current list and quick-add destination when list refresh fails', async () => {
    store.currentView = 'list:keep'; store.matrixQuickListId = 'keep';
    services.getTaskLists.mockResolvedValueOnce(failure()); await store.loadLists();
    expect(store.currentView).toBe('list:keep'); expect(store.matrixQuickListId).toBe('keep');
  });
  it('does not reopen a task after its time entry deletion finishes in another selection', async () => {
    let resolve!: (value: ReturnType<typeof ok<any>>) => void;
    services.deleteAllTaskSessions.mockReturnValueOnce(new Promise(value => { resolve = value; }));
    store.selectedTaskId = 'old';
    const pending = store.deleteAllSessionsForTask('old'); store.selectedTaskId = 'new';
    resolve(ok({ success: true })); await pending;
    expect(store.selectedTaskId).toBe('new'); expect(services.getTask).not.toHaveBeenCalled();
  });
  it('discards a stale detail refresh triggered by deleting a different task', async () => {
    services.deleteTask.mockResolvedValue(ok({ success: true }));
    let resolve!: (value: ReturnType<typeof ok<any>>) => void;
    services.getTask.mockReturnValueOnce(new Promise(value => { resolve = value; }));
    store.selectedTaskId = 'old';
    const deleting = store.deleteTask('removed'); await Promise.resolve();
    services.getTask.mockResolvedValueOnce(ok({ ...task('new'), subtasks: [] })); await store.selectTask('new');
    resolve(ok({ ...task('old'), subtasks: [] })); await deleting;
    expect(store.selectedTaskId).toBe('new'); expect(store.selectedTaskDetail?.id).toBe('new');
  });
  it('deduplicates list submissions and leaves failed input available for retry', async () => {
    let resolve!: (value: ReturnType<typeof failure>) => void;
    services.createTaskList.mockReturnValueOnce(new Promise(value => { resolve = value; }));
    store.listNameInput = 'Learning'; store.isListDialogOpen = true;
    const pending = store.saveList(); await store.saveList();
    expect(services.createTaskList).toHaveBeenCalledTimes(1); expect(store.isSavingList).toBe(true);
    resolve(failure()); await pending;
    expect(store.listNameInput).toBe('Learning'); expect(store.isListDialogOpen).toBe(true); expect(store.isSavingList).toBe(false);
  });
  it('deduplicates subtask submissions per parent and reports whether input can be cleared', async () => {
    let resolve!: (value: ReturnType<typeof failure>) => void;
    services.createTask.mockReturnValueOnce(new Promise(value => { resolve = value; }));
    const pending = store.addSubtask('parent', 'Keep draft');
    expect(await store.addSubtask('parent', 'Keep draft')).toBe(false); expect(services.createTask).toHaveBeenCalledTimes(1);
    resolve(failure()); expect(await pending).toBe(false); expect(store.creatingSubtasks.has('parent')).toBe(false);
    services.createTask.mockResolvedValueOnce(ok(task('created')));
    expect(await store.addSubtask('parent', 'Keep draft')).toBe(true);
  });
  it('deduplicates timer clicks and sends the last observed timer identity', async () => {
    let resolve!: (value: ReturnType<typeof failure>) => void;
    services.startTimer.mockReturnValue(new Promise(value => { resolve = value; }));
    store.activeTimer = { id: 'old', taskId: 'other' } as any;
    const pending = store.startTimerForTask('new'); await store.startTimerForTask('new');
    expect(services.startTimer).toHaveBeenCalledTimes(1);
    expect(services.startTimer).toHaveBeenCalledWith('new', undefined, 'old');
    resolve(failure()); await pending; expect(store.isTimerBusy).toBe(false);
  });
  it('binds the stop dialog to its original timer even if another timer becomes active', async () => {
    store.activeTimer = { id: 'original', taskId: 'task' } as any; store.timerElapsedSeconds = 60; store.promptStopTimer();
    store.activeTimer = { id: 'new-run', taskId: 'other' } as any;
    services.stopTimer.mockResolvedValue(failure()); await store.completeStopTimer();
    expect(services.stopTimer).toHaveBeenCalledWith(undefined, 60, 'original');
  });
  it('preserves exact tracked seconds unless the duration is deliberately adjusted', async () => {
    store.activeTimer = { id: 'timer', taskTitle: 'First task' } as any; store.timerElapsedSeconds = 65; store.promptStopTimer();
    services.stopTimer.mockResolvedValue(failure()); await store.completeStopTimer();
    expect(services.stopTimer).toHaveBeenLastCalledWith(undefined, 65, 'timer');
    expect(store.stopTimerTaskTitle).toBe('First task');
    store.setStopTimerDurationMinutes(10); await store.completeStopTimer();
    expect(services.stopTimer).toHaveBeenLastCalledWith(undefined, 600, 'timer');
    store.setStopTimerDurationMinutes(1); await store.completeStopTimer();
    expect(services.stopTimer).toHaveBeenLastCalledWith(undefined, 60, 'timer');
    store.resetStopTimerDuration(); await store.completeStopTimer();
    expect(services.stopTimer).toHaveBeenLastCalledWith(undefined, 65, 'timer');
  });
  it('edits a note without rounding duration or changing its original timestamp', async () => {
    const original = new TimeSession({ id: 'session', taskId: 'task', startTime: '2026-10-14T23:59:31.123Z', endTime: '2026-10-15T00:00:36.123Z', durationSeconds: 65, notes: 'Old', updatedAt: '2026-10-15T01:00:00Z' });
    store.openEditSessionDialog(original); store.sessionNotesInput = ''; services.updateSession.mockResolvedValue(failure());
    await store.saveSession();
    expect(services.updateSession).toHaveBeenCalledWith('session', { notes: '', expectedUpdatedAt: original.updatedAt });
  });
  it('saves an explicitly adjusted rounded minute and preserves an unchanged precise start', async () => {
    const original = new TimeSession({ id: 'session', taskId: 'task', startTime: '2026-10-14T23:59:31.123Z', durationSeconds: 65, updatedAt: '2026-10-15T01:00:00Z' });
    store.openEditSessionDialog(original); store.setSessionDurationMinutes(1);
    services.updateSession.mockResolvedValue(failure()); await store.saveSession();
    expect(services.updateSession).toHaveBeenCalledWith('session', { notes: '', durationSeconds: 60, expectedUpdatedAt: original.updatedAt });
  });
  it('starts a manual entry in the past and accepts a chosen local start time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 9, 15, 10, 30));
    store.selectedTaskId = 'task'; store.openAddSessionDialog();
    expect(store.sessionDateInput).toBe('2026-10-15'); expect(store.sessionTimeInput).toBe('10:05');
    store.setSessionTimeInput('09:00'); services.addSession.mockResolvedValue(failure()); await store.saveSession();
    expect(services.addSession.mock.calls[0][1].startTime).toBe(new Date(2026, 9, 15, 9).toISOString());
  });
  it('keeps the detail editor mounted while refreshing and after a refresh failure', async () => {
    let resolve!: (value: ReturnType<typeof failure>) => void;
    const detail = { ...task('keep'), subtasks: [], timeSessions: [] } as any;
    store.selectedTaskId = 'keep'; store.selectedTaskDetail = detail;
    services.getTask.mockReturnValue(new Promise(value => { resolve = value; }));
    const refreshing = store.selectTask('keep'); expect(store.isLoadingDetail).toBe(false);
    expect(store.selectedTaskDetail?.id).toBe('keep');
    resolve(failure()); await refreshing;
    expect(store.selectedTaskDetail?.id).toBe('keep'); expect(store.detailError).toBeTruthy();
  });
  it('deduplicates manual entry saves and retains the creation key after a failure', async () => {
    let resolve!: (value: ReturnType<typeof failure>) => void;
    services.addSession.mockReturnValueOnce(new Promise(value => { resolve = value; })).mockResolvedValue(failure());
    store.selectedTaskId = 'task'; store.openAddSessionDialog();
    const pending = store.saveSession(); await store.saveSession(); expect(services.addSession).toHaveBeenCalledTimes(1);
    const requestKey = services.addSession.mock.calls[0][1].requestKey;
    resolve(failure()); await pending; await store.saveSession();
    expect(services.addSession.mock.calls[1][1].requestKey).toBe(requestKey);
  });
  it('does not start a ticker after the page is unmounted during initialization', async () => {
    vi.useFakeTimers();
    vi.mocked(TasksStore.prototype.init).mockRestore();
    let resolve!: (value: ReturnType<typeof ok<any>>) => void;
    services.getActiveTimer.mockReturnValue(new Promise(value => { resolve = value; }));
    const starting = store.init(); store.destroy();
    resolve(ok({ active: false, timer: null })); await starting;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('discards an older detail response even when the same task was reopened', async () => {
    let resolve!: (value: ReturnType<typeof ok<any>>) => void;
    services.getTask.mockReturnValueOnce(new Promise(value => { resolve = value; }));
    const old = store.selectTask('same');
    services.getTask.mockResolvedValueOnce(ok({ ...task('same'), title: 'Latest', subtasks: [] }));
    await store.selectTask('same'); resolve(ok({ ...task('same'), title: 'Old', subtasks: [] })); await old;
    expect(store.selectedTaskDetail?.title).toBe('Latest');
  });
  it('preserves the active timer on a transient network error', async () => {
    const timer = { id: 'timer', taskId: 'task' } as any;
    store.activeTimer = timer; store.timerElapsedSeconds = 15;
    services.getActiveTimer.mockResolvedValue(failure()); await store.loadActiveTimer();
    expect(store.activeTimer).toEqual(timer); expect(store.timerElapsedSeconds).toBe(15);
  });
  it('serializes saves for the same task so a slower older edit cannot win', async () => {
    let resolve!: (value: ReturnType<typeof ok<any>>) => void;
    services.updateTask.mockReturnValueOnce(new Promise(value => { resolve = value; })).mockResolvedValueOnce(ok(task('edit')));
    const first = store.updateTaskProperties('edit', { title: 'First' });
    const second = store.updateTaskProperties('edit', { title: 'Second' });
    expect(services.updateTask).toHaveBeenCalledTimes(1);
    resolve(ok(task('edit'))); await Promise.all([first, second]);
    expect(services.updateTask.mock.calls.map(call => call[1].title)).toEqual(['First', 'Second']);
  });
  it('retains the saved revision when a background detail refresh fails', async () => {
    const detail = Object.assign(task('edit'), { version: 1, subtasks: [], timeSessions: [], isActiveTimerRunning: false });
    store.selectedTaskId = 'edit'; store.selectedTaskDetail = detail;
    services.updateTask.mockResolvedValue(ok(Object.assign(task('edit'), { title: 'Saved title', version: 2 })));
    services.getTask.mockResolvedValue(failure()); services.getTasks.mockResolvedValue(failure());
    expect(await store.updateTaskProperties('edit', { title: 'Saved title' })).toBe(true);
    expect(store.selectedTaskDetail?.version).toBe(2); expect(store.selectedTaskDetail?.title).toBe('Saved title');
    expect(store.savingTaskIds.size).toBe(0);
  });
  it('prevents duplicate quick-add and retains a newer draft typed during the save', async () => {
    let resolve!: (value: ReturnType<typeof ok<any>>) => void;
    services.createTask.mockReturnValue(new Promise(value => { resolve = value; }));
    services.getTask.mockResolvedValue(ok({ ...task('new'), subtasks: [] }));
    store.quickTaskTitle = 'First'; const pending = store.createQuickTask();
    await store.createQuickTask(); expect(services.createTask).toHaveBeenCalledTimes(1);
    store.quickTaskTitle = 'Next idea'; resolve(ok(task('new'))); await pending;
    expect(store.quickTaskTitle).toBe('Next idea'); expect(store.isCreatingTask).toBe(false);
  });
  it('restores the previous task order when its save fails', async () => {
    store.currentView = 'inbox'; store.tasks = [task('a'), task('b')]; services.reorderTasks.mockResolvedValue(failure());
    await store.moveTaskOrder(0, 'down'); expect(store.tasks.map(task => task.id)).toEqual(['a', 'b']);
    expect(services.reorderTasks).toHaveBeenCalledOnce(); expect(store.tasks.map(task => task.sortOrder)).toEqual([0, 0]);
  });
  it('sorts manually across task states and offers deterministic date, priority and title orders', () => {
    const a = Object.assign(task('Zebra', 1), { sortOrder: 2, dueDate: '2026-10-16' });
    const b = Object.assign(task('Alpha', 4), { sortOrder: 1, dueDate: '2026-10-15' });
    store.tasks = [a, b];
    expect(store.filteredTasks.map(task => task.id)).toEqual(['Alpha', 'Zebra']);
    store.setTaskSort('priority'); expect(store.filteredTasks[0].id).toBe('Zebra');
    store.setTaskSort('due'); expect(store.filteredTasks[0].id).toBe('Alpha');
    store.setTaskSort('title'); expect(store.filteredTasks[0].id).toBe('Alpha');
  });
  it('blocks overlapping, filtered or smart-view reorders and does not roll back another view', async () => {
    let resolve!: (value: ReturnType<typeof failure>) => void;
    services.reorderTasks.mockReturnValueOnce(new Promise(value => { resolve = value; }));
    store.currentView = 'inbox'; store.tasks = [Object.assign(task('a'), { version: 2 }), Object.assign(task('b'), { version: 3 })];
    const pending = store.moveTaskOrder(0, 'down'); await store.moveTaskOrder(0, 'down');
    expect(services.reorderTasks).toHaveBeenCalledOnce(); expect(services.reorderTasks).toHaveBeenCalledWith(['b', 'a'], { a: 2, b: 3 });
    expect(store.filteredTasks.map(task => task.id)).toEqual(['b', 'a']);
    store.currentView = 'list:other'; store.tasks = [task('new')]; resolve(failure()); await pending;
    expect(store.tasks[0].id).toBe('new'); expect(store.isReorderingTasks).toBe(false);
    store.searchQuery = 'new'; await store.moveTaskOrder(0, 'down'); expect(services.reorderTasks).toHaveBeenCalledOnce();
    store.searchQuery = ''; store.currentView = 'today'; expect(store.canReorderTasks).toBe(false);
  });
  it('requests subtasks and explicit date/status/time zone rules, hiding overdue for Completed', async () => {
    store.matrixSettings = { date: 'today', status: 'completed', includeOverdue: true };
    await store.loadTasks();
    expect(services.getTasks).toHaveBeenLastCalledWith({ matrixDate: 'today', status: 'done', includeSubtasks: true, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, includeOverdue: false });
    store.matrixSettings.status = 'all'; await store.loadTasks();
    expect(services.getTasks.mock.lastCall?.[0]).toMatchObject({ status: 'all', includeOverdue: true });
    store.matrixSettings.date = 'tomorrow'; await store.loadTasks();
    expect(services.getTasks.mock.lastCall?.[0]).toMatchObject({ matrixDate: 'tomorrow', includeOverdue: false });
  });
  it('ignores an older response after a filter or view changes', async () => {
    let resolve!: (value: ReturnType<typeof ok<Task[]>>) => void;
    services.getTasks.mockReturnValueOnce(new Promise(value => { resolve = value; }));
    const oldRequest = store.loadTasks();
    services.getTasks.mockResolvedValueOnce(ok([task('new')]));
    await store.loadTasks(); resolve(ok([task('old')])); await oldRequest;
    expect(store.tasks.map(task => task.id)).toEqual(['new']);
  });
  it('does not reopen details after closing them while a request is pending', async () => {
    let resolve!: (value: ReturnType<typeof ok<any>>) => void;
    services.getTask.mockReturnValue(new Promise(value => { resolve = value; }));
    const opening = store.selectTask('slow');
    await store.selectTask(null);
    resolve(ok(task('slow'))); await opening;
    expect(store.selectedTaskId).toBeNull(); expect(store.selectedTaskDetail).toBeNull(); expect(store.isLoadingDetail).toBe(false);
  });
  it('refreshes the matrix at local midnight using the existing ticker', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 6, 23, 59, 59));
    vi.mocked(TasksStore.prototype.init).mockRestore();
    services.getActiveTimer.mockResolvedValue(ok({ active: false }));
    const midnightStore = new TasksStore(); midnightStore.currentView = 'matrix';
    try {
      await midnightStore.init();
      await vi.advanceTimersByTimeAsync(0);
      services.getTasks.mockClear();
      await vi.advanceTimersByTimeAsync(1000);
      expect(services.getTasks).toHaveBeenCalledTimes(1);
      expect(services.getTasks.mock.lastCall?.[0]).toMatchObject({ matrixDate: 'all', includeSubtasks: true });
      await vi.advanceTimersByTimeAsync(1000); expect(services.getTasks).toHaveBeenCalledTimes(1);
    } finally { midnightStore.destroy(); }
  });
  it('persists settings and reloads only the matrix', async () => {
    const setItem = vi.fn(); vi.stubGlobal('localStorage', { getItem: () => null, setItem });
    store.setMatrixSettings({ date: 'tomorrow', status: 'all' });
    expect(setItem).toHaveBeenCalledWith('do100x.tasks.matrix', JSON.stringify(store.matrixSettings));
    expect(services.getTasks).toHaveBeenCalledTimes(1);
    store.currentView = 'inbox'; store.setMatrixSettings({ date: 'today' });
    expect(services.getTasks).toHaveBeenCalledTimes(1);
  });
  it('quick-add respects the quadrant, selected list and local date; All remains undated', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 11, 31, 23));
    services.createTask.mockResolvedValue(ok(task('new')));
    store.setMatrixQuickList('list-a'); store.matrixSettings.date = 'tomorrow';
    store.setMatrixQuickTitle(2, '  New task  '); expect(await store.createMatrixTask(2)).toBe(true);
    expect(services.createTask).toHaveBeenLastCalledWith({ title: 'New task', priority: 2, listId: 'list-a', dueDate: '2027-01-01' });
    store.matrixSettings.date = 'today'; store.setMatrixQuickTitle(1, 'Today'); await store.createMatrixTask(1);
    expect(services.createTask.mock.lastCall?.[0].dueDate).toBe(matrixCreationDate('today'));
    store.matrixSettings.date = 'all'; store.setMatrixQuickList('inbox'); store.quickTaskDueDate = '2027-10-01';
    store.setMatrixQuickTitle(4, 'Any time'); await store.createMatrixTask(4);
    expect(services.createTask).toHaveBeenLastCalledWith({ title: 'Any time', priority: 4, listId: null, dueDate: null });
    expect(store.selectedTaskId).toBeNull();
  });
  it('failed/blank quick-add is not reported as success and does not reload', async () => {
    services.createTask.mockResolvedValue(failure());
    store.setMatrixQuickTitle(1, ' '); expect(await store.createMatrixTask(1)).toBe(false);
    expect(services.createTask).not.toHaveBeenCalled();
    store.setMatrixQuickTitle(1, 'Keep draft'); expect(await store.createMatrixTask(1)).toBe(false);
    expect(store.matrixQuickDrafts[1]).toMatchObject({ title: 'Keep draft', saving: false, error: 'Offline' });
    expect(services.getTasks).not.toHaveBeenCalled();
  });
  it('retains all four matrix drafts through refresh, search, date/status and view changes', async () => {
    for (const priority of [1, 2, 3, 4]) store.setMatrixQuickTitle(priority, `P${priority} draft`);
    await store.refreshWorkspace();
    store.setSearchQuery('new filter'); store.setMatrixSettings({ date: 'today', status: 'completed' });
    store.setCurrentView('inbox'); store.setCurrentView('matrix');
    await store.loadTasks(); store.setMatrixSettings({ status: 'active' }); await store.loadTasks();
    expect(Object.values(store.matrixQuickDrafts).map(draft => draft.title)).toEqual(['P1 draft', 'P2 draft', 'P3 draft', 'P4 draft']);
    const html = renderToStaticMarkup(<MatrixView store={store} />);
    for (const priority of [1, 2, 3, 4]) expect(html).toContain(`value="P${priority} draft"`);
    expect(services.createTask).not.toHaveBeenCalled();
  });
  it('deduplicates a priority submission across remounts and snapshots its list/date independently', async () => {
    let resolve!: (value: ReturnType<typeof ok<Task>>) => void;
    services.createTask.mockReturnValueOnce(new Promise(value => { resolve = value; }));
    store.matrixQuickListId = 'work'; store.matrixSettings.date = 'tomorrow'; store.setMatrixQuickTitle(2, 'Original title');
    const dueDate = matrixCreationDate('tomorrow');
    const pending = store.createMatrixTask(2);
    await store.loadTasks();
    expect(renderToStaticMarkup(<MatrixView store={store} />)).toMatch(/aria-label="Add P2 task" aria-busy="true" disabled=""/);
    expect(await store.createMatrixTask(2)).toBe(false);
    store.setMatrixQuickTitle(2, 'Next title'); store.setMatrixQuickList('personal'); store.matrixSettings.date = 'all';
    expect(services.createTask).toHaveBeenCalledOnce();
    expect(services.createTask).toHaveBeenCalledWith({ title: 'Original title', priority: 2, listId: 'work', dueDate });
    resolve(ok(task('created', 2))); expect(await pending).toBe(true);
    expect(store.matrixQuickDrafts[2]).toMatchObject({ title: 'Next title', saving: false, error: '' });
  });
  it('lets another priority save independently without clearing neighboring drafts', async () => {
    let resolve!: (value: ReturnType<typeof ok<Task>>) => void;
    services.createTask.mockReturnValueOnce(new Promise(value => { resolve = value; })).mockResolvedValueOnce(ok(task('second', 3)));
    store.setMatrixQuickTitle(1, 'Pending urgent'); store.setMatrixQuickTitle(3, 'Save medium'); store.setMatrixQuickTitle(4, 'Keep low');
    const urgent = store.createMatrixTask(1);
    expect(await store.createMatrixTask(3)).toBe(true);
    expect(store.matrixQuickDrafts[3].title).toBe('');
    expect(store.matrixQuickDrafts[1]).toMatchObject({ title: 'Pending urgent', saving: true });
    expect(store.matrixQuickDrafts[4].title).toBe('Keep low');
    resolve(ok(task('first', 1))); await urgent;
  });
  it('retains failed input on thrown transport errors and can retry after acknowledgment', async () => {
    store.setMatrixQuickTitle(2, 'Keep for retry'); services.createTask.mockRejectedValueOnce(new Error('Network failed'));
    expect(await store.createMatrixTask(2)).toBe(false);
    expect(store.matrixQuickDrafts[2]).toMatchObject({ title: 'Keep for retry', saving: false, error: 'Network failed' });
    expect(renderToStaticMarkup(<MatrixView store={store} />)).toContain('Network failed');
    services.createTask.mockResolvedValueOnce(ok(task('created', 2))); expect(await store.createMatrixTask(2)).toBe(true);
    expect(store.matrixQuickDrafts[2]).toMatchObject({ title: '', saving: false, error: '' });
  });
  it('ignores a create completion after its account workspace was disposed', async () => {
    let resolve!: (value: ReturnType<typeof ok<Task>>) => void;
    services.createTask.mockReturnValueOnce(new Promise(value => { resolve = value; }));
    store.setMatrixQuickTitle(4, 'Old account draft'); const pending = store.createMatrixTask(4); store.destroy();
    const nextAccount = new TasksStore();
    resolve(ok(task('created', 4))); expect(await pending).toBe(false);
    expect(services.getTasks).not.toHaveBeenCalled(); expect(services.getTaskLists).not.toHaveBeenCalled();
    expect(nextAccount.matrixQuickDrafts[4].title).toBe('');
    expect(store.matrixQuickDrafts[4].title).toBe('Old account draft');
    nextAccount.destroy();
  });
  it('does not report an acknowledged create as failed if subsequent refresh rejects', async () => {
    store.setMatrixQuickTitle(3, 'Created once'); services.createTask.mockResolvedValueOnce(ok(task('created', 3)));
    services.getTasks.mockRejectedValueOnce(new Error('Refresh unavailable'));
    expect(await store.createMatrixTask(3)).toBe(true);
    expect(store.matrixQuickDrafts[3]).toMatchObject({ title: '', saving: false, error: '' });
    expect(services.createTask).toHaveBeenCalledOnce();
  });
  it('group counts match visible active/completed/search rows and include subtasks', () => {
    const child = task('Child', 1); child.parentId = 'root'; child.parentTitle = 'Project'; child.list = { id: 'list-a', name: 'Data Agent' };
    store.tasks = [child, task('Done', 1, 'done'), task('Low'), task('Cancelled', 2, 'cancelled')];
    expect(store.matrixQ1Tasks).toHaveLength(1);
    store.matrixSettings.status = 'all'; expect(store.matrixQ1Tasks.map(task => task.id)).toEqual(['Child', 'Done']);
    expect(store.matrixTasks).toHaveLength(3);
    store.setSearchQuery('child'); expect(store.matrixQ1Tasks).toHaveLength(1); expect(store.matrixQ4Tasks).toHaveLength(0);
    const html = renderToStaticMarkup(<MatrixView store={store} />);
    expect(html).toContain('Data Agent › Project'); expect(html).toContain('1 tasks');
    expect(html).toContain('Priority for Child'); expect(html).toContain('P1 · Urgent');
    expect(html).not.toContain('Urgent and important');
    store.setSearchQuery(''); store.matrixSettings.status = 'completed';
    expect(store.matrixQ1Tasks.map(task => task.id)).toEqual(['Done']);
  });
  it('Completed view is struck through and reopenable, with no quick-add or overdue control', () => {
    store.matrixSettings = { date: 'today', status: 'completed', includeOverdue: true };
    const done = task('Finished', 2, 'done'); done.completedAt = new Date().toISOString(); store.tasks = [done];
    const html = renderToStaticMarkup(<MatrixView store={store} />);
    expect(html).toContain('aria-label="Reopen Finished"'); expect(html).toContain('line-through');
    expect(html).toContain('Completed today'); expect(html).toContain('By completion date');
    expect(html).not.toContain('New P1 task title'); expect(html).not.toContain('Include overdue');
    expect(html).toContain('Matrix status'); expect(html).toContain('Today'); expect(html).toContain('Tomorrow'); expect(html).toContain('All dates');
  });
  it('error/loading states do not pretend tasks are an empty result', async () => {
    services.getTasks.mockResolvedValue(failure()); await store.loadTasks();
    expect(store.tasks).toEqual([]);
    let html = renderToStaticMarkup(<MatrixView store={store} />);
    expect(html).toContain('role="alert"'); expect(html).toContain('Try again'); expect(html).not.toContain('No tasks for this view');
    store.isLoadingTasks = true; html = renderToStaticMarkup(<MatrixView store={store} />);
    expect(html).toContain('role="status"'); expect(html).toContain('Loading tasks');
  });
  it('failed completion/reopening rolls back both status and timestamps', async () => {
    let resolve!: (value: ReturnType<typeof failure>) => void;
    services.updateTask.mockImplementation(() => new Promise(value => { resolve = value; }));
    const active = task('Active'); store.tasks = [active];
    let saving = store.toggleTaskStatus(active);
    expect(active.status).toBe('done'); expect(active.completedAt).toBeTruthy();
    expect(services.updateTask).toHaveBeenLastCalledWith('Active', { status: 'done' });
    resolve(failure()); await saving; expect(active.status).toBe('todo'); expect(active.completedAt).toBeUndefined();
    active.status = 'done'; active.completedAt = '2026-10-05T20:00:00Z';
    saving = store.toggleTaskStatus(active); expect(active.completedAt).toBeNull();
    resolve(failure()); await saving; expect(active.status).toBe('done'); expect(active.completedAt).toBe('2026-10-05T20:00:00Z');
  });
  it('completion updates visible group counts immediately and refreshes persisted rows', async () => {
    let resolve!: (value: ReturnType<typeof ok<Task>>) => void;
    services.updateTask.mockReturnValue(new Promise(value => { resolve = value; }));
    const active = task('Active', 2); store.tasks = [active];
    const counts: number[] = []; const dispose = autorun(() => { counts.push(store.matrixQ2Tasks.length); });
    try {
      const saving = store.toggleTaskStatus(active);
      expect(counts).toEqual([1, 0]);
      resolve(ok(active)); await saving;
      expect(services.getTasks).toHaveBeenCalled(); expect(services.getTaskLists).toHaveBeenCalled();
    } finally { dispose(); }
  });
  it('moves priority instantly and rolls it back when save fails', async () => {
    let resolve!: (value: ReturnType<typeof failure>) => void;
    services.updateTask.mockReturnValue(new Promise(value => { resolve = value; }));
    const active = task('Active', 1); store.tasks = [active];
    const counts: number[] = [];
    const dispose = autorun(() => { counts.push(store.matrixQ1Tasks.length); });
    const saving = store.updateTaskProperties(active.id, { priority: 3 });
    try {
      expect(store.matrixQ1Tasks).toHaveLength(0); expect(store.matrixQ3Tasks).toHaveLength(1);
      resolve(failure()); await saving; expect(store.matrixQ1Tasks).toHaveLength(1); expect(store.matrixQ3Tasks).toHaveLength(0);
      expect(counts).toEqual([1, 0, 1]);
    } finally { dispose(); }
  });
});


describe('priority drag saves', () => {
  it('moves optimistically and saves only priority with the current version', async () => {
    const item = task('drag-me', 2); item.version = 7;
    store.tasks = [item]; store.matrixSettings = { ...store.matrixSettings, date: 'all' };
    let finish!: (result: ReturnType<typeof ok<any>>) => void;
    services.updateTask.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    services.getTasks.mockResolvedValue(ok([item]));
    const moving = moveMatrixTask(store, item.id, 1);
    expect(store.matrixQ1Tasks.map(task => task.id)).toEqual(['drag-me']);
    expect(services.updateTask).toHaveBeenCalledWith('drag-me', { priority: 1, expectedVersion: 7 });
    expect(await moveMatrixTask(store, item.id, 3)).toBe(false);
    finish(ok({ ...item, version: 8 }));
    expect(await moving).toBe(true);
    expect(item.version).toBe(8);
  });
  it('restores the previous priority after a failed save', async () => {
    const item = task('keep-me', 3); store.tasks = [item];
    store.matrixSettings = { ...store.matrixSettings, date: 'all' };
    services.updateTask.mockResolvedValueOnce(failure());
    expect(await moveMatrixTask(store, item.id, 1)).toBe(false);
    expect(item.priority).toBe(3); expect(item.status).toBe('todo');
  });
  it('ignores invalid, stale and same-group drops', async () => {
    store.tasks = [task('unchanged', 2)]; store.matrixSettings = { ...store.matrixSettings, date: 'all' };
    for (const priority of [0, 5, 1.5, 2]) expect(await moveMatrixTask(store, 'unchanged', priority)).toBe(false);
    expect(await moveMatrixTask(store, 'missing', 1)).toBe(false);
    expect(services.updateTask).not.toHaveBeenCalled();
  });
});
