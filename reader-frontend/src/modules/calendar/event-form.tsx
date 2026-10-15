import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Check, ExternalLink, Repeat2, Trash2 } from 'lucide-react';
import { addDays, addWallMinutes, nextPendingOccurrence, remainingOccurrenceCount, scheduledOccurrenceAt, scheduleError, weekday, type CalendarEvent, type Occurrence, type RepeatRule } from '@reader/calendar-core';
import { Button } from '@modules/core/ui/primitives/button';
import { calendarApi, CalendarApiError, type EventDraft } from './api';
import { CalendarDialog, CalendarDiscardDialog, CalendarSelect, Field } from './ui';
import { colors, formatDate } from './model';

export type EventEditor = { draft: EventDraft; event?: CalendarEvent; occurrence?: Occurrence; initialListId?: string | null };
export function EventForm({ editor, lists, onClose, onSaved }: { editor: EventEditor; lists: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const navigate = useNavigate();
  const { event, occurrence } = editor;
  const recurring = !!event?.repeat;
  const canSplit = event && occurrence && recurring && scheduledOccurrenceAt(event, occurrence.date) && occurrence.date > (nextPendingOccurrence({ ...event, exceptions: [] })?.date ?? occurrence.date);
  const [scope, setScope] = useState<'single' | 'series' | 'following'>(recurring && occurrence ? 'single' : 'series');
  const [draft, setDraft] = useState(editor.draft), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [baseline, setBaseline] = useState(editor.draft);
  const [leaving, setLeaving] = useState<{ action: () => void; message: string; label?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [kind, setKind] = useState('event'), [listId, setListId] = useState(editor.initialListId ?? 'inbox'), [priority, setPriority] = useState(4);
  const creatingTask = !event && !editor.draft.taskId && !editor.draft.habitId && kind === 'task';
  const lock = useRef(false), requestKey = useRef(crypto.randomUUID());
  const mounted = useRef(true), request = useRef(0), errorRef = useRef<HTMLParagraphElement>(null), deleteRef = useRef<HTMLDivElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current++; }; }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (confirmDelete) deleteRef.current?.querySelector('button')?.focus(); }, [confirmDelete]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline) || kind !== 'event' || listId !== (editor.initialListId ?? 'inbox') || priority !== 4;
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  const single = Boolean(event && occurrence && scope === 'single');
  const change = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => { if (!lock.current) setDraft(previous => ({ ...previous, [key]: value })); };
  const defaultRule: RepeatRule = { frequency: 'WEEKLY', interval: 1, weekdays: [weekday(draft.start.slice(0, 10))], monthlyMode: 'DATE', count: null, until: null };
  function requestLeave(action = onClose, message = 'Your changes have not been saved. Keep editing to return to this draft, or discard them to leave.') {
    if (lock.current) return;
    if (dirty) setLeaving({ action, message }); else action();
  }
  function changeScope(value: string) {
    if (lock.current || !event) return;
    const next = value as typeof scope;
    const nextBaseline = { ...editor.draft, ...(next === 'series' ? { start: event.start, end: event.end, allDay: event.allDay } : occurrence ? { start: occurrence.start, end: occurrence.end, allDay: occurrence.allDay } : {}), repeat: next === 'following' && occurrence && event.repeat ? { ...event.repeat, count: remainingOccurrenceCount(event, occurrence.date) } : event.repeat };
    const occurrenceFields = ['start', 'end', 'allDay'];
    const editedFields = (Object.keys(draft) as (keyof EventDraft)[]).filter(key => JSON.stringify(draft[key]) !== JSON.stringify(baseline[key]));
    const differentAnchor = nextBaseline.start !== baseline.start || nextBaseline.end !== baseline.end || nextBaseline.allDay !== baseline.allDay;
    const discardTime = differentAnchor && editedFields.some(key => occurrenceFields.includes(key));
    const discardSeries = next === 'single' && editedFields.some(key => !occurrenceFields.includes(key));
    const apply = () => {
      // Preserve compatible edits; only untouched schedule fields adopt the new scope.
      const edits = Object.fromEntries(editedFields.filter(key => occurrenceFields.includes(key) ? !discardTime : next !== 'single').map(key => [key, draft[key]]));
      setScope(next); setBaseline(nextBaseline); setDraft({ ...nextBaseline, ...edits }); setError('');
    };
    if (discardSeries || discardTime) {
      setLeaving({ action: apply, message: [discardTime ? 'This scope starts on a different date. Switching will discard your time edits so the series or occurrence is not moved to the wrong date.' : '', discardSeries ? 'Title, notes and repeat edits apply to the series and will also be discarded when switching to one occurrence.' : 'Other edits will stay.'].filter(Boolean).join(' '), label: discardTime && discardSeries ? 'Discard incompatible edits' : discardTime ? 'Discard time edits' : 'Discard series edits' });
    } else apply();
  }
  async function run(action: () => Promise<unknown>) {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    const id = ++request.current;
    try { await action(); if (mounted.current && id === request.current) { onSaved(); onClose(); } }
    catch (error) { if (mounted.current && id === request.current) setError((error instanceof Error ? error.message : 'Couldn’t save this event.') + (error instanceof CalendarApiError && error.status === 409 ? ' Your edits are still here and nothing was overwritten. Copy any changes you need before choosing to discard this draft and reopen the latest event.' : '')); }
    finally { if (mounted.current && id === request.current) { lock.current = false; setBusy(false); } }
  }
  function save() {
    if (lock.current || leaving) return;
    const problem = scheduleError({ ...draft, repeat: single ? null : draft.repeat });
    if (problem) { setError(problem); return; }
    const payload = structuredClone(draft);
    void run(() => single ? calendarApi.occurrence(event!, occurrence!, { start: payload.start, end: payload.end, allDay: payload.allDay }) : event ? calendarApi.edit(event, payload, scope === 'following' ? 'following' : 'series', scope === 'following' ? occurrence?.date : undefined) : calendarApi.create(payload, requestKey.current, creatingTask ? { listId: listId === 'inbox' ? null : listId, priority } : undefined));
  }
  const updateRule = (change: Partial<RepeatRule>) => changeRepeat({ ...(draft.repeat ?? defaultRule), ...change });
  function changeRepeat(value: RepeatRule | null) { change('repeat', value); }
  return <CalendarDialog title={event ? 'Event details' : creatingTask ? 'New task' : draft.taskId ? 'Schedule task' : draft.habitId ? 'Make time for a habit' : 'New event'} busy={busy} onClose={() => requestLeave()} className="calendar-event-dialog">
    <form className="calendar-form calendar-event-form" aria-busy={busy} onSubmit={e => { e.preventDefault(); save(); }}>
      <div className="calendar-event-fields-scroll"><fieldset className="calendar-event-fields" disabled={busy}>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="calendar-error">{error}</p>}
      {!event && !draft.taskId && !draft.habitId && <Field label="Create"><CalendarSelect label="Create item type" value={kind} items={{ event: 'Event', task: 'Task with reserved time' }} onChange={value => { if (!lock.current) setKind(value); }} disabled={busy} /></Field>}
      {creatingTask && <><p className="calendar-help">Create a task in your list and reserve its time together. Its due date and completion stay in sync.</p><div className="calendar-form-grid"><Field label="Task list"><CalendarSelect label="New task list" value={listId} items={{ inbox: 'Inbox', ...Object.fromEntries(lists.map(item => [item.id, item.name])) }} onChange={value => { if (!lock.current) setListId(value); }} disabled={busy} /></Field><Field label="Priority"><CalendarSelect label="New task priority" value={String(priority)} items={{ '1': 'P1 · Urgent', '2': 'P2 · High', '3': 'P3 · Medium', '4': 'P4 · Low' }} onChange={value => { if (!lock.current) setPriority(Number(value)); }} disabled={busy} /></Field></div></>}
      {recurring && occurrence && <div className="calendar-scope"><Repeat2 size={16} /><CalendarSelect label="Apply changes to" value={scope} items={{ single: 'This occurrence', series: 'Entire series', ...(canSplit ? { following: 'This and following' } : {}) }} onChange={changeScope} disabled={busy} /></div>}
      <Field label="Title"><input autoFocus={!event} required maxLength={1000} value={draft.title} disabled={single || busy} onChange={e => change('title', e.target.value)} placeholder="What would you like to make time for?" /></Field>
      {single && <p className="calendar-help">Time changes apply to {formatDate(occurrence!.date)} only. Choose “Entire series” to change its title, notes or repeat rule.</p>}
      <label className="calendar-checkbox"><input type="checkbox" checked={draft.allDay} disabled={busy} onChange={e => {
        if (lock.current) return;
        const allDay = e.target.checked, start = allDay ? `${draft.start.slice(0, 10)}T00:00` : `${draft.start.slice(0, 10)}T09:00`;
        setDraft(previous => ({ ...previous, allDay, start, end: allDay ? `${addDays(start.slice(0, 10), 1)}T00:00` : addWallMinutes(start, 30) }));
      }} />All day</label>
      <div className="calendar-form-grid"><Field label="Starts"><input type={draft.allDay ? 'date' : 'datetime-local'} required value={draft.allDay ? draft.start.slice(0, 10) : draft.start} disabled={busy} onInput={e => {
        if (lock.current || !e.currentTarget.value) return;
        const start = draft.allDay ? `${e.currentTarget.value}T00:00` : e.currentTarget.value;
        const duration = (Date.parse(`${draft.end}:00Z`) - Date.parse(`${draft.start}:00Z`)) / 60000;
        setDraft(previous => ({ ...previous, start, end: addWallMinutes(start, duration) }));
      }} /></Field><Field label={draft.allDay ? 'Last day (included)' : 'Ends'}><input type={draft.allDay ? 'date' : 'datetime-local'} required disabled={busy} value={draft.allDay ? addDays(draft.end.slice(0, 10), -1) : draft.end} onInput={e => { if (e.currentTarget.value) change('end', draft.allDay ? `${addDays(e.currentTarget.value, 1)}T00:00` : e.currentTarget.value); }} /></Field></div>
      <Field label="Timezone" hint="Times stay in this timezone when the clocks change. Skipped local times are rejected; repeated times use the earlier offset."><input required value={draft.timeZone} maxLength={100} disabled={single || !!draft.habitId || busy} list="calendar-timezones" onChange={e => change('timeZone', e.target.value)} /><datalist id="calendar-timezones">{[Intl.DateTimeFormat().resolvedOptions().timeZone, 'UTC', 'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Singapore', 'Australia/Sydney'].filter((zone, i, list) => list.indexOf(zone) === i).map(zone => <option key={zone} value={zone} />)}</datalist></Field>
      {!single && <>
        <div className="calendar-form-grid"><Field label="Repeat"><CalendarSelect disabled={busy} label="Repeat frequency" value={draft.repeat?.frequency ?? 'NONE'} items={{ NONE: 'Does not repeat', DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly' }} onChange={value => changeRepeat(value === 'NONE' ? null : { ...defaultRule, ...draft.repeat, frequency: value as RepeatRule['frequency'] })} /></Field><Field label="Color"><CalendarSelect disabled={busy} label="Event color" value={draft.color} items={Object.fromEntries(Object.entries(colors).map(([name, color]) => [name, <span className="calendar-color-choice"><i style={{ background: color }} />{name}</span>]))} onChange={value => change('color', value)} /></Field></div>
        {draft.repeat && <fieldset className="calendar-repeat" disabled={busy}><legend>Repeat schedule</legend><Field label={`Interval in ${draft.repeat.frequency === 'DAILY' ? 'days' : draft.repeat.frequency === 'WEEKLY' ? 'weeks' : draft.repeat.frequency === 'MONTHLY' ? 'months' : 'years'}`}><input type="number" min={1} max={365} required value={draft.repeat.interval} onChange={e => updateRule({ interval: Number(e.target.value) })} /></Field>
          {draft.repeat.frequency === 'WEEKLY' && <div className="calendar-weekdays" role="group" aria-label="Repeat weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => <button type="button" disabled={busy} key={day} aria-pressed={draft.repeat!.weekdays.includes(i)} onClick={() => updateRule({ weekdays: draft.repeat!.weekdays.includes(i) ? draft.repeat!.weekdays.filter(value => value !== i) : [...draft.repeat!.weekdays, i] })}>{day}</button>)}</div>}
          {draft.repeat.frequency === 'MONTHLY' && <CalendarSelect disabled={busy} label="Monthly repeat rule" value={draft.repeat.monthlyMode} items={{ DATE: 'Same date each month', WEEKDAY: 'Same weekday position' }} onChange={value => updateRule({ monthlyMode: value as 'DATE' | 'WEEKDAY' })} />}
          <div className="calendar-form-grid"><Field label="Ends"><CalendarSelect disabled={busy} label="Repeat ending" value={draft.repeat.count ? 'COUNT' : draft.repeat.until ? 'DATE' : 'NEVER'} items={{ NEVER: 'Never', COUNT: 'After a number of times', DATE: 'On a date' }} onChange={value => updateRule({ count: value === 'COUNT' ? 10 : null, until: value === 'DATE' ? addDays(draft.start.slice(0, 10), 30) : null })} /></Field>{draft.repeat.count !== null ? <Field label="Occurrences"><input type="number" min={1} max={10000} required value={draft.repeat.count} onChange={e => updateRule({ count: Number(e.target.value) })} /></Field> : draft.repeat.until && <Field label="Last repeat date"><input type="date" required min={draft.start.slice(0, 10)} value={draft.repeat.until} onChange={e => updateRule({ until: e.target.value })} /></Field>}</div>
        </fieldset>}
        <Field label="Location"><input disabled={busy} maxLength={1000} value={draft.location} onChange={e => change('location', e.target.value)} placeholder="Place or meeting link" /></Field>
        <Field label="Notes"><textarea disabled={busy} maxLength={15000} rows={3} value={draft.description} onChange={e => change('description', e.target.value)} placeholder="Anything you need to remember" /></Field>
        <Field label="Reminder" hint="Browser reminders work while Calendar is open and notifications are enabled."><CalendarSelect disabled={busy} label="Reminder time" value={String(draft.reminders[0] ?? 'NONE')} items={{ NONE: 'No reminder', '0': 'At start time', '5': '5 minutes before', '15': '15 minutes before', '30': '30 minutes before', '60': '1 hour before', '1440': '1 day before', ...(draft.reminders.length && ![0, 5, 15, 30, 60, 1440].includes(draft.reminders[0]) ? { [draft.reminders[0]]: `${draft.reminders[0]} minutes before` } : {}) }} onChange={value => change('reminders', value === 'NONE' ? [] : [Number(value)])} /></Field>
      </>}
      {(draft.taskId || draft.habitId) && <Link className="calendar-related-link" aria-disabled={busy || undefined} tabIndex={busy ? -1 : undefined} to={draft.taskId ? `/tasks?task=${draft.taskId}` : `/habits?habit=${draft.habitId}`} onClick={e => { if (!lock.current && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return; e.preventDefault(); requestLeave(() => navigate(draft.taskId ? `/tasks?task=${draft.taskId}` : `/habits?habit=${draft.habitId}`)); }}><ExternalLink size={14} />Open linked {draft.taskId ? 'task' : 'habit'}</Link>}
      {event && occurrence && !event.habitId && <Button type="button" variant="outlined" disabled={busy} startIcon={<Check size={16} />} onClick={() => requestLeave(() => void run(() => calendarApi.occurrence(event, occurrence, { completed: !occurrence.completed })), "Changing completion will leave this editor without saving your other edits. Keep editing to save them first, or discard them and continue.")}>{occurrence.completed ? (recurring ? 'Reopen this occurrence' : 'Reopen event') : (recurring ? 'Mark this occurrence done' : 'Mark done')}</Button>}
      {confirmDelete && <div ref={deleteRef} className="calendar-delete-confirm"><p>{single ? 'Remove this occurrence? Other dates stay on the calendar.' : recurring ? 'Remove this whole series? Its calendar history will be hidden. Linked tasks and habit check-ins are kept.' : 'Remove this event from Calendar? Its linked task or habit check-ins are kept.'}{dirty ? ' Your unsaved edits will be discarded.' : ''}</p><Button type="button" variant="outlined" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep it</Button><Button type="button" disabled={busy} onClick={() => void run(() => single ? calendarApi.occurrence(event!, occurrence!, { cancelled: true, completed: false }) : calendarApi.remove(event!))}>Remove {single ? 'occurrence' : recurring ? 'series' : 'event'}</Button></div>}
      </fieldset></div>
      <footer>{event && !confirmDelete && <Button type="button" variant="ghost" disabled={busy || scope === 'following'} startIcon={<Trash2 size={15} />} onClick={() => setConfirmDelete(true)}>Remove</Button>}<Button type="button" variant="outlined" onClick={() => requestLeave()} disabled={busy}>Cancel</Button><Button type="submit" loading={busy} startIcon={<CalendarDays size={16} />}>{creatingTask ? 'Create task' : `Save ${single ? 'occurrence' : 'event'}`}</Button></footer>
    </form>
    {leaving && <CalendarDiscardDialog message={leaving.message} confirmLabel={leaving.label} onKeep={() => setLeaving(null)} onDiscard={() => { const action = leaving.action; setLeaving(null); action(); }} />}
  </CalendarDialog>;
}
