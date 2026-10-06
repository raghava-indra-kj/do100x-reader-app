import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TasksStore } from '../store';
import { TaskDetailPane } from './task-detail-pane';

function render(parentId: string | null, list: { name: string } | null = { name: 'Data Agent' }) {
  const store = {
    selectedTaskId: 'task', isLoadingDetail: false, activeTimer: null, taskBreadcrumbs: [], lists: [],
    selectedTaskDetail: { id: 'task', parentId, listId: list ? 'list' : null, list, title: 'Initializing the Project', priority: 4, subtasks: [], timeSessions: [], totalTimeSeconds: 0 },
  } as unknown as TasksStore;
  return renderToStaticMarkup(<TaskDetailPane store={store} />);
}

describe('task detail list label', () => {
  it('shows the inherited list without an independent subtask list picker', () => {
    const html = render('parent');
    expect(html).toContain('Task list: Data Agent, inherited from parent task');
    expect(html).not.toContain('Change task list');
  });
  it('keeps the list picker for top-level tasks', () => {
    expect(render(null)).toContain('aria-label="Change task list"');
  });
  it('shows Inbox only when inherited from an Inbox parent', () => {
    expect(render('parent', null)).toContain('Task list: Inbox, inherited from parent task');
  });
});
