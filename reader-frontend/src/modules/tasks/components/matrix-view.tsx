import { observer } from 'mobx-react-lite';
import { Check, Plus, Clock, Calendar } from 'lucide-react';
import type { TasksStore } from '../store';
import type { Task } from '@domain/tasks/models/task';
import { useState } from 'react';

interface Props {
  store: TasksStore;
}

export const MatrixView = observer(({ store }: Props) => {
  const [q1Input, setQ1Input] = useState('');
  const [q2Input, setQ2Input] = useState('');
  const [q3Input, setQ3Input] = useState('');
  const [q4Input, setQ4Input] = useState('');

  const renderQuadrant = (
    title: string,
    subtitle: string,
    priority: number,
    tasks: Task[],
    inputVal: string,
    setInputVal: (val: string) => void,
    colorClasses: { bg: string; border: string; headerBg: string; badge: string; text: string }
  ) => {
    return (
      <div className={`flex flex-col h-full rounded-2xl border ${colorClasses.border} ${colorClasses.bg} overflow-hidden shadow-sm`}>
        {/* Quadrant Header */}
        <div className={`p-3.5 border-b ${colorClasses.border} ${colorClasses.headerBg} flex items-center justify-between`}>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`font-bold text-sm ${colorClasses.text}`}>{title}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorClasses.badge}`}>
                {tasks.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Quick Add Input */}
        <div className="p-2.5 border-b border-border/60 bg-background/50">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder={`+ Add to ${title}...`}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && inputVal.trim()) {
                  await store.updateTaskProperties(
                    (
                      await store.createQuickTask()
                    ) as any,
                    {}
                  );
                }
              }}
              className="flex-1 bg-background text-xs px-2.5 py-1.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
            <button
              type="button"
              onClick={async () => {
                if (!inputVal.trim()) return;
                store.setQuickTaskTitle(inputVal.trim());
                store.setQuickTaskPriority(priority);
                await store.createQuickTask();
                setInputVal('');
              }}
              disabled={!inputVal.trim()}
              className="p-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground/60 italic">
              No tasks in this quadrant
            </div>
          ) : (
            tasks.map((task) => {
              const isSelected = store.selectedTaskId === task.id;
              return (
                <div
                  key={task.id}
                  onClick={() => store.selectTask(task.id)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer select-none bg-card ${
                    isSelected
                      ? 'border-primary shadow-sm ring-1 ring-primary/20'
                      : 'border-border hover:border-foreground/20 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        store.toggleTaskStatus(task);
                      }}
                      className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center transition-all flex-shrink-0 ${
                        task.isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-muted-foreground/40 hover:border-emerald-500'
                      }`}
                    >
                      {task.isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium leading-snug truncate ${task.isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {task.dueDate && (
                          <span className="flex items-center space-x-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{new Date(task.dueDate).toISOString().slice(0, 10)}</span>
                          </span>
                        )}
                        {task.totalTimeFormatted && (
                          <span className="flex items-center space-x-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{task.totalTimeFormatted}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-w-0 border-r border-border p-4 overflow-hidden">
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">Eisenhower Priority Matrix</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Organize and prioritize your daily focus based on urgency and importance.
        </p>
      </div>

      {/* 2x2 Matrix Grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 min-h-0">
        {/* Q1: Urgent & Important */}
        {renderQuadrant(
          'Q1: Urgent & Important',
          'Do First — Critical & time-sensitive goals',
          1,
          store.matrixQ1Tasks,
          q1Input,
          setQ1Input,
          {
            bg: 'bg-red-500/5',
            border: 'border-red-500/20',
            headerBg: 'bg-red-500/10',
            badge: 'bg-red-500 text-white',
            text: 'text-red-600 dark:text-red-400',
          }
        )}

        {/* Q2: Important, Not Urgent */}
        {renderQuadrant(
          'Q2: Important, Not Urgent',
          'Schedule — High impact long-term goals',
          2,
          store.matrixQ2Tasks,
          q2Input,
          setQ2Input,
          {
            bg: 'bg-amber-500/5',
            border: 'border-amber-500/20',
            headerBg: 'bg-amber-500/10',
            badge: 'bg-amber-500 text-white',
            text: 'text-amber-600 dark:text-amber-400',
          }
        )}

        {/* Q3: Urgent, Not Important */}
        {renderQuadrant(
          'Q3: Urgent, Not Important',
          'Delegate / Quick — Interruptions & errands',
          3,
          store.matrixQ3Tasks,
          q3Input,
          setQ3Input,
          {
            bg: 'bg-blue-500/5',
            border: 'border-blue-500/20',
            headerBg: 'bg-blue-500/10',
            badge: 'bg-blue-500 text-white',
            text: 'text-blue-600 dark:text-blue-400',
          }
        )}

        {/* Q4: Not Urgent, Not Important */}
        {renderQuadrant(
          'Q4: Not Urgent & Not Important',
          'Eliminate / Backlog — Low value distractions',
          4,
          store.matrixQ4Tasks,
          q4Input,
          setQ4Input,
          {
            bg: 'bg-slate-500/5',
            border: 'border-slate-500/20',
            headerBg: 'bg-slate-500/10',
            badge: 'bg-slate-500 text-white',
            text: 'text-slate-600 dark:text-slate-400',
          }
        )}
      </div>
    </div>
  );
});
