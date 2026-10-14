import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { TasksStore } from '../store';
import { TaskDetailPane } from './task-detail-pane';
import { Task, TaskSchema } from '@domain/tasks/models/task';
import { TimeSession } from '@domain/tasks/models/time-session';

function render(parentId: string | null, list: { name: string } | null = { name: 'Data Agent' }) {
  const store = {
    selectedTaskId: 'task', isLoadingDetail: false, activeTimer: null, taskBreadcrumbs: [], lists: [],
    selectedTaskDetail: { id: 'task', parentId, listId: list ? 'list' : null, list, title: 'Initializing the Project', priority: 4, subtasks: [], timeSessions: [], totalTimeSeconds: 0 },
  } as unknown as TasksStore;
  return renderToStaticMarkup(<MemoryRouter><TaskDetailPane store={store} /></MemoryRouter>);
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
  it('keeps all time entries editable and their controls named, including on a failed refresh', () => {
    const detail = Object.assign(new Task(TaskSchema.parse({ id: 'task', title: 'Read', priority: 4 })), {
      subtasks: [], timeSessions: Array.from({ length: 6 }, (_, index) => new TimeSession({ id: String(index), taskId: 'task', startTime: `2026-10-15T0${index}:00:00Z`, durationSeconds: 65, notes: `Entry ${index + 1}` })),
    });
    const store = { selectedTaskId: 'task', selectedTaskDetail: detail, detailError: 'Offline', taskBreadcrumbs: [], lists: [], activeTimer: { taskId: 'task' }, isTimerRunning: true, formattedTimerElapsed: '01:05' } as unknown as TasksStore;
    const html = renderToStaticMarkup(<MemoryRouter><TaskDetailPane store={store} /></MemoryRouter>);
    expect(html).toContain('Entry 6'); expect(html.match(/aria-label="Edit time entry/g)).toHaveLength(6);
    expect(html).toContain('aria-label="Task notes"'); expect(html).toContain('aria-label="Save tracked time"');
    expect(html).toContain('Retry refresh'); expect(html).not.toMatch(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<button\b/);
  });
});
