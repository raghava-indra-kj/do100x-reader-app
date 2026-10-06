import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, err } from '@raghava.indra/result-ts';
import { AppError } from '@core/errors/app-error';
import { Task, TaskSchema } from '@domain/tasks/models/task';
const services = vi.hoisted(() => ({ getTasks: vi.fn(), getTaskLists: vi.fn(), createTask: vi.fn(), updateTask: vi.fn(), getTask: vi.fn(), getActiveTimer: vi.fn() }));
vi.mock('@domain/tasks/services/task-service', () => services);
vi.mock('@modules/core/ui/primitives/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { TasksStore } from './store';
import { matrixCreationDate } from './matrix-settings';
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
  services.getTaskLists.mockResolvedValue(ok({ lists: [], inbox: { taskCount: 0, uncompletedCount: 0, totalTimeSeconds: 0 } }));
  store = new TasksStore(); store.currentView = 'matrix';
});
afterEach(() => { store.destroy(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('matrix store and rendered controls', () => {
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
    expect(await store.createMatrixTask('  New task  ', 2)).toBe(true);
    expect(services.createTask).toHaveBeenLastCalledWith({ title: 'New task', priority: 2, listId: 'list-a', dueDate: '2027-01-01' });
    store.matrixSettings.date = 'today'; await store.createMatrixTask('Today', 1);
    expect(services.createTask.mock.lastCall?.[0].dueDate).toBe(matrixCreationDate('today'));
    store.matrixSettings.date = 'all'; store.setMatrixQuickList('inbox'); store.quickTaskDueDate = '2027-10-01';
    await store.createMatrixTask('Any time', 4);
    expect(services.createTask).toHaveBeenLastCalledWith({ title: 'Any time', priority: 4, listId: null, dueDate: null });
    expect(store.selectedTaskId).toBeNull();
  });
  it('failed/blank quick-add is not reported as success and does not reload', async () => {
    services.createTask.mockResolvedValue(failure());
    expect(await store.createMatrixTask(' ', 1)).toBe(false);
    expect(services.createTask).not.toHaveBeenCalled();
    expect(await store.createMatrixTask('Keep draft', 1)).toBe(false);
    expect(services.getTasks).not.toHaveBeenCalled();
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
