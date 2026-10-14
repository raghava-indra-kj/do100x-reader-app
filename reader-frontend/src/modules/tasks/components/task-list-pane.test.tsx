import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TaskListPane } from './task-list-pane';
import type { TasksStore } from '../store';
const render = (values = {}) => renderToStaticMarkup(<TaskListPane store={{ activeListName: 'Inbox', currentView: 'inbox', filteredTasks: [], quickTaskPriority: 4, quickTaskTitle: '', quickTaskDueDate: '', searchQuery: '', ...values } as unknown as TasksStore} />);
describe('task list states', () => {
  it('keeps failures retryable instead of claiming that there are no tasks', () => {
    const html = render({ tasksError: 'Could not connect.' });
    expect(html).toContain('role="alert"'); expect(html).toContain('Retry tasks'); expect(html).not.toContain('No tasks here');
  });
  it('names quick-add and search controls even when compacted on a phone', () => {
    const html = render();
    for (const name of ['Search tasks', 'New task title', 'New task priority', 'New task due date']) expect(html).toContain(`aria-label="${name}"`);
  });
});
