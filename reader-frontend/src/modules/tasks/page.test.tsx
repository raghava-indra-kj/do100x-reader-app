import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ currentView: 'matrix', selectedTaskId: null as string | null, activeTimer: null }));
vi.mock('./store', () => ({ TasksStore: class { constructor() { return fixture; } } }));
vi.mock('@modules/core/ui/components/appbar/appbar-layout', () => ({ AppBarLayout: () => null }));
vi.mock('@modules/core/ui/components/appbar/appbar-tools', () => ({ AppBarTools: () => null }));
vi.mock('./components/sidebar', () => ({ TasksSidebar: () => null }));
vi.mock('./components/task-list-pane', () => ({ TaskListPane: () => <div>Task list</div> }));
vi.mock('./components/task-detail-pane', () => ({ TaskDetailPane: () => <div>Task detail fixture</div> }));
vi.mock('./components/matrix-view', () => ({ MatrixView: () => <div>Matrix fixture</div> }));
vi.mock('./components/time-analytics-view', () => ({ TimeAnalyticsView: () => null }));
vi.mock('./components/stop-timer-dialog', () => ({ StopTimerDialog: () => null }));
vi.mock('./components/list-dialog', () => ({ ListDialog: () => null }));
vi.mock('./components/session-dialog', () => ({ SessionDialog: () => null }));
vi.mock('./components/confirm-dialog', () => ({ ConfirmDialog: () => null }));
import TasksPage from './page';

beforeEach(() => { fixture.currentView = 'matrix'; fixture.selectedTaskId = null; });
describe('matrix workspace layout', () => {
  it('does not reserve an empty detail pane when no task is selected', () => {
    const html = renderToStaticMarkup(<TasksPage />);
    expect(html).toContain('Matrix fixture'); expect(html).not.toContain('Task detail fixture');
  });
  it('opens a responsive details pane only after selection', () => {
    fixture.selectedTaskId = 'task';
    const html = renderToStaticMarkup(<TasksPage />);
    expect(html).toContain('Selected task details'); expect(html).toContain('Task detail fixture');
    expect(html).toContain('absolute inset-y-0'); expect(html).toContain('xl:static');
  });
  it('preserves the existing list/detail layout in other views, including Completed', () => {
    fixture.currentView = 'completed';
    const html = renderToStaticMarkup(<TasksPage />);
    expect(html).toContain('Task list'); expect(html).toContain('Task detail fixture');
  });
});
