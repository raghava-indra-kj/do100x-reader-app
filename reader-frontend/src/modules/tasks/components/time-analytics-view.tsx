import { observer } from 'mobx-react-lite';
import { Clock, BarChart2, Flame, Award, Layers } from 'lucide-react';
import type { TasksStore } from '../store';

interface Props {
  store: TasksStore;
}

export const TimeAnalyticsView = observer(({ store }: Props) => {
  const data = store.analyticsData;

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0 border-r border-border p-6 overflow-y-auto space-y-6">
      {/* Analytics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Time & Focus Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detailed breakdown of how your time is allocated across projects and tasks.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center space-x-1 bg-muted p-1 rounded-xl text-xs font-semibold">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => store.loadAnalytics(days)}
              className={`px-3 py-1 rounded-lg transition ${
                store.analyticsPeriodDays === days
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {store.isLoadingAnalytics || !data ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading analytics...</div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-3 gap-4">
            {/* Total Time */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Time Tracked</span>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">{data.totalFormatted}</div>
              <p className="text-[11px] text-muted-foreground">Over the past {store.analyticsPeriodDays} days</p>
            </div>

            {/* Sessions Count */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Sessions Logged</span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">{data.sessionsCount}</div>
              <p className="text-[11px] text-muted-foreground">Focus stopwatch sessions</p>
            </div>

            {/* Top Project */}
            <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">Top Project</span>
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground truncate">
                {data.byList[0]?.name || 'None'}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {data.byList[0] ? `${Math.round(data.byList[0].seconds / 3600)}h focused` : 'No data yet'}
              </p>
            </div>
          </div>

          {/* Breakdown by Lists / Projects */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm flex items-center space-x-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Time by Project / List</span>
              </h2>
            </div>

            {data.byList.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground italic">No time sessions recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {data.byList.map((item) => {
                  const hours = Math.round((item.seconds / 3600) * 10) / 10;
                  const pct = data.totalSeconds > 0 ? Math.round((item.seconds / data.totalSeconds) * 100) : 0;
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 font-medium">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name}</span>
                        </div>
                        <div className="space-x-2 text-muted-foreground">
                          <strong className="text-foreground">{hours}h</strong>
                          <span>({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Breakdown by Top Tasks */}
          <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                <span>Top Tasks by Time Spent</span>
              </h2>
            </div>

            {data.byTask.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground italic">No tasks with recorded time.</div>
            ) : (
              <div className="divide-y divide-border">
                {data.byTask.map((task, idx) => {
                  const hours = Math.round((task.seconds / 3600) * 10) / 10;
                  const pct = data.totalSeconds > 0 ? Math.round((task.seconds / data.totalSeconds) * 100) : 0;
                  return (
                    <div key={task.taskId} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <span className="font-bold text-muted-foreground w-4">{idx + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{task.title}</p>
                          <span className="text-[10px] text-muted-foreground">{task.listName}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="font-bold text-foreground">{hours}h</span>
                        <p className="text-[10px] text-muted-foreground">{pct}% of total</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});
