import { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Archive, ArrowDown, ArrowUp, Bell, BellOff, CalendarDays, ChartNoAxesCombined, Check, ChevronLeft, ChevronRight, Circle, Download, LayoutList, Plus, RefreshCw, Search, Sprout } from 'lucide-react';
import { addDays, dateRange, dayStatus, goalLabel, localDate, monday, planOn, quantityLabel, roundValue, scheduled, scheduleLabel, weekProgress, type Habit } from '@reader/habit-core';
import { AppBar } from '@modules/core/ui/components/appbar';
import { Button } from '@modules/core/ui/primitives/button';
import { Tooltip } from '@modules/core/ui/primitives/tooltip';
import { useAuthStore } from '@modules/auth/provider/store';
import { habitsApi, HabitApiError } from './api';
import { HabitForm } from './habit-form';
import { HabitDetail, saveDownload } from './detail';
import { LogForm, type LogValue } from './log-form';
import { Empty, HabitDialog, HabitIcon, HabitSelect, IconButton, formatDay } from './ui';
import { dueReminders } from './reminders';
import './habits.css';

type View = 'today' | 'week' | 'month' | 'all' | 'archived';
const navigation = [['today', 'Today', Circle], ['week', 'This week', CalendarDays], ['month', 'Monthly review', ChartNoAxesCombined], ['all', 'All habits', LayoutList], ['archived', 'Archived', Archive]] as const;
function useReminderNotifications(userId: string) {
  const key = `do100x.habits.notifications.${userId}`;
  const [enabled, setEnabled] = useState(() => { try { return localStorage.getItem(key) === 'on'; } catch { return false; } });
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    let stopped = false;
    const check = async () => {
      try {
        const now = new Date(), today = localDate('UTC', now);
        const { items } = await habitsApi.list(addDays(today, -8), addDays(today, 1));
        if (stopped) return;
        for (const reminder of dueReminders(items, now)) {
          const storageKey = `${key}.sent.${reminder.key}`;
          if (localStorage.getItem(storageKey)) continue;
          localStorage.setItem(storageKey, '1');
          const notification = new Notification(reminder.habit.name, { body: reminder.habit.description || 'A little progress counts. Open Habits to check in.', tag: reminder.key });
          notification.onclick = () => { window.focus(); notification.close(); };
        }
        // Keep only recent notification receipts for this account.
        for (let index = localStorage.length - 1; index >= 0; index--) {
          const item = localStorage.key(index);
          if (item?.startsWith(`${key}.sent.`)) { const date = item.slice(`${key}.sent.`.length).split('/')[1]; if (date < addDays(today, -7)) localStorage.removeItem(item); }
        }
      } catch { /* A temporary network error must not interrupt reading/check-ins. */ }
    };
    void check(); const timer = window.setInterval(() => void check(), 60_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [enabled, key]);
  const toggle = async () => {
    if (enabled) { setEnabled(false); try { localStorage.setItem(key, 'off'); } catch {} return; }
    if (typeof Notification === 'undefined') { setNotice('This browser does not support notifications. Reminder times are still saved with your habits.'); return; }
    let permission: NotificationPermission;
    try { permission = await Notification.requestPermission(); }
    catch { setNotice('This browser could not enable notifications. Your reminder times are still saved.'); return; }
    if (permission !== 'granted') { setNotice('Notifications are blocked. You can allow them in your browser’s site settings.'); return; }
    setEnabled(true); try { localStorage.setItem(key, 'on'); } catch {}
    setNotice('Browser reminders are enabled while Habits is open. Set reminder times when editing a habit.');
  };
  return { enabled, notice, setNotice, toggle };
}

const HabitsApp = observer(function HabitsApp({ userId }: { userId: string }) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  const [clock, setClock] = useState(() => new Date()), today = localDate(timezone, clock);
  const [date, setDate] = useState(today), [view, setView] = useState<View>('today');
  const previousToday = useRef(today);
  const [items, setItems] = useState<Habit[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [query, setQuery] = useState(''), [section, setSection] = useState('all'), [filter, setFilter] = useState('all');
  const [refresh, setRefresh] = useState(0), [selectedId, setSelectedId] = useState<string | null>(null), [detail, setDetail] = useState<Habit | null>(null), [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [completeSelection, setCompleteSelection] = useState<Habit[] | null>(null);
  const [form, setForm] = useState<Habit | 'new' | null>(null), [logEditor, setLogEditor] = useState<{ habit: Habit; date: string } | null>(null);
  const [confirm, setConfirm] = useState<{ habit: Habit; action: 'delete' | 'archive' } | null>(null);
  const reminders = useReminderNotifications(userId);
  const start = view === 'month' ? `${date.slice(0, 7)}-01` : addDays(monday(date), -7);
  const nextMonth = new Date(`${date.slice(0, 7)}-01T12:00:00Z`); nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const end = view === 'month' ? addDays(nextMonth.toISOString().slice(0, 10), -1) : addDays(monday(date), 6);
  const days = view === 'month' ? dateRange(`${date.slice(0, 7)}-01`, end) : dateRange(monday(date), addDays(monday(date), 6));

  useEffect(() => { const timer = setInterval(() => setClock(new Date()), 30_000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (date === previousToday.current) setDate(today); previousToday.current = today; }, [today]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    void habitsApi.list(start, end, controller.signal).then(result => { if (!controller.signal.aborted) { setItems(result.items); setLoading(false); } }).catch(error => { if (!controller.signal.aborted) { setError(error instanceof Error ? error.message : 'Couldn’t load habits.'); setLoading(false); } });
    return () => controller.abort();
  }, [start, end, refresh]);
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    const controller = new AbortController(); setDetailLoading(true); setDetailError('');
    void habitsApi.get(selectedId, controller.signal).then(result => { if (!controller.signal.aborted) { setDetail(result); setDetailLoading(false); } }).catch(error => { if (!controller.signal.aborted) { setDetailError(error instanceof Error ? error.message : 'Couldn’t load history.'); setDetailLoading(false); } });
    return () => controller.abort();
  }, [selectedId, refresh]);
  useEffect(() => {
    const focus = () => setRefresh(value => value + 1);
    window.addEventListener('focus', focus); return () => window.removeEventListener('focus', focus);
  }, []);

  const active = items.filter(item => !item.archivedAt), selected = detail?.id === selectedId ? detail : items.find(item => item.id === selectedId);
  const isComplete = (habit: Habit) => {
    const localToday = localDate(habit.timezone, clock), plan = planOn(habit, date), progress = weekProgress(habit, date, localToday);
    return dayStatus(habit, date, localToday) === 'done' || (plan?.frequency === 'WEEKLY' && progress.target > 0 && progress.done >= progress.target);
  };
  const visible = items.filter(habit => {
    if (Boolean(habit.archivedAt) !== (view === 'archived')) return false;
    if (section !== 'all' && habit.section !== section) return false;
    if (!`${habit.name} ${habit.description} ${habit.section}`.toLowerCase().includes(query.toLowerCase().trim())) return false;
    if (view === 'today' && !scheduled(habit, date) && !habit.logs.some(log => log.date === date && log.status !== 'NONE')) return false;
    const status = dayStatus(habit, date, localDate(habit.timezone, clock));
    if (view === 'today' && filter !== 'all' && (filter === 'done' ? !isComplete(habit) : isComplete(habit) || status === 'skipped')) return false;
    return true;
  });
  const due = active.filter(habit => scheduled(habit, date) && dayStatus(habit, date, localDate(habit.timezone, clock)) !== 'skipped'), completed = due.filter(isComplete).length;
  const sections = useMemo(() => Object.fromEntries([['all', 'All sections'], ...[...new Set(items.map(habit => habit.section))].sort().map(name => [name, name])]), [items]);
  useEffect(() => { if (!loading && !sections[section]) setSection('all'); }, [sections, section, loading]);
  const completable = visible.filter(habit => !habit.archivedAt && scheduled(habit, date) && date <= localDate(habit.timezone, clock) && !isComplete(habit) && dayStatus(habit, date, localDate(habit.timezone, clock)) !== 'skipped');
  const doneLabel = `${completed} of ${due.length} completed`;
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await work(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Couldn’t save that change.'); if (error instanceof HabitApiError && error.status === 409) setRefresh(value => value + 1); throw error; }
    finally { setBusy(false); }
  }
  function replaceMetadata(habit: Habit) {
    setItems(previous => previous.map(item => item.id === habit.id ? { ...habit, logs: item.logs } : item));
    setDetail(previous => previous?.id === habit.id ? { ...habit, logs: previous.logs } : previous);
  }
  async function record(habit: Habit, targetDate: string, value: LogValue) {
    await run(async () => {
      const result = await habitsApi.record(habit, targetDate, value);
      const update = (item: Habit): Habit => item.id === habit.id ? { ...item, logs: [...item.logs.filter(log => log.date !== targetDate), result].sort((a, b) => a.date.localeCompare(b.date)) } : item;
      setItems(previous => previous.map(update)); setDetail(previous => previous ? update(previous) : null);
    });
  }
  async function quickCheck(habit: Habit) {
    const plan = planOn(habit, date); if (!plan) return;
    const previous = habit.logs.find(log => log.date === date);
    const value = plan.goalType === 'CHECK' ? (previous?.value === 1 ? 0 : 1) : roundValue((previous?.value ?? 0) + plan.step);
    await record(habit, date, { value, status: 'RECORDED', note: previous?.note ?? '', mood: previous?.mood ?? null });
  }
  function moveDate(direction: number) {
    if (view === 'month') { const value = new Date(`${date.slice(0, 7)}-01T12:00:00Z`); value.setUTCMonth(value.getUTCMonth() + direction); setDate(value.toISOString().slice(0, 10)); }
    else setDate(addDays(date, direction * (view === 'week' ? 7 : 1)));
  }
  function openLog(habit: Habit, targetDate: string) { setLogEditor({ habit, date: targetDate }); }
  const matrixCell = (habit: Habit, targetDate: string) => {
    const status = dayStatus(habit, targetDate, localDate(habit.timezone, clock));
    const actionable = targetDate <= localDate(habit.timezone, clock) && !habit.archivedAt && (scheduled(habit, targetDate) || habit.logs.some(log => log.date === targetDate));
    const label = `${habit.name}, ${formatDay(targetDate)}: ${status}`;
    return <Tooltip key={targetDate} content={label}><button className={`habit-matrix-cell status-${status}`} aria-label={label} disabled={!actionable || busy || loading} onClick={() => openLog(habit, targetDate)}>{status === 'done' ? <Check size={14} /> : status === 'skipped' ? '–' : status === 'partial' ? <span className="habit-partial-dot" /> : null}</button></Tooltip>;
  };

  return <div className="habits-page"><AppBar /><div className="habits-shell">
    <aside className="habits-sidebar"><div className="habits-sidebar-title"><Sprout size={20} /><strong>Small steps, daily</strong></div><nav aria-label="Habits navigation">{navigation.map(([id, label, Icon]) => <button key={id} aria-current={view === id ? 'page' : undefined} onClick={() => { setView(id); setFilter('all'); if (id === 'today' || id === 'week') setDate(today); }}><Icon size={17} />{label}{id === 'all' && <span>{active.length}</span>}</button>)}</nav><div className="habits-sidebar-bottom"><button onClick={() => void reminders.toggle()}>{reminders.enabled ? <Bell size={16} /> : <BellOff size={16} />}{reminders.enabled ? 'Reminders on' : 'Enable reminders'}</button><small>Notifications work while Habits is open.</small><button disabled={busy} onClick={() => void run(async () => saveDownload(`do100x-habits-${today}.json`, await habitsApi.export())).catch(() => {})}><Download size={16} />Export all habits</button></div></aside>
    <main className="habits-main"><div className="habits-heading"><div><p className="habits-eyebrow">{view === 'today' ? 'A little progress counts' : view === 'archived' ? 'Kept for another season' : 'Build a rhythm that lasts'}</p><h1>{view === 'today' ? date === today ? 'Today’s habits' : formatDay(date, { month: 'long', day: 'numeric' }) : navigation.find(item => item[0] === view)?.[1]}</h1><p className="habits-muted">{view === 'today' ? doneLabel : view === 'archived' ? 'Restore a habit whenever you’re ready to return.' : 'Review your progress, one day at a time.'}</p></div><div className="habits-heading-actions"><IconButton label="Refresh habits" disabled={loading || busy} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} /></IconButton><Button startIcon={<Plus size={17} />} onClick={() => setForm('new')}>New habit</Button></div></div>
      {reminders.notice && <div className="habits-notice" role="status">{reminders.notice}<button onClick={() => reminders.setNotice('')}>Dismiss</button></div>}
      {error && <div className="habits-error" role="alert">{error}<Button size="sm" variant="ghost" onClick={() => setRefresh(value => value + 1)}>Retry</Button></div>}
      <div className="habits-toolbar"><div className="habits-search"><Search size={16} /><input aria-label="Search habits" placeholder="Find a habit…" value={query} onChange={event => setQuery(event.target.value)} /></div><HabitSelect label="Filter habit section" value={section} items={sections} onChange={setSection} />{view === 'today' && <HabitSelect label="Filter habit progress" value={filter} items={{ all: 'All progress', pending: 'Still to do', done: 'Completed' }} onChange={setFilter} />}
        {view !== 'archived' && <div className="habits-date-controls"><IconButton label="Previous period" disabled={date <= addDays(today, -3650)} onClick={() => moveDate(-1)}><ChevronLeft size={16} /></IconButton><input aria-label="Viewing date" min={view === 'month' ? addDays(today, -3650).slice(0, 7) : addDays(today, -3650)} max={view === 'month' ? addDays(today, 365).slice(0, 7) : addDays(today, 365)} type={view === 'month' ? 'month' : 'date'} value={view === 'month' ? date.slice(0, 7) : date} onChange={event => { const value = view === 'month' ? `${event.target.value}-01` : event.target.value; if (event.target.value && value >= addDays(today, -3650) && value <= addDays(today, 365)) setDate(value); }} /><IconButton label="Next period" disabled={date >= addDays(today, 365)} onClick={() => moveDate(1)}><ChevronRight size={16} /></IconButton>{date !== today && <button onClick={() => setDate(today)}>Today</button>}</div>}
      </div>
      {error && !items.length ? null : loading && !items.length ? <p role="status" className="habits-muted">Loading habits…</p> : !visible.length ? <Empty title={query || section !== 'all' || filter !== 'all' ? 'No habits match these filters' : view === 'archived' ? 'Nothing archived' : active.length ? 'A little breathing room' : 'Start with something small'}><p>{query || section !== 'all' || filter !== 'all' ? 'Try a different search, section or progress filter.' : view === 'archived' ? 'Archived habits keep their history here.' : active.length ? 'No habits are scheduled for this date. Your other habits are in All habits.' : 'Read two pages. Drink a glass of water. Choose a habit you can return to.'}</p>{!active.length && view !== 'archived' && <Button onClick={() => setForm('new')}>Choose your first habit</Button>}</Empty> : <>
        {view === 'today' && completable.length > 1 && <div className="habits-bulk-action"><Button size="sm" variant="outlined" disabled={busy || loading} onClick={() => setCompleteSelection(completable)}>Complete remaining ({completable.length})</Button></div>}{view === 'today' && <div className="habits-day-progress"><progress aria-label="Daily habit progress" max={Math.max(1, due.length)} value={completed} /><span>{due.length ? Math.round(completed / due.length * 100) : 0}%</span></div>}
        {view === 'week' || view === 'month' ? <div className="habits-matrix-scroll"><table className={`habits-matrix ${view === 'month' ? 'is-month' : ''}`}><caption className="sr-only">Habit check-ins for {view === 'month' ? formatDay(date, { month: 'long', year: 'numeric' }) : `week of ${formatDay(monday(date))}`}</caption><thead><tr><th scope="col">Habit</th>{days.map(day => <th scope="col" key={day} className={day === today ? 'is-today' : ''}><span>{formatDay(day, { weekday: 'narrow' })}</span>{Number(day.slice(8))}</th>)}</tr></thead><tbody>{visible.map(habit => <tr key={habit.id} className={`habit-color-${habit.color}`}><th scope="row"><button onClick={() => setSelectedId(habit.id)}><HabitIcon name={habit.icon} size={17} /><span>{habit.name}<small>{goalLabel(planOn(habit, date) ?? habit.plans[0])}</small></span></button></th>{days.map(day => <td key={day}>{matrixCell(habit, day)}</td>)}</tr>)}</tbody></table><p className="habits-matrix-hint">Click a day to record progress, add a note, skip, or correct an earlier check-in.</p></div> : <div className="habit-list">{visible.map(habit => {
          const plan = planOn(habit, date) ?? habit.plans[0], log = habit.logs.find(item => item.date === date), status = dayStatus(habit, date, localDate(habit.timezone, clock)), week = weekProgress(habit, date, localDate(habit.timezone, clock));
          const canCheck = !habit.archivedAt && scheduled(habit, date) && date <= localDate(habit.timezone, clock);
          return <article key={habit.id} className={`habit-row habit-color-${habit.color} ${selectedId === habit.id ? 'is-selected' : ''}`}>
            <button className="habit-row-identity" onClick={() => setSelectedId(habit.id)}><span className="habit-icon"><HabitIcon name={habit.icon} /></span><span><strong>{habit.name}</strong><small>{habit.section} · {scheduleLabel(plan)}</small>{plan.frequency === 'WEEKLY' && <em>{week.done} / {week.target} days this week</em>}</span></button>
            <div className="habit-row-history" aria-label={`${habit.name} recent days`}>{dateRange(addDays(date, -6), date).map(day => matrixCell(habit, day))}</div>
            <div className="habit-row-progress">{plan.goalType === 'COUNT' && <><span>{log?.status === 'RECORDED' ? log.value : 0} <small>/ {plan.target} {plan.unit}</small></span><progress max={plan.target} value={Math.min(log?.value ?? 0, plan.target)} aria-label={`${habit.name} amount`} /></>}{canCheck && plan.frequency === 'WEEKLY' && week.done >= week.target && status !== 'done' ? <small className="habits-muted">Weekly goal met</small> : canCheck ? <Button size="sm" variant={status === 'done' ? 'outlined' : 'primary'} disabled={busy || loading} tooltip={plan.goalType === 'CHECK' ? status === 'done' ? 'Undo today’s completion' : 'Complete habit' : `Add ${quantityLabel(plan.step, plan.unit)}`} onClick={() => void quickCheck(habit).catch(() => {})}>{plan.goalType === 'CHECK' ? <><Check size={15} />{status === 'done' ? 'Done' : 'Check in'}</> : <><Plus size={14} />{quantityLabel(plan.step, plan.unit)}</>}</Button> : <small className="habits-muted">{habit.archivedAt ? 'Archived' : date > localDate(habit.timezone, clock) ? 'Upcoming' : 'Rest day'}</small>}</div>
            <div className="habit-row-actions">{canCheck && <IconButton label={`Edit check-in for ${habit.name}`} disabled={busy || loading} onClick={() => openLog(habit, date)}><CalendarDays size={16} /></IconButton>}{view === 'all' && <><IconButton label={`Move ${habit.name} up`} disabled={busy || query !== '' || section !== 'all' || active.indexOf(habit) === 0} onClick={() => { const ids = active.map(item => item.id), index = ids.indexOf(habit.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; void run(async () => { await habitsApi.reorder(ids); setRefresh(value => value + 1); }).catch(() => {}); }}><ArrowUp size={14} /></IconButton><IconButton label={`Move ${habit.name} down`} disabled={busy || query !== '' || section !== 'all' || active.indexOf(habit) === active.length - 1} onClick={() => { const ids = active.map(item => item.id), index = ids.indexOf(habit.id); [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]; void run(async () => { await habitsApi.reorder(ids); setRefresh(value => value + 1); }).catch(() => {}); }}><ArrowDown size={14} /></IconButton></>}</div>
          </article>;
        })}</div>}
      </>}
    </main>
    {selected && <HabitDetail key={selected.id} habit={selected} loading={detailLoading || detail?.id !== selectedId} error={detailError} onRetry={() => setRefresh(value => value + 1)} busy={busy || loading} onClose={() => setSelectedId(null)} onEdit={() => setForm(selected)} onLog={targetDate => openLog(selected, targetDate)} onArchive={() => selected.archivedAt ? void run(async () => replaceMetadata(await habitsApi.archive(selected, false))).catch(() => {}) : setConfirm({ habit: selected, action: 'archive' })} onDelete={() => setConfirm({ habit: selected, action: 'delete' })} />}
  </div>
  {form && <HabitForm habit={form === 'new' ? undefined : form} onClose={() => setForm(null)} onSaved={habit => { setForm(null); setRefresh(value => value + 1); setSelectedId(habit.id); }} />}
  {logEditor && <LogForm key={`${logEditor.habit.id}/${logEditor.date}/${logEditor.habit.version}/${logEditor.habit.logs.find(log => log.date === logEditor.date)?.version ?? 0}`} onReload={async () => { const latest = await habitsApi.get(logEditor.habit.id); setLogEditor({ habit: latest, date: logEditor.date }); setRefresh(value => value + 1); }} habit={logEditor.habit} date={logEditor.date} onClose={() => setLogEditor(null)} onSave={value => record(logEditor.habit, logEditor.date, value)} />}
  {completeSelection && <HabitDialog title="Complete these habits?" busy={busy} onClose={() => setCompleteSelection(null)}><p className="habit-confirm-copy">Set each listed habit to its goal for {formatDay(date)}. Existing notes and moods are kept. Skipped days stay skipped.</p><ul className="habit-complete-list">{completeSelection.map(habit => <li key={habit.id}>{habit.name}</li>)}</ul><div className="habit-form-footer"><Button variant="outlined" disabled={busy} onClick={() => setCompleteSelection(null)}>Cancel</Button><Button loading={busy} onClick={() => void run(async () => { await habitsApi.complete(completeSelection, date); setCompleteSelection(null); setRefresh(value => value + 1); }).catch(() => setCompleteSelection(null))}>Complete {completeSelection.length} habits</Button></div></HabitDialog>}
  {confirm && <HabitDialog title={confirm.action === 'delete' ? 'Delete this habit?' : 'Archive this habit?'} onClose={() => setConfirm(null)} busy={busy}><p className="habit-confirm-copy">{confirm.action === 'delete' ? `“${confirm.habit.name}” and all its check-ins will be permanently deleted. Export its history first if you want a copy.` : `“${confirm.habit.name}” will move to Archived. Its history stays available and future days are paused. You can restore it anytime.`}</p><div className="habit-form-footer"><Button variant="outlined" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button><Button loading={busy} onClick={() => void run(async () => { if (confirm.action === 'delete') { await habitsApi.remove(confirm.habit); setItems(previous => previous.filter(item => item.id !== confirm.habit.id)); setSelectedId(null); } else replaceMetadata(await habitsApi.archive(confirm.habit, true)); setConfirm(null); }).catch(() => {})}>{confirm.action === 'delete' ? 'Delete habit and history' : 'Archive habit'}</Button></div></HabitDialog>}
  </div>;
});
export default observer(function HabitsPage() { const auth = useAuthStore(); return <HabitsApp key={auth.currentUser.id} userId={auth.currentUser.id} />; });
