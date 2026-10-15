import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { Bell, BellOff, CalendarDays, ChevronLeft, ChevronRight, Clock3, GripVertical, ListTodo, PanelLeftClose, PanelLeftOpen, Plus, RefreshCw, Search, Settings2, Sprout } from 'lucide-react';
import { addDays, addWallMinutes, datesBetween, instantAt, validDate, wallAt, wallMinutes } from '@reader/calendar-core';
import { formatTrackedDuration } from '@domain/tasks/models/duration';
import { localDate, planOn, type Habit } from '@reader/habit-core';
import { AppBar } from '@modules/core/ui/components/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { useAuthStore } from '@modules/auth/provider/store';
import { habitsApi } from '@modules/habits/api';
import { LogForm } from '@modules/habits/log-form';
import '@modules/habits/habits.css';
import { calendarApi, type CalendarRange, type CalendarTask, type CalendarView } from './api';
import { calendarItems, defaultPreferences, eventDraft, formatDate, movePeriod, taskScheduleTarget, viewLabels, viewRange, type CalendarItem } from './model';
import { CalendarDialog, CalendarPlanningPanel, CalendarPlanningRoot, CalendarSelect, IconButton } from './ui';
import { EventForm, type EventEditor } from './event-form';
import { CalendarSettings } from './settings';
import { CalendarSources } from './sources';
import { AgendaView, beginDrag, MonthView, TimeGrid, YearView } from './views';
import { useCalendarReminders } from './reminders';
import { refreshSources } from './source-refresh';
import './calendar.css';

function CalendarApp({ userId }: { userId: string }) {
  const [params, setParams] = useSearchParams();
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [preferences, setPreferences] = useState(() => defaultPreferences(localZone)), [settingsVersion, setSettingsVersion] = useState(0), [ready, setReady] = useState(false);
  const [view, setView] = useState<CalendarView>('week'), [date, setDate] = useState(() => validDate(params.get('date') ?? '') ? params.get('date')! : wallAt(new Date(), localZone).slice(0, 10));
  const [clock, setClock] = useState(() => new Date()), [data, setData] = useState<CalendarRange | null>(null);
  const [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [query, setQuery] = useState(''), [list, setList] = useState('all'), [showSidebar, setShowSidebar] = useState(() => window.innerWidth >= 900);
  const [kinds, setKinds] = useState({ event: true, task: true, habit: true, focus: false }), [showCompleted, setShowCompleted] = useState(true);
  const [tray, setTray] = useState<CalendarTask[]>([]), [cursor, setCursor] = useState<string | null>(null), [taskSearch, setTaskSearch] = useState(''), [trayLoading, setTrayLoading] = useState(false), [trayError, setTrayError] = useState('');
  const [editor, setEditor] = useState<EventEditor | null>(null), [settings, setSettings] = useState(false), [inspected, setInspected] = useState<CalendarItem | null>(null), [log, setLog] = useState<{ habit: Habit; date: string; revision: number } | null>(null);
  const mutation = useRef(false), traySequence = useRef(0), mounted = useRef(true);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const [mobileSidebar, setMobileSidebar] = useState(() => window.matchMedia('(max-width: 899px)').matches);
  const planningTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 899px)');
    const update = () => {
      setMobileSidebar(media.matches);
      // Do not mount a new modal drawer over an editor already open on desktop.
      // Planning can be reopened explicitly after entering the compact layout.
      if (media.matches) setShowSidebar(false);
    };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const subscriptionIds = (data?.sources ?? []).filter(source => source.enabled && source.kind === 'subscription').map(source => source.id).join(',');
  const refreshData = useCallback(() => setRefresh(value => value + 1), []);
  const reminders = useCalendarReminders(userId, preferences.timeZone, setNotice);
  const today = wallAt(clock, preferences.timeZone).slice(0, 10), range = viewRange(date, view, preferences.firstDay);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!subscriptionIds) return;
    let stopped = false, running = false;
    const check = async () => {
      if (running || stopped || document.visibilityState !== 'visible') return;
      running = true;
      try {
        const failures = await refreshSources(subscriptionIds.split(','), id => calendarApi.refreshSource({ id }), () => stopped);
        if (!stopped) {
          if (failures) setNotice('Some subscribed calendars could not refresh. Their last saved events are still available.');
          refreshData();
        }
      }
      finally { running = false; }
    };
    void check(); const interval = setInterval(() => void check(), 15 * 60000);
    return () => { stopped = true; clearInterval(interval); };
  }, [subscriptionIds, refreshData]);
  useEffect(() => {
    if (ready) return;
    const controller = new AbortController();
    void calendarApi.preferences(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const value = result.version ? result.preferences : defaultPreferences(localZone);
      setPreferences(value); setSettingsVersion(result.version); setView(window.matchMedia('(max-width: 700px)').matches && value.defaultView === 'week' ? 'day' : value.defaultView); setKinds({ event: true, task: true, habit: value.showHabits, focus: value.showFocus }); setShowCompleted(value.showCompleted); setReady(true); setError('');
    }).catch(error => { if (!controller.signal.aborted) { setError(error instanceof Error ? error.message : 'Couldn’t load Calendar settings.'); setLoading(false); } });
    return () => controller.abort();
  }, [localZone, ready, refresh]);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController(); setLoading(true); setError('');
    void calendarApi.range(range.from, range.to, preferences.timeZone, controller.signal, list).then(result => { if (!controller.signal.aborted) { setData(result); setLoading(false); } }).catch(error => { if (!controller.signal.aborted) { setError(error instanceof Error ? error.message : 'Couldn’t load Calendar.'); setLoading(false); } });
    return () => controller.abort();
  }, [ready, range.from, range.to, preferences.timeZone, refresh, list]);
  useEffect(() => {
    if (!data || data.version <= settingsVersion) return;
    setPreferences(data.preferences); setSettingsVersion(data.version);
    setKinds(previous => ({ ...previous, habit: data.preferences.showHabits, focus: data.preferences.showFocus }));
    setShowCompleted(data.preferences.showCompleted);
  }, [data, settingsVersion]);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController(), sequence = ++traySequence.current; setTrayLoading(true); setTrayError('');
    const timer = setTimeout(() => { void calendarApi.tasks(taskSearch, undefined, controller.signal, list).then(result => {
      if (!controller.signal.aborted && sequence === traySequence.current) { setTray(result.items); setCursor(result.nextCursor); setTrayLoading(false); }
    }).catch(error => { if (!controller.signal.aborted && sequence === traySequence.current) { setTrayError(error instanceof Error ? error.message : 'Couldn’t load tasks.'); setTrayLoading(false); } }); }, 180);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [ready, taskSearch, refresh, list]);
  useEffect(() => {
    const focus = () => refreshData(), tick = setInterval(() => setClock(new Date()), 30000);
    window.addEventListener('focus', focus); return () => { clearInterval(tick); window.removeEventListener('focus', focus); };
  }, [refreshData]);
  const taskParam = params.get('task');
  useEffect(() => {
    if (!ready || !taskParam) return;
    const controller = new AbortController();
    void calendarApi.taskSchedule(taskParam, controller.signal).then(({ task, events }) => {
      if (controller.signal.aborted) return;
      const day = task.dueDate?.slice(0, 10) ?? today;
      const target = taskScheduleTarget(events), event = target?.event, occurrence = target?.occurrence;
      setDate(occurrence ? (occurrence.allDay ? occurrence.start : wallAt(occurrence.startInstant, preferences.timeZone)).slice(0, 10) : day);
      setEditor(previous => previous ?? (event ? { event, ...(occurrence ? { occurrence } : {}), draft: { ...event, ...(occurrence ? { start: occurrence.start, end: occurrence.end, allDay: occurrence.allDay } : {}) } } : { draft: eventDraft(`${day}T${task.dueTime || '09:00'}`, preferences, task) }));
      setParams(previous => { const next = new URLSearchParams(previous); next.delete('task'); return next; }, { replace: true });
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Couldn’t load this task.'); });
    return () => controller.abort();
  }, [ready, taskParam, preferences.timeZone, refresh]);
  useEffect(() => {
    if (data && !['all', 'inbox'].includes(list) && !data.lists.some(item => item.id === list)) setList('all');
  }, [data, list]);
  const currentData = data?.from === range.from && data.to === range.to && data.timeZone === preferences.timeZone && (data.listId ?? 'all') === list ? data : null;
  const allItems = useMemo(() => currentData ? calendarItems(currentData, preferences, clock) : [], [currentData, preferences, clock]);
  const items = allItems.filter(item => kinds[item.kind] && (showCompleted || !item.completed || item.kind === 'focus') && (list === 'all' || item.listId === (list === 'inbox' ? null : list) && (item.kind === 'task' || item.kind === 'focus')) && item.title.toLowerCase().includes(query.trim().toLowerCase()));
  const disabled = busy || loading || !ready || !currentData;
  async function run(action: () => Promise<unknown>, message?: string) {
    if (mutation.current) return; mutation.current = true; setBusy(true); setError('');
    try { await action(); if (mounted.current) { if (message) setNotice(message); refreshData(); } }
    catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : 'Couldn’t save this change.'); }
    finally { mutation.current = false; if (mounted.current) setBusy(false); }
  }
  function openEvent(item: CalendarItem) {
    if (item.event && item.occurrence && !item.habit) setEditor({ event: item.event, occurrence: item.occurrence, draft: { ...item.event, start: item.occurrence.start, end: item.occurrence.end, allDay: item.occurrence.allDay } });
    else setInspected(item);
  }
  function newEvent(wall: string, allDay = false, task?: CalendarTask, habit?: Habit) {
    const draft = eventDraft(wall, preferences, task, habit);
    if (allDay) { draft.start = `${wall.slice(0, 10)}T00:00`; draft.end = `${addDays(wall.slice(0, 10), 1)}T00:00`; draft.allDay = true; }
    setEditor({ draft, initialListId: list === 'all' || list === 'inbox' ? null : list });
  }
  function drop(key: string, wall: string, allDay: boolean, resize: boolean) {
    if (disabled) return;
    const task = key.startsWith('unscheduled/') ? tray.find(task => `unscheduled/${task.id}` === key) : undefined;
    if (task) { newEvent(wall, allDay, task); return; }
    const item = allItems.find(item => item.key === key); if (!item || item.kind === 'focus' || item.external) return;
    if (item.event && item.occurrence) {
      const occurrence = item.occurrence;
      // Month drops move dates while preserving an existing clock time/all-day choice.
      if (view === 'month') { wall = `${wall.slice(0, 10)}T${item.allDay ? '00:00' : item.start.slice(11)}`; allDay = item.allDay; }
      const at = allDay ? null : instantAt(wall, preferences.timeZone);
      if (!allDay && !at) { setError('That local time does not exist because the clocks change. Choose another time.'); return; }
      const target = allDay ? `${wall.slice(0, 10)}T00:00` : wallAt(at!, item.event.timeZone);
      const start = resize ? occurrence.start : target;
      const end = resize ? target : allDay ? addWallMinutes(target, Math.max(1440, Math.ceil(wallMinutes(occurrence.start, occurrence.end) / 1440) * 1440)) : addWallMinutes(target, occurrence.allDay ? preferences.defaultMinutes : wallMinutes(occurrence.start, occurrence.end));
      void run(() => calendarApi.occurrence(item.event!, occurrence, { start, end, allDay: resize ? occurrence.allDay : allDay }), 'Schedule updated.');
    } else if (item.task) void run(() => calendarApi.updateTask(item.task!, { dueDate: wall.slice(0, 10), dueTime: view === 'month' ? item.task!.dueTime : allDay ? null : wall.slice(11) }), 'Task deadline updated.');
    else if (item.habit) newEvent(wall, allDay, undefined, item.habit);
  }
  const viewProps = { items, date, today, preferences, disabled, onOpen: openEvent, onCreate: newEvent, onDay: (day: string) => { setDate(day); setView('day'); }, onDrop: drop };
  async function moreTasks() {
    if (!cursor || trayLoading) return;
    const sequence = ++traySequence.current; setTrayLoading(true);
    try { const result = await calendarApi.tasks(taskSearch, cursor, undefined, list); if (mounted.current && sequence === traySequence.current) { setTray(previous => [...previous, ...result.items.filter(task => !previous.some(existing => existing.id === task.id))]); setCursor(result.nextCursor); } }
    catch (error) { if (mounted.current && sequence === traySequence.current) setTrayError(error instanceof Error ? error.message : 'Couldn’t load more tasks.'); }
    finally { if (mounted.current && sequence === traySequence.current) setTrayLoading(false); }
  }
  const title = view === 'year' ? date.slice(0, 4) : view === 'day' ? formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' }) : view === 'month' ? formatDate(date, { month: 'long', year: 'numeric' }) : `${formatDate(range.from)} – ${formatDate(addDays(range.to, -1), { month: 'short', day: 'numeric', year: 'numeric' })}`;
  return <CalendarPlanningRoot open={mobileSidebar && showSidebar} onClose={() => setShowSidebar(false)}><div className="calendar-page"><AppBar /><div className={`calendar-workspace ${showSidebar && !mobileSidebar ? 'has-sidebar' : ''}`}>
    {showSidebar && <CalendarPlanningPanel mobile={mobileSidebar} returnFocus={planningTrigger}><div className="calendar-sidebar-heading"><CalendarDays size={19} /><strong>Planning</strong><IconButton label="Hide planning sidebar" onClick={() => setShowSidebar(false)}><PanelLeftClose size={16} /></IconButton></div><label className="calendar-jump-date"><span>Jump to date</span><input type="date" aria-label="Go to date" min="1901-01-01" max="9997-01-01" value={date} onChange={e => { if (validDate(e.currentTarget.value) && e.currentTarget.value >= '1901-01-01' && e.currentTarget.value <= '9997-01-01') setDate(e.currentTarget.value); }} /></label>
      <nav className="calendar-app-links" aria-label="Planning apps"><Link to="/tasks"><ListTodo size={16} />Tasks</Link><Link to="/habits"><Sprout size={16} />Habits</Link></nav>
      <div className="calendar-filter-heading"><span>My calendar</span><IconButton label="Calendars & files" disabled={!ready} onClick={() => setSourcesOpen(true)}><CalendarDays size={16} /></IconButton></div><div className="calendar-type-filters">{([['event', 'Events', CalendarDays], ['task', 'Tasks', ListTodo], ['habit', 'Habits', Sprout], ['focus', 'Focus history', Clock3]] as const).map(([kind, label, Icon]) => <label key={kind} className={`calendar-filter-${kind} ${kinds[kind] ? 'is-enabled' : ''}`}><input type="checkbox" checked={kinds[kind]} onChange={e => setKinds(previous => ({ ...previous, [kind]: e.target.checked }))} /><Icon size={15} />{label}</label>)}<label className="calendar-completed-filter"><input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />Include completed</label></div>
      <CalendarSelect label="Filter task list" value={list} items={{ all: 'All calendars & lists', inbox: 'Inbox tasks', ...Object.fromEntries((data?.lists ?? []).map(list => [list.id, list.name])) }} onChange={setList} />
      <div className="calendar-tray-heading"><h2>Unscheduled <span>{tray.length}{cursor ? '+' : ''}</span></h2><small>Drag a task onto your calendar.</small></div><div className="calendar-search"><Search size={14} /><input aria-label="Find unscheduled tasks" placeholder="Find a task…" value={taskSearch} maxLength={200} onChange={e => setTaskSearch(e.target.value)} /></div>
      <div className="calendar-tray" aria-busy={trayLoading}>{trayError ? <p role="alert" className="calendar-error">{trayError}<button onClick={refreshData}>Retry</button></p> : tray.filter(task => list === 'all' || task.listId === (list === 'inbox' ? null : list)).map(task => <div className="calendar-tray-task" key={task.id} draggable={!disabled && !trayLoading} onDragStart={event => beginDrag(event, `unscheduled/${task.id}`)}><GripVertical size={14} /><div><Link to={`/tasks?task=${task.id}`}>{task.title}</Link><small>{data?.lists.find(list => list.id === task.listId)?.name ?? 'Inbox'}</small></div><IconButton label={`Schedule ${task.title}`} disabled={disabled || trayLoading} onClick={() => newEvent(`${date}T09:00`, false, task)}><Plus size={15} /></IconButton></div>)}{trayLoading && <p className="calendar-help" role="status">Loading tasks…</p>}{!trayLoading && !trayError && !tray.length && <p className="calendar-help">{taskSearch ? 'No matching tasks.' : 'Everything has a date. New undated tasks will appear here.'}</p>}{cursor && <button className="calendar-more" onClick={() => void moreTasks()} disabled={trayLoading}>Load more tasks</button>}</div>
      <div className="calendar-sidebar-footer"><button onClick={() => void reminders.toggle()}>{reminders.enabled ? <Bell size={15} /> : <BellOff size={15} />}{reminders.enabled ? 'Reminders on' : 'Enable reminders'}</button><small>Notifications while Calendar is open.</small></div>
    </CalendarPlanningPanel>}
    <main className="calendar-main"><header className="calendar-toolbar">
      <div className="calendar-date-navigation">
        {(!showSidebar || mobileSidebar) && <Button ref={planningTrigger} type="button" size="sm" variant="ghost" iconOnly tooltip="Show planning sidebar" aria-label="Show planning sidebar" aria-expanded={showSidebar} onClick={() => setShowSidebar(true)}><PanelLeftOpen size={18} /></Button>}
        <div className="calendar-period-title"><h1>{view === 'week' ? formatDate(date, { month: 'long', year: 'numeric' }) : title}</h1>{view === 'week' && <span>{formatDate(range.from)} – {formatDate(addDays(range.to, -1))}</span>}</div>
      </div>
      <div className="calendar-toolbar-actions">
        <div className="calendar-period-controls"><IconButton label="Previous period" disabled={date <= '1901-01-01'} onClick={() => setDate(movePeriod(date, view, -1))}><ChevronLeft size={17} /></IconButton><Button variant="ghost" size="sm" onClick={() => setDate(today)}>Today</Button><IconButton label="Next period" disabled={date >= '9997-01-01'} onClick={() => setDate(movePeriod(date, view, 1))}><ChevronRight size={17} /></IconButton></div>
        {compact ? <CalendarSelect label="Calendar view" value={view} items={viewLabels} onChange={value => setView(value as CalendarView)} /> : <div className="calendar-view-switch" role="group" aria-label="Calendar view">{Object.entries(viewLabels).map(([key, label]) => <button key={key} aria-pressed={view === key} onClick={() => setView(key as CalendarView)}>{label}</button>)}</div>}
        <Button className="calendar-new-event" size="sm" startIcon={<Plus size={16} />} disabled={disabled} onClick={() => newEvent(`${date}T09:00`)}>New event</Button>
      </div>
    </header>
      <div className="calendar-context-bar"><div className="calendar-search"><Search size={15} /><input aria-label="Search calendar" placeholder="Search this view…" value={query} onChange={e => setQuery(e.target.value)} /></div><div className="calendar-context-actions"><span className="calendar-timezone"><Clock3 size={13} />{preferences.timeZone.replaceAll('_', ' ')}</span><IconButton label="Refresh calendar" disabled={loading || busy} onClick={refreshData}><RefreshCw size={16} /></IconButton><IconButton label="Calendar settings" disabled={!ready} onClick={() => setSettings(true)}><Settings2 size={16} /></IconButton></div></div>
      {notice && <div className="calendar-notice" role="status">{notice}<button onClick={() => setNotice('')}>Dismiss</button></div>}{error && <div className="calendar-error" role="alert">{error}<button onClick={refreshData}>Retry</button></div>}
      {currentData?.sourceErrors?.map(message => <p className="calendar-error" role="status" key={message}>{message}</p>)}
      <div className="calendar-content" aria-busy={loading || busy}>{loading && <div className="calendar-loading" role="status">Loading calendar…</div>}{currentData && (view === 'day' || view === 'week' ? <TimeGrid {...viewProps} days={datesBetween(range.from, addDays(range.to, -1))} clock={clock} /> : view === 'month' ? <MonthView {...viewProps} /> : view === 'year' ? <YearView {...viewProps} /> : <AgendaView {...viewProps} days={datesBetween(range.from, addDays(range.to, -1))} />)}</div>
    </main>
  </div>
  {editor && <EventForm editor={editor} lists={data?.lists ?? []} onClose={() => setEditor(current => current === editor ? null : current)} onSaved={refreshData} />}
  {sourcesOpen && <CalendarSources timeZone={preferences.timeZone} from={range.from} to={range.to} onClose={() => setSourcesOpen(false)} onChanged={refreshData} />}
  {settings && <CalendarSettings preferences={preferences} version={settingsVersion} onClose={() => setSettings(false)} onSaved={(value, version) => { setPreferences(value); setSettingsVersion(version); setKinds(previous => ({ ...previous, habit: value.showHabits, focus: value.showFocus })); setShowCompleted(value.showCompleted); refreshData(); }} />}
  {inspected && <CalendarDialog title={inspected.title} busy={busy} onClose={() => setInspected(null)}><div className="calendar-form"><p className="calendar-help">{formatDate(inspected.start.slice(0, 10), { dateStyle: 'full' })} · {inspected.allDay ? 'All day' : inspected.start.slice(11)}{inspected.habit ? ` · ${inspected.habit.timezone}` : ''}</p>
    {inspected.external && <><p className="calendar-help">{inspected.external.sourceName} · Read-only calendar</p>{inspected.external.location && <p>{inspected.external.location}</p>}<p className="calendar-note">{inspected.external.description}</p><Button onClick={() => { const draft = eventDraft(inspected.start, preferences); setEditor({ draft: { ...draft, title: inspected.title, description: inspected.external!.description, location: inspected.external!.location, allDay: inspected.allDay, end: inspected.end > inspected.start ? inspected.end : draft.end } }); setInspected(null); }}>Copy to my calendar</Button></>}
    {inspected.kind === 'focus' ? <><p>{formatTrackedDuration(inspected.durationSeconds ?? 0)} of logged focus.</p><p className="calendar-note">{inspected.notes || 'No session note.'}</p><Link to="/tasks">Open time reports in Tasks</Link></> : inspected.task ? <><p className="calendar-note">{inspected.task.description || 'This task has a deadline, with no reserved duration.'}</p><Link to={`/tasks?task=${inspected.task.id}`}>Open task details</Link><Button variant="outlined" disabled={busy} onClick={() => void run(async () => { await calendarApi.updateTask(inspected.task!, { status: inspected.completed ? 'todo' : 'done' }); setInspected(null); }, 'Task updated.')}>{inspected.completed ? 'Reopen task' : 'Complete task'}</Button><Button disabled={busy} onClick={() => { newEvent(`${inspected.start.slice(0, 10)}T${inspected.task!.dueTime || '09:00'}`, false, inspected.task); setInspected(null); }}>Reserve time</Button></> : inspected.habit && <><p className="calendar-help">A time reservation plans your day. Progress is recorded in the original habit check-in.</p><Button disabled={busy || inspected.habitDate! > localDate(inspected.habit.timezone, clock) || !planOn(inspected.habit, inspected.habitDate!)} onClick={() => { setLog({ habit: inspected.habit!, date: inspected.habitDate!, revision: 0 }); setInspected(null); }}>Record progress</Button><Button variant="outlined" onClick={() => { if (inspected.event && inspected.occurrence) setEditor({ event: inspected.event, occurrence: inspected.occurrence, draft: { ...inspected.event, start: inspected.occurrence.start, end: inspected.occurrence.end, allDay: inspected.occurrence.allDay } }); else newEvent(`${inspected.habitDate}T09:00`, false, undefined, inspected.habit); setInspected(null); }}>{inspected.event ? 'Edit reservation' : 'Reserve time'}</Button><Link to={`/habits?habit=${inspected.habit.id}`}>Open habit history</Link></>}
  </div></CalendarDialog>}
  {log && <LogForm key={`${log.habit.id}/${log.date}/${log.revision}`} habit={log.habit} date={log.date} onClose={() => setLog(null)} onSave={async value => { await habitsApi.record(log.habit, log.date, value); refreshData(); }} onReload={async () => { const habit = await habitsApi.get(log.habit.id); setLog(previous => previous ? { ...previous, habit, revision: previous.revision + 1 } : null); refreshData(); }} />}
  </div></CalendarPlanningRoot>;
}
export default observer(function CalendarPage() { const auth = useAuthStore(); return <CalendarApp key={auth.currentUser.id} userId={auth.currentUser.id} />; });
