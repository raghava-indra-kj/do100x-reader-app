import { useEffect, useMemo, useState, useId } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@modules/auth/provider/store';
import { observer } from 'mobx-react-lite';
import {
  Play,
  Pause,
  Square,
  Clock,
  PanelLeft,
  X,
} from 'lucide-react';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Button } from '@modules/core/ui/primitives/button';
import { AppBarLayout } from '@modules/core/ui/components/appbar/appbar-layout';
import { AppBarTools } from '@modules/core/ui/components/appbar/appbar-tools';
import { TasksStore } from './store';
import { TasksSidebar } from './components/sidebar';
import { TaskListPane } from './components/task-list-pane';
import { TaskDetailPane } from './components/task-detail-pane';
import { MatrixView } from './components/matrix-view';
import { TimeAnalyticsView } from './components/time-analytics-view';
import { StopTimerDialog } from './components/stop-timer-dialog';
import { ListDialog } from './components/list-dialog';
import { SessionDialog } from './components/session-dialog';
import { ConfirmDialog } from './components/confirm-dialog';

export const TasksWorkspace = observer(function TasksWorkspace() {
  const store = useMemo(() => new TasksStore(), []);
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('task');
  const [navigationOpen, setNavigationOpen] = useState(false), navigationTitle = useId();

  useEffect(() => {
    void store.init();
    const refresh = () => { void store.refreshWorkspace(); };
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      store.destroy();
    };
  }, [store]);
  useEffect(() => {
    if (!selectedId) return;
    void store.selectTask(selectedId, { showInList: true });
    setParams(previous => { const next = new URLSearchParams(previous); next.delete('task'); return next; }, { replace: true });
  }, [selectedId, store, setParams]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] overflow-hidden select-none">
      <AppBarLayout app="tasks" tools={store.activeTimer && (
        <AppBarTools label="Active timer">
          <div className="flex items-center space-x-2 bg-[var(--color-surface-raised)] border border-rose-500/30 px-2 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-xs font-semibold max-w-[140px] truncate text-[var(--color-text-strong)]">
              {store.activeTimer.taskTitle}
            </span>
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
              {store.formattedTimerElapsed}
            </span>

            <Button variant="ghost" size="sm" iconOnly disabled={store.isTimerBusy} tooltip={store.isTimerRunning ? 'Pause timer' : 'Resume timer'} aria-label={store.isTimerRunning ? 'Pause timer' : 'Resume timer'} onClick={() => { if (store.isTimerRunning) void store.pauseActiveTimer(); else void store.resumeActiveTimer(); }}>{store.isTimerRunning ? <Pause size={14} /> : <Play size={14} />}</Button>
            <Button variant="ghost" size="sm" iconOnly disabled={store.isTimerBusy} tooltip="Stop and save time" aria-label="Stop and save time" onClick={() => store.promptStopTimer()}><Square size={13} /></Button>
          </div>
        </AppBarTools>
        )} />

      <div className="md:hidden px-3 py-2 border-b border-[var(--color-border-subtle)]"><Button size="sm" variant="ghost" startIcon={<PanelLeft size={16} />} onClick={() => setNavigationOpen(true)}>Views & lists</Button></div>
      {navigationOpen && <Dialog open onOpenChange={setNavigationOpen} labelledBy={navigationTitle} className="p-0 w-64 max-h-[85dvh] overflow-y-auto"><div className="flex items-center justify-between p-3"><h2 id={navigationTitle} className="text-sm font-semibold">Views & lists</h2><Button iconOnly size="sm" variant="ghost" tooltip="Close navigation" aria-label="Close navigation" onClick={() => setNavigationOpen(false)}><X size={16} /></Button></div><TasksSidebar store={store} onNavigate={() => setNavigationOpen(false)} /></Dialog>}
      {/* Main Workspace */}
      <div className="relative flex-1 flex overflow-hidden min-h-0">
        {/* 1. Sidebar */}
        <div className="hidden md:flex"><TasksSidebar store={store} /></div>

        {/* 2. Main Content (List / Matrix / Analytics) */}
        <div className={`flex-1 min-w-0 min-h-0 ${store.selectedTaskId ? 'hidden xl:flex' : 'flex'}`}>
        {store.currentView === 'matrix' ? (
          <MatrixView store={store} />
        ) : store.currentView === 'analytics' ? (
          <TimeAnalyticsView store={store} />
        ) : (
          <TaskListPane store={store} />
        )}
        </div>

        {/* 3. Task Detail / Timer Panel */}
        {store.selectedTaskId && (
          <aside aria-label="Selected task details" className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[640px] border-l border-[var(--color-border-subtle)] shadow-lg xl:static xl:w-[45%] xl:max-w-[720px] xl:shadow-none shrink-0">
            <TaskDetailPane key={store.selectedTaskId} store={store} />
          </aside>
        )}
      </div>

      {/* Dialogs */}
      <StopTimerDialog store={store} />
      <ListDialog store={store} />
      <SessionDialog store={store} />
      <ConfirmDialog store={store} />
    </div>
  );
});
export default observer(function TasksPage() { const auth = useAuthStore(); return <TasksWorkspace key={auth.currentUser.id} />; });
