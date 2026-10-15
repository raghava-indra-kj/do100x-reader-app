import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import type { TasksStore } from './store';

// Reuse the same versioned, optimistic save as the priority picker. A drop
// changes only priority; dates, completion, list and task order stay intact.
export async function moveMatrixTask(store: TasksStore, taskId: string, priority: number) {
  if (!Number.isInteger(priority) || priority < 1 || priority > 4) return false;
  const task = store.matrixTasks.find(task => task.id === taskId);
  if (!task || store.savingTaskIds.has(taskId) || task.priority === priority) return false;
  return store.updateTaskProperties(taskId, { priority });
}

// Move to the next visible quadrant, including the single-column mobile layout.
export const matrixKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return;
  event.preventDefault();
  const currentId = context.over?.id ?? `priority-${context.active?.data.current?.priority}`;
  const current = context.droppableRects.get(currentId);
  if (!current || !context.collisionRect) return;
  const center = { x: current.left + current.width / 2, y: current.top + current.height / 2 };
  const candidates = [...context.droppableRects.entries()].filter(([id]) => id !== currentId).map(([, rect]) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }));
  const next = candidates.filter(point => event.code === 'ArrowRight' ? point.x > center.x + 1 : event.code === 'ArrowLeft' ? point.x < center.x - 1 : event.code === 'ArrowDown' ? point.y > center.y + 1 : point.y < center.y - 1).sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y))[0];
  return next ? { x: next.x - context.collisionRect.width / 2, y: next.y - context.collisionRect.height / 2 } : undefined;
};
