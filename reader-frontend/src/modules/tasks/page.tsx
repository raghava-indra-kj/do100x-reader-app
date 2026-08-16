import { useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { homePageRoute } from '@boot/routes';
import {
  BookOpen,
  Play,
  Pause,
  Square,
  Clock,
} from 'lucide-react';
import { ThemeSelector } from '@modules/core/ui/components/theme-selector';
import { TasksStore } from './store';
import { TasksSidebar } from './components/sidebar';
import { TaskListPane } from './components/task-list-pane';
import { TaskDetailPane } from './components/task-detail-pane';
import { MatrixView } from './components/matrix-view';
import { TimeAnalyticsView } from './components/time-analytics-view';
import { StopTimerDialog } from './components/stop-timer-dialog';
import { ListDialog } from './components/list-dialog';
import { SessionDialog } from './components/session-dialog';

export default observer(function TasksPage() {
  const store = useMemo(() => new TasksStore(), []);

  useEffect(() => {
    return () => {
      store.destroy();
    };
  }, [store]);

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-border bg-card/60 backdrop-blur px-4 flex items-center justify-between flex-shrink-0 z-20">
        {/* Left: Brand & Home Navigation */}
        <div className="flex items-center space-x-3">
          <Link
            to={homePageRoute}
            className="flex items-center space-x-2 text-foreground/80 hover:text-foreground transition group"
            title="Go to Reader Knowledge Base"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight hidden sm:inline">Reader</span>
          </Link>

          <span className="text-muted-foreground/40 font-light">/</span>

          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
            Tasks & Time Tracker
          </span>
        </div>

        {/* Center: Live Running Timer Pill Widget (If active on server) */}
        {store.activeTimer && (
          <div className="flex items-center space-x-2 bg-card border border-rose-500/30 px-3 py-1.5 rounded-full shadow-sm animate-in fade-in duration-200">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-xs font-semibold max-w-[150px] truncate text-foreground">
              {store.activeTimer.taskTitle}
            </span>
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
              {store.formattedTimerElapsed}
            </span>

            {/* Quick Actions in Header */}
            {store.isTimerRunning ? (
              <button
                type="button"
                onClick={() => store.pauseActiveTimer()}
                title="Pause timer"
                className="p-1 hover:bg-muted rounded-full text-foreground/80 hover:text-foreground"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => store.resumeActiveTimer()}
                title="Resume timer"
                className="p-1 hover:bg-muted rounded-full text-emerald-500"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => store.promptStopTimer()}
              title="Finish & log session"
              className="p-1 hover:bg-rose-500 hover:text-white rounded-full text-rose-500 transition"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>
        )}

        {/* Right: Theme Selector */}
        <div className="flex items-center space-x-2">
          <ThemeSelector className="h-8 py-0 text-xs" />
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
    </div>
  );
});
