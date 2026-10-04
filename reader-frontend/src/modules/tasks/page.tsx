import { useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Play,
  Pause,
  Square,
  Clock,
} from 'lucide-react';
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

export default observer(function TasksPage() {
  const store = useMemo(() => new TasksStore(), []);

  useEffect(() => {
    return () => {
      store.destroy();
    };
  }, [store]);

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

            {/* Active timer actions */}
            {store.isTimerRunning ? (
              <button
                type="button"
                onClick={() => store.pauseActiveTimer()}
                title="Pause timer"
                aria-label="Pause timer"
                className="p-1 hover:bg-[var(--color-surface-soft)] rounded-full text-[var(--color-text-strong)] transition cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => store.resumeActiveTimer()}
                title="Resume timer"
                aria-label="Resume timer"
                className="p-1 hover:bg-[var(--color-surface-soft)] rounded-full text-emerald-500 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => store.promptStopTimer()}
              title="Stop and save time"
              aria-label="Stop and save time"
              className="p-1 hover:bg-rose-500 hover:text-white rounded-full text-rose-500 transition cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>
        </AppBarTools>
        )} />

      {/* Main Workspace (3-Column Layout) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 1. Sidebar */}
        <TasksSidebar store={store} />

        {/* 2. Main Content (List / Matrix / Analytics) */}
        {store.currentView === 'matrix' ? (
          <MatrixView store={store} />
        ) : store.currentView === 'analytics' ? (
          <TimeAnalyticsView store={store} />
        ) : (
          <TaskListPane store={store} />
        )}

        {/* 3. Task Detail / Timer Panel */}
        <TaskDetailPane store={store} />
      </div>

      {/* Dialogs */}
      <StopTimerDialog store={store} />
      <ListDialog store={store} />
      <SessionDialog store={store} />
      <ConfirmDialog store={store} />
    </div>
  );
});
