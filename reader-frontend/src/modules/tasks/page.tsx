import { useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { homePageRoute, settingsPageRoute } from '@boot/routes';
import {
  BookOpen,
  Play,
  Pause,
  Square,
  Clock,
} from 'lucide-react';
import { ThemeSelector } from '@modules/core/ui/components/theme-selector';
import { useAuthStore } from '@modules/auth/provider/store';
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
  const authStore = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      store.destroy();
    };
  }, [store]);

  const userInitial = authStore.optCurrentUser?.username
    ? authStore.optCurrentUser.username.charAt(0).toUpperCase()
    : 'U';

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--color-surface-canvas)] text-[var(--color-text-strong)] overflow-hidden select-none">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]/80 backdrop-blur px-4 flex items-center justify-between flex-shrink-0 z-20">
        {/* Left: App Logo & Beta */}
        <div className="flex items-center space-x-2.5">
          <Link
            to={homePageRoute}
            className="flex items-center space-x-2 text-[var(--color-text-strong)] hover:text-[var(--color-brand)] transition group cursor-pointer"
            title="Back to Reader Home"
          >
            <div className="w-8 h-8 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] flex items-center justify-center font-bold group-hover:scale-105 transition-transform shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight font-[family-name:var(--font-serif)]">Tasks</span>
          </Link>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-widest">
            Beta
          </span>
        </div>

        {/* Center: Live Running Timer Pill Widget (If active on server) */}
        {store.activeTimer && (
          <div className="flex items-center space-x-2 bg-[var(--color-surface-raised)] border border-rose-500/30 px-3.5 py-1.5 rounded-full shadow-xs animate-in fade-in duration-200">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="text-xs font-semibold max-w-[140px] truncate text-[var(--color-text-strong)]">
              {store.activeTimer.taskTitle}
            </span>
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
              {store.formattedTimerElapsed}
            </span>

            {/* Quick Actions in Header */}
            {store.isTimerRunning ? (
              <button
                type="button"
                onClick={() => store.pauseActiveTimer()}
                title="Pause timer"
                className="p-1 hover:bg-[var(--color-surface-soft)] rounded-full text-[var(--color-text-strong)] transition cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => store.resumeActiveTimer()}
                title="Resume timer"
                className="p-1 hover:bg-[var(--color-surface-soft)] rounded-full text-emerald-500 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => store.promptStopTimer()}
              title="Finish & log session"
              className="p-1 hover:bg-rose-500 hover:text-white rounded-full text-rose-500 transition cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>
        )}

        {/* Right: Theme Selector & User Profile Avatar */}
        <div className="flex items-center space-x-2.5">
          <ThemeSelector className="h-8 py-0 text-xs" />

          {/* User Profile Avatar */}
          {authStore.isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate(settingsPageRoute)}
              title={`Logged in as ${authStore.currentUser?.username || 'User'} (Settings)`}
              className="w-8 h-8 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-on-soft)] font-bold text-xs flex items-center justify-center hover:ring-2 hover:ring-[var(--color-brand)] transition cursor-pointer shadow-xs"
            >
              {userInitial}
            </button>
          )}
        </div>
      </header>

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
