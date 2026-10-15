import { observer } from 'mobx-react-lite';
import { Check, Plus, Calendar, Search, RefreshCw, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { matrixKeyboardCoordinates, moveMatrixTask } from '../matrix-drag';
import { Loader } from '@modules/core/ui/primitives/loader/loader';
import type { TasksStore } from '../store';
import type { Task } from '@domain/tasks/models/task';
import { dueDateLabel, completionDateLabel } from '../matrix-settings';

const priorities = [
  { priority: 1, name: 'Urgent', color: 'text-red-600 dark:text-red-400', border: 'border-t-red-500' },
  { priority: 2, name: 'High', color: 'text-amber-600 dark:text-amber-400', border: 'border-t-amber-500' },
  { priority: 3, name: 'Medium', color: 'text-blue-600 dark:text-blue-400', border: 'border-t-blue-500' },
  { priority: 4, name: 'Low', color: 'text-[var(--color-text-muted)]', border: 'border-t-slate-400' },
];

const MatrixTask = observer(({ task, store }: { task: Task; store: TasksStore }) => {
  const pending = store.savingTaskIds.has(task.id);
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging } = useDraggable({ id: task.id, data: { priority: task.priority, title: task.title }, disabled: pending });
  const date = task.isDone ? completionDateLabel(task.completedAt) : dueDateLabel(task.dueDate);
  return (
    <div ref={setNodeRef} data-matrix-task={task.id} style={{ opacity: isDragging ? 0.35 : 1 }} className={`rounded-lg border p-2 ${store.selectedTaskId === task.id ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : 'border-transparent hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-soft)]'}`}>
      <div className="flex items-start gap-2">
        <Tooltip content="Drag to change priority · Space to pick up, arrow keys to move"><button ref={setActivatorNodeRef} type="button" aria-label={`Move ${task.title}`} disabled={pending} {...attributes} {...listeners} className="flex h-6 w-5 items-center justify-center shrink-0 touch-none cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] rounded focus-visible:outline-2 focus-visible:outline-[var(--color-brand)] disabled:opacity-40"><GripVertical size={15} /></button></Tooltip>
        <button type="button" aria-label={`${task.isDone ? 'Reopen' : 'Complete'} ${task.title}`} onClick={() => void store.toggleTaskStatus(task)} className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border cursor-pointer ${task.isDone ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-[var(--color-border-strong)] hover:border-[var(--color-brand)]'}`}>
          {task.isDone && <Check className="h-3 w-3" />}
        </button>
        <button type="button" aria-label={`Open ${task.title}`} onClick={() => void store.selectTask(task.id)} className="min-w-0 flex-1 text-left cursor-pointer">
          <span className={`block text-xs leading-relaxed font-medium break-words ${task.isDone ? 'line-through text-[var(--color-text-muted)]' : ''}`}>{task.title}</span>
          <span className="mt-1 block truncate text-[10px] text-[var(--color-text-muted)]" title={[task.list?.name ?? 'Inbox', task.parentTitle].filter(Boolean).join(' › ')}>{task.list?.name ?? 'Inbox'}{task.parentId && ` › ${task.parentTitle ?? 'Subtask'}`}</span>
        </button>
        <select aria-label={`Priority for ${task.title}`} value={task.priority} disabled={pending} onChange={event => void store.updateTaskProperties(task.id, { priority: Number(event.target.value) })} className="shrink-0 max-w-[72px] rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-1 py-0.5 text-[10px] cursor-pointer">
          {priorities.map(priority => <option key={priority.priority} value={priority.priority}>P{priority.priority} {priority.name}</option>)}
        </select>
      </div>
      <div className="mt-1.5 pl-6 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--color-text-muted)]">
        <span className={`flex items-center gap-1 ${!task.isDone && date === 'Overdue' ? 'text-[var(--color-error)]' : ''}`} title={task.isDone ? task.completedAt ?? undefined : task.dueDate?.slice(0, 10)}><Calendar className="h-3 w-3" />{date}</span>
        {!!task.totalTimeSeconds && <span>{task.totalTimeFormatted} tracked</span>}
      </div>
    </div>
  );
});

const Quadrant = observer(({ store, meta, tasks }: { store: TasksStore; meta: typeof priorities[number]; tasks: Task[] }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `priority-${meta.priority}`, data: { priority: meta.priority } });
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const add = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try { if (await store.createMatrixTask(title, meta.priority)) setTitle(''); }
    finally { setSaving(false); }
  };
  return (
    <section ref={setNodeRef} aria-label={`P${meta.priority} ${meta.name}`} className={`${isOver ? 'ring-2 ring-[var(--color-brand)] bg-[var(--color-brand-soft)]' : ''} flex flex-col min-h-[220px] min-w-0 overflow-hidden rounded-xl border border-[var(--color-border-subtle)] border-t-2 ${meta.border} bg-[var(--color-surface-raised)]`}>
      <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[var(--color-border-subtle)]">
        <h2 className={`text-sm font-semibold ${meta.color}`}>P{meta.priority} · {meta.name}</h2>
        <span aria-label={`${tasks.length} tasks`} className="text-xs tabular-nums text-[var(--color-text-muted)]">{tasks.length}</span>
      </header>
      {store.matrixSettings.status !== 'completed' && (
        <form className="flex gap-2 p-2 border-b border-[var(--color-border-subtle)]" onSubmit={event => { event.preventDefault(); void add(); }}>
          <input aria-label={`New P${meta.priority} task title`} placeholder="Add task…" value={title} disabled={saving} onChange={event => setTitle(event.target.value)} className="min-w-0 flex-1 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] px-2 py-1.5 text-xs outline-none focus:border-[var(--color-brand)]" />
          <button type="submit" aria-label={`Add P${meta.priority} task`} disabled={!title.trim() || saving} className="rounded-md p-1.5 bg-[var(--color-brand)] text-white disabled:opacity-35 cursor-pointer disabled:cursor-default">
            {saving ? <Loader size={14} /> : <Plus className="h-4 w-4" />}
          </button>
        </form>
      )}
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {!tasks.length && <p className="px-2 py-8 text-center text-xs text-[var(--color-text-muted)]">No {store.matrixSettings.status === 'completed' ? 'completed ' : ''}tasks for this view.</p>}
        {tasks.map(task => <MatrixTask key={task.id} task={task} store={store} />)}
      </div>
    </section>
  );
});

export const MatrixView = observer(({ store }: { store: TasksStore }) => {
  const [dragged, setDragged] = useState<Task | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: matrixKeyboardCoordinates }));
  async function finishDrag({ active, over }: DragEndEvent) {
    setDragged(null);
    const priority = over?.data.current?.priority;
    if (typeof priority !== 'number') return;
    const task = store.matrixTasks.find(task => task.id === active.id);
    if (!task || task.priority === priority) return;
    const saved = await moveMatrixTask(store, task.id, priority);
    setAnnouncement(saved ? `${task.title} moved to P${priority} ${priorities[priority - 1].name}.` : 'Could not change priority. The previous priority has been restored.');
  }
  const groups = [store.matrixQ1Tasks, store.matrixQ2Tasks, store.matrixQ3Tasks, store.matrixQ4Tasks];
  return (
    <DndContext sensors={sensors} onDragStart={({ active }) => setDragged(store.matrixTasks.find(task => task.id === active.id) ?? null)} onDragCancel={() => setDragged(null)} onDragEnd={event => void finishDrag(event)} accessibility={{ announcements: {
      onDragStart: ({ active }) => `Picked up ${active.data.current?.title ?? 'task'}. Use arrow keys to choose a priority.`,
      onDragOver: ({ over }) => over ? `Over P${over.data.current?.priority} ${priorities.find(priority => priority.priority === over.data.current?.priority)?.name ?? ''}.` : 'Outside priority groups.',
      onDragEnd: () => 'Task dropped.', onDragCancel: () => 'Move cancelled. Priority unchanged.',
    }, screenReaderInstructions: { draggable: 'Press Space to pick up a task. Use the arrow keys to choose a priority group. Press Space to drop, or Escape to cancel.' } }}>
    <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)]">
      <header className="space-y-3 border-b border-[var(--color-border-subtle)] px-4 py-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h1 className="text-lg font-semibold">Priority matrix</h1><p className="text-xs text-[var(--color-text-muted)] mt-1">Drag tasks between groups to change priority.</p></div>
          <div aria-label="Matrix date" className="flex gap-1 rounded-lg bg-[var(--color-surface-soft)] p-1 text-xs">
            {(['today', 'tomorrow', 'all'] as const).map(date => <button key={date} type="button" aria-pressed={store.matrixSettings.date === date} onClick={() => store.setMatrixSettings({ date })} className={`rounded-md px-3 py-1 cursor-pointer ${store.matrixSettings.date === date ? 'bg-[var(--color-surface-raised)] text-[var(--color-brand)] shadow-xs font-semibold' : 'text-[var(--color-text-muted)]'}`}>{date === 'all' ? 'All dates' : date === 'today' ? 'Today' : 'Tomorrow'}</button>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-2">Status
            <select aria-label="Matrix status" value={store.matrixSettings.status} onChange={event => store.setMatrixSettings({ status: event.target.value as 'active' | 'completed' | 'all' })} className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-2 py-1.5">
              <option value="active">Active</option><option value="completed">Completed</option><option value="all">All tasks</option>
            </select>
          </label>
          {store.matrixSettings.date === 'today' && store.matrixSettings.status !== 'completed' && <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={store.matrixSettings.includeOverdue} onChange={event => store.setMatrixSettings({ includeOverdue: event.target.checked })} />Include overdue</label>}
          <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-2 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" /><input aria-label="Search matrix tasks" placeholder="Search tasks…" value={store.searchQuery} onChange={event => store.setSearchQuery(event.target.value)} className="w-full min-w-0 bg-transparent outline-none" />
          </label>
          <Tooltip content="Refresh matrix"><button type="button" aria-label="Refresh matrix" disabled={store.isLoadingTasks} onClick={() => void store.loadTasks()} className="rounded-md border border-[var(--color-border-subtle)] p-1.5 cursor-pointer disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5" /></button></Tooltip>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
          <span>{store.isLoadingTasks ? 'Loading…' : `${store.matrixTasks.length} tasks`}{store.matrixSettings.date !== 'all' && ` · ${store.matrixSettings.status === 'active' ? 'By due date' : store.matrixSettings.status === 'completed' ? 'By completion date' : 'Active by due date; completed by completion date'}`}</span>
          {store.matrixSettings.status !== 'completed' && <label className="flex items-center gap-2">Add tasks to
            <select aria-label="List for new matrix tasks" value={store.matrixQuickListId} onChange={event => store.setMatrixQuickList(event.target.value)} className="max-w-[170px] rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-2 py-1">
              <option value="inbox">Inbox</option>{store.lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
          </label>}
        </div>
      </header>
      {store.isLoadingTasks ? <div role="status" className="flex-1 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]"><Loader size={20} />Loading tasks…</div>
        : store.tasksError ? <div role="alert" className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-sm"><p>{store.tasksError}</p><button type="button" className="text-[var(--color-brand)] cursor-pointer" onClick={() => void store.loadTasks()}>Try again</button></div>
        : <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 gap-3 md:grid-rows-2">{priorities.map((priority, index) => <Quadrant key={priority.priority} store={store} meta={priority} tasks={groups[index]} />)}</div>}
    </div>
    <div role="status" className="sr-only">{announcement}</div>
    <DragOverlay dropAnimation={null}>{dragged && <div className="max-w-72 rounded-lg border border-[var(--color-brand)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm shadow-lg">{dragged.title}</div>}</DragOverlay>
    </DndContext>
  );
});
