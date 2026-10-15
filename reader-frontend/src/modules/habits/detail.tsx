import { useEffect, useId, useRef, useState, type RefObject, type UIEvent } from 'react';
import { Archive, ChevronLeft, ChevronRight, Download, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { addDays, dateRange, dayStatus, goalLabel, habitStats, localDate, monday, planOn, quantityLabel, quantityTotals, scheduled, scheduleLabel, type Habit } from '@reader/habit-core';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { BaseDialog } from '@modules/core/ui/primitives/dialog';
import { HabitIcon, HabitSelect, IconButton, formatDay } from './ui';
import { MOODS } from './log-form';

export function saveDownload(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function HabitDetail({ habit, loading, error, onRetry, busy, onClose, onEdit, onLog, onArchive, onDelete, mobile = false, suspended = false, editorOpen = false, returnFocus, actionError, onRetryAction }: {
  habit: Habit; loading: boolean; error: string; onRetry: () => void; busy: boolean; onClose: () => void; onEdit: () => void;
  onLog: (date: string) => void; onArchive: () => void; onDelete: () => void;
  mobile?: boolean; suspended?: boolean; editorOpen?: boolean; returnFocus?: RefObject<HTMLElement | null>; actionError?: string; onRetryAction?: () => void;
}) {
  const titleId = useId(), monthHeading = useRef<HTMLHeadingElement>(null), focusMonth = useRef(false), scrollPosition = useRef(0);
  const today = localDate(habit.timezone), [month, setMonth] = useState(today.slice(0, 7));
  const [view, setView] = useState<'month' | 'year' | 'journal'>('month'), [year, setYear] = useState(today.slice(0, 4));
  const stats = habitStats(habit, today), plan = planOn(habit, today) ?? habit.plans[0], nextPlan = habit.plans.find(item => item.effectiveFrom > today);
  const moveMonth = (amount: number) => { const date = new Date(`${month}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + amount); setMonth(date.toISOString().slice(0, 7)); };
  const monthStart = `${month}-01`, nextMonth = new Date(`${monthStart}T12:00:00Z`); nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const monthEnd = addDays(nextMonth.toISOString().slice(0, 10), -1);
  const calendar = dateRange(monday(monthStart), addDays(monday(monthEnd), 6));
  const firstYear = Math.min(Number(today.slice(0, 4)), Number(habit.plans[0].startDate.slice(0, 4)));
  const years = Array.from({ length: Number(today.slice(0, 4)) - firstYear + 1 }, (_, index) => String(firstYear + index));
  useEffect(() => {
    if (!focusMonth.current || view !== 'month') return;
    focusMonth.current = false; monthHeading.current?.focus();
  }, [view, month]);
  const calendarCell = (date: string, heatmap = false) => {
    const status = dayStatus(habit, date, today), log = habit.logs.find(item => item.date === date), actionable = date <= today && !habit.archivedAt && (scheduled(habit, date) || Boolean(log));
    const label = `${formatDay(date, { month: 'short', day: 'numeric', year: 'numeric' })}: ${status}${log && log.value ? `, ${log.value} ${planOn(habit, date)?.unit ?? ''}` : ''}`;
    return <Tooltip key={date} content={label}><button type="button" className={`habit-calendar-day status-${status} ${date === today ? 'is-today' : ''} ${!heatmap && !date.startsWith(month) ? 'is-outside' : ''}`} aria-label={label} disabled={!actionable || busy} onClick={() => onLog(date)}>{heatmap ? <span className="sr-only">{label}</span> : <>{Number(date.slice(8))}{log?.note && <i aria-label="Has note" />}</>}</button></Tooltip>;
  };
  const content = <>
    <div className="habit-detail-heading"><span className="habit-icon"><HabitIcon name={habit.icon} /></span><div><h2 id={titleId}>{habit.name}</h2><small>{habit.section}</small></div><IconButton label="Close habit details" onClick={onClose}><X size={17} /></IconButton></div>
    <div className="habit-detail-actions">{!habit.archivedAt && <IconButton label="Edit habit" disabled={busy} onClick={onEdit}><Pencil size={16} /></IconButton>}<IconButton label={habit.archivedAt ? 'Restore habit' : 'Archive habit'} disabled={busy} onClick={onArchive}>{habit.archivedAt ? <RotateCcw size={16} /> : <Archive size={16} />}</IconButton><IconButton label="Export habit history" disabled={loading || Boolean(error)} onClick={() => saveDownload(`habit-${habit.id}.json`, { format: 'do100x-habit', version: 1, habit })}><Download size={16} /></IconButton><IconButton label="Delete habit" disabled={busy} onClick={onDelete}><Trash2 size={16} /></IconButton></div>
    {actionError && <p role="alert" className="habits-error">{actionError}{onRetryAction && <button type="button" disabled={busy} onClick={onRetryAction}>Try again</button>}</p>}
    {habit.description && <p className="habit-description">{habit.description}</p>}
    <p className="habit-detail-schedule">{scheduleLabel(plan)} · {goalLabel(plan)}<small>{habit.timezone}{plan.endDate ? ` · Ends ${formatDay(plan.endDate)}` : ''}</small></p>
    {nextPlan && <p className="habit-pending-plan">New schedule begins {formatDay(nextPlan.effectiveFrom)}: {scheduleLabel(nextPlan)}, {goalLabel(nextPlan)}.</p>}
    {habit.archivedAt && <p className="habit-pending-plan">Archived. Your history is kept; future days are paused until you restore it.</p>}
    {error ? <p role="alert" className="habits-error">{error} <button onClick={onRetry}>Retry history</button></p> : loading ? <p role="status" className="habits-muted">Loading complete history…</p> : <>
      <div className="habit-stats"><div><strong>{stats.currentStreak}</strong><span>Current streak · {stats.streakUnit}</span></div><div><strong>{stats.bestStreak}</strong><span>Best streak · {stats.streakUnit}</span></div><div><strong>{stats.completionRate}%</strong><span>Completion</span></div><div><strong>{stats.completed}</strong><span>Days completed</span></div></div>
      <p className="habit-stat-note">Completion uses finished periods and achieved goals. Excused days don’t break daily streaks. {quantityTotals(habit, today).length > 0 && `Total logged: ${quantityTotals(habit, today).map(total => quantityLabel(total.value, total.unit)).join(' · ')}.`}</p>
      <div className="habit-tabs" role="group" aria-label="Habit history view">{(['month', 'year', 'journal'] as const).map(item => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item === 'month' ? 'Month' : item === 'year' ? 'Year' : 'Journal'}</button>)}</div>
      {view === 'month' && <><div className="habit-calendar-heading"><IconButton label="Previous month" disabled={month <= habit.plans[0].startDate.slice(0, 7)} onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></IconButton><h3 ref={monthHeading} tabIndex={-1}>{formatDay(monthStart, { month: 'long', year: 'numeric' })}</h3><IconButton label="Next month" disabled={month >= today.slice(0, 7)} onClick={() => moveMonth(1)}><ChevronRight size={16} /></IconButton></div><div className="habit-calendar-weekdays">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <span key={i}>{day}</span>)}</div><div className="habit-calendar">{calendar.map(date => calendarCell(date))}</div></>}
      {view === 'year' && <><div className="habit-year-picker"><HabitSelect label="Heatmap year" value={year} items={Object.fromEntries(years.map(item => [item, item]))} onChange={setYear} /></div><div className="habit-year-grid">{Array.from({ length: 12 }, (_, index) => {
        const start = `${year}-${String(index + 1).padStart(2, '0')}-01`, next = new Date(`${start}T12:00:00Z`); next.setUTCMonth(next.getUTCMonth() + 1);
        const end = addDays(next.toISOString().slice(0, 10), -1);
        const monthName = formatDay(start, { month: 'long', year: 'numeric' }), completed = dateRange(start, end).filter(date => dayStatus(habit, date, today) === 'done').length;
        return <button type="button" className="habit-mini-month" key={start} aria-label={`Open ${monthName}, ${completed} completed days`} onClick={() => { focusMonth.current = true; setMonth(start.slice(0, 7)); setView('month'); }}><span className="habit-mini-month-name">{formatDay(start, { month: 'short' })}<ChevronRight size={12} /></span><span className="habit-mini-month-grid" aria-hidden="true">{dateRange(monday(start), addDays(monday(end), 6)).map(date => <span key={date} className={date < start || date > end ? '' : `status-${dayStatus(habit, date, today)}`} />)}</span><span className="habit-mini-month-total">{completed} done</span></button>;
      })}</div></>}
      {view !== 'journal' && <div className="habit-legend"><span><i className="status-done" />Done</span><span><i className="status-partial" />Partial</span><span><i className="status-skipped" />Skipped</span><span><i className="status-missed" />Missed</span></div>}
      {view === 'journal' && <div className="habit-journal">{habit.logs.filter(log => log.status !== 'NONE').length === 0 ? <p className="habits-muted">Your check-ins and notes will appear here.</p> : [...habit.logs].reverse().filter(log => log.status !== 'NONE').map(log => <button key={log.id} disabled={Boolean(habit.archivedAt) || busy} onClick={() => onLog(log.date)}><span><strong>{formatDay(log.date, { month: 'short', day: 'numeric', year: 'numeric' })}</strong><small>{log.status === 'SKIPPED' ? 'Skipped' : `${log.value} ${planOn(habit, log.date)?.unit || 'check-in'}`}{log.mood ? ` · ${MOODS[log.mood - 1]}` : ''}</small></span>{log.note && <p>{log.note}</p>}</button>)}</div>}
    </>}
  </>;
  const panelProps = { className: `habit-detail habit-color-${habit.color}`, onScroll: (event: UIEvent<HTMLElement>) => { scrollPosition.current = event.currentTarget.scrollTop; } };
  if (!mobile) return <aside {...panelProps} ref={node => { if (node) node.scrollTop = scrollPosition.current; }} aria-labelledby={titleId}>{content}</aside>;
  // A parent popup may remain mounted while one of its nested dialogs is open.
  // Do not let that retained drawer cover an editor after a responsive change.
  if (suspended) return null;
  return <BaseDialog.Portal><BaseDialog.Backdrop className="habit-detail-backdrop" /><BaseDialog.Popup {...panelProps} className={`${panelProps.className} habit-detail-drawer`} ref={node => { if (node) node.scrollTop = scrollPosition.current; }} aria-modal="true" aria-labelledby={titleId} finalFocus={() => editorOpen ? false : returnFocus?.current?.isConnected ? returnFocus.current : document.querySelector<HTMLInputElement>('[aria-label="Search habits"]')}>{content}</BaseDialog.Popup></BaseDialog.Portal>;
}
