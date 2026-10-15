// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@raghava.indra/result-ts';
import { runInAction } from 'mobx';

const services = vi.hoisted(() => ({ getTasks: vi.fn(), getTaskLists: vi.fn(), createTask: vi.fn() }));
vi.mock('@domain/tasks/services/task-service', () => services);
vi.mock('@modules/core/ui/primitives/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@modules/core/ui/primitives/tooltip', () => ({ Tooltip: ({ children }: any) => children }));
import { TasksStore } from '../store';
import { MatrixView } from './matrix-view';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let store: TasksStore;
let root: ReturnType<typeof createRoot>;
beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    services.getTasks.mockResolvedValue(ok([]));
    services.getTaskLists.mockResolvedValue(ok({ lists: [], inbox: { taskCount: 0, uncompletedCount: 0, totalTimeSeconds: 0 } }));
    store = new TasksStore(); store.currentView = 'matrix';
    const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    await act(async () => root.render(<MatrixView store={store} />));
});
afterEach(async () => { await act(async () => root.unmount()); store.destroy(); document.body.innerHTML = ''; vi.unstubAllGlobals(); });

const input = (priority: number) => document.querySelector<HTMLInputElement>(`input[aria-label="New P${priority} task title"]`)!;
const button = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
async function type(priority: number, value: string) {
    await act(async () => {
        const element = input(priority);
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

describe('matrix quick-add recovery in the rendered view', () => {
    it('restores typed titles after Refresh unmounts all quadrants', async () => {
        await type(2, 'Review what I learned this week'); await type(4, 'Read later');
        let finish!: (value: unknown) => void;
        services.getTasks.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
        await act(async () => button('Refresh matrix').click());
        expect(input(2)).toBeNull();
        await act(async () => finish(ok([])));
        expect(input(2).value).toBe('Review what I learned this week');
        expect(input(4).value).toBe('Read later');
        expect(services.createTask).not.toHaveBeenCalled();
    });

    it('retains pending submission through a remount and never clears a newer title', async () => {
        let finish!: (value: unknown) => void;
        services.createTask.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
        await type(2, 'First title');
        await act(async () => button('Add P2 task').click());
        await act(async () => runInAction(() => { store.isLoadingTasks = true; }));
        expect(input(2)).toBeNull();
        await act(async () => runInAction(() => { store.isLoadingTasks = false; }));
        expect(button('Add P2 task').disabled).toBe(true);
        await act(async () => input(2).form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
        expect(services.createTask).toHaveBeenCalledOnce();
        await type(2, 'Next title');
        await act(async () => finish(ok({ id: 'created' })));
        expect(input(2).value).toBe('Next title');
        expect(button('Add P2 task').disabled).toBe(false);
    });

    it('restores hidden drafts after completed status or the matrix tab is left', async () => {
        await type(1, 'Keep this idea');
        await act(async () => store.setMatrixSettings({ status: 'completed' }));
        expect(input(1)).toBeNull();
        await act(async () => root.render(<div>Another tasks view</div>));
        await act(async () => store.setMatrixSettings({ status: 'active' }));
        await act(async () => root.render(<MatrixView store={store} />));
        expect(input(1).value).toBe('Keep this idea');
    });
});
