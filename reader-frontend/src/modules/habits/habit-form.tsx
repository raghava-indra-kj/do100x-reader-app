import { useEffect, useId, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { HABIT_COLORS, HABIT_ICONS, HABIT_TEMPLATES, WEEKDAYS, localDate, type Habit, type HabitDraft, type HabitFrequency, type HabitGoal } from '@reader/habit-core';
import { Button } from '@modules/core/ui/primitives/button';
import { HabitDialog, HabitConfirmDialog, HabitIcon, HabitSelect, Field, IconButton, type HabitFormConfirmation } from './ui';
import { sameDraft, useHabitFormSession } from './form-session';
import { HabitApiError, habitsApi } from './api';

export function newHabitDraft(): HabitDraft {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  return { name: '', description: '', icon: 'sprout', color: 'green', section: 'Personal', timezone, plan: { startDate: localDate(timezone), endDate: null, frequency: 'DAILY', weekdays: [1, 2, 3, 4, 5], intervalDays: 2, weeklyTarget: 3, goalType: 'CHECK', target: 1, unit: '', step: 1, reminders: [] } };
}
function fromHabit(habit: Habit): HabitDraft {
  const { id: _id, effectiveFrom: _from, ...plan } = habit.plans[habit.plans.length - 1];
  return { name: habit.name, description: habit.description, icon: habit.icon, color: habit.color, section: habit.section, timezone: habit.timezone, plan: structuredClone(plan) };
}
type HabitFormProps = { habit?: Habit; onClose: () => void; onSaved: (habit: Habit) => void; onRecovered?: (habit: Habit) => void };
export function HabitForm(props: HabitFormProps) { return <HabitFormSession key={props.habit?.id ?? 'new'} {...props} />; }
function HabitFormSession({ habit, onClose, onSaved, onRecovered }: HabitFormProps) {
  const [draft, setDraft] = useState(() => habit ? fromHabit(habit) : newHabitDraft());
  const baseline = useRef(structuredClone(draft));
  const [currentHabit, setCurrentHabit] = useState(habit), [conflict, setConflict] = useState(false);
  const [gallery, setGallery] = useState(!habit), [error, setError] = useState('');
  const [requestKey] = useState(() => crypto.randomUUID()), [time, setTime] = useState('09:00');
  const [confirmation, setConfirmation] = useState<HabitFormConfirmation | null>(null);
  const [uncertain, setUncertain] = useState(false), [recovered, setRecovered] = useState(false);
  const pendingCreate = useRef<{ draft: HabitDraft; requestKey: string } | null>(null);
  const session = useHabitFormSession(), { busy } = session;
  const id = useId(), errorRef = useRef<HTMLParagraphElement>(null), lastField = useRef<HTMLElement | null>(null);
  const dirty = !sameDraft(draft, baseline.current) || time !== '09:00';
  const immutableChanged = Boolean(currentHabit && (draft.timezone !== currentHabit.timezone || draft.plan.startDate !== currentHabit.plans[0].startDate));
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const field = <K extends keyof HabitDraft>(key: K, value: HabitDraft[K]) => { if (!session.locked.current) setDraft(previous => ({ ...previous, [key]: value })); };
  const plan = <K extends keyof HabitDraft['plan']>(key: K, value: HabitDraft['plan'][K]) => { if (!session.locked.current) setDraft(previous => ({ ...previous, plan: { ...previous.plan, [key]: value } })); };
  function requestClose() {
    if (session.locked.current) return;
    if (!dirty && !uncertain) { session.close(onClose); return; }
    setConfirmation({ title: 'Discard unsaved changes?', message: uncertain ? 'The earlier request may already have saved. Leaving closes this draft; it does not undo a saved habit. Check your habits before creating another.' : 'Your changes will be lost. Keep editing to return to this draft.', confirmLabel: 'Discard changes', action: () => session.close(onClose) });
  }
  function chooseTemplate(template: (typeof HABIT_TEMPLATES)[number]) {
    if (session.locked.current) return;
    const apply = () => {
      setDraft(previous => ({ ...previous, name: template.name, description: template.description, icon: template.icon, color: template.color, section: template.section, plan: { ...previous.plan, goalType: template.unit ? 'COUNT' : 'CHECK', target: template.target, step: template.step, unit: template.unit } }));
      setGallery(false); setConfirmation(null);
    };
    if (dirty) setConfirmation({ title: 'Replace with this idea?', message: 'This replaces the name, reason, appearance, section and goal in your draft. Your dates, timezone, schedule and reminders stay as they are.', confirmLabel: 'Use this idea', action: apply });
    else apply();
  }
  async function reload() {
    setConfirmation(null);
    if (!currentHabit) return;
    const token = session.begin(); if (token === null) return;
    const habitId = currentHabit.id;
    try {
      const latest = await habitsApi.get(habitId); if (!session.current(token)) return;
      const next = fromHabit(latest); setCurrentHabit(latest); setDraft(next); baseline.current = structuredClone(next);
      setTime('09:00'); setConflict(false); setError(''); setRecovered(false);
    } catch (error) { if (session.current(token)) setError(error instanceof Error ? error.message : 'Couldn’t reload the habit.'); }
    finally { session.finish(token); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (session.locked.current) return;
    if (!pendingCreate.current) {
      if (draft.plan.frequency === 'WEEKDAYS' && !draft.plan.weekdays.length) { setError('Choose at least one weekday.'); return; }
      if (draft.plan.endDate && draft.plan.endDate < draft.plan.startDate) { setError('End date must follow the start date.'); return; }
      if (immutableChanged) { setError('Use the saved timezone and start date before saving the remaining edits.'); return; }
    }
    const token = session.begin(); if (token === null) return;
    const submittedDraft = structuredClone(draft), source = currentHabit ? structuredClone(currentHabit) : undefined;
    const recovering = Boolean(pendingCreate.current);
    setError('');
    try {
      if (source) {
        const saved = await habitsApi.edit(source, submittedDraft); if (session.current(token)) onSaved(saved);
      } else {
        // A failed response is not proof that creation failed. Retry the exact
        // original request before considering any newer draft or request key.
        const attempt = pendingCreate.current ?? { draft: submittedDraft, requestKey };
        pendingCreate.current = attempt;
        const saved = await habitsApi.create(structuredClone(attempt.draft), attempt.requestKey);
        if (!session.current(token)) return;
        pendingCreate.current = null; setUncertain(false);
        if (sameDraft(attempt.draft, submittedDraft)) onSaved(saved);
        else {
          setCurrentHabit(saved); baseline.current = fromHabit(saved); setRecovered(true); setConflict(false); onRecovered?.(saved);
          // Preserve newer input for explicit review. Immutable field differences
          // are reconciled only by the named action below, never silently.
        }
      }
    } catch (error) {
      if (!session.current(token)) return;
      setError(error instanceof Error ? error.message : 'Couldn’t save the habit.');
      setConflict(error instanceof HabitApiError && error.status === 409 && Boolean(source));
      if (!source) {
        const definitelyRejected = !recovering && error instanceof HabitApiError && error.status >= 400 && error.status < 500 && error.status !== 408;
        if (definitelyRejected) pendingCreate.current = null;
        setUncertain(!definitelyRejected);
      }
    } finally { session.finish(token); }
  }
  return <HabitDialog title={currentHabit ? 'Edit habit' : 'Build a small habit'} onClose={requestClose} busy={busy} wide formLayout>
    {gallery ? <div className="habit-form"><div className="habit-form-body"><p className="habits-muted">Start small. Choose an idea, then make it yours.</p><div className="habit-gallery">{HABIT_TEMPLATES.map(template => <button key={template.name} disabled={busy} onClick={() => chooseTemplate(template)}><span className={`habit-icon habit-color-${template.color}`}><HabitIcon name={template.icon} /></span><strong>{template.name}</strong><small>{template.unit ? `${template.target} ${template.unit} a day` : 'One small action a day'}</small></button>)}</div></div><div className="habit-form-footer"><Button variant="outlined" disabled={busy} onClick={requestClose}>Cancel</Button><Button disabled={busy} onClick={() => { if (!session.locked.current) setGallery(false); }}>{dirty ? 'Back to my draft' : 'Create my own habit'}</Button></div></div> :
    <form onSubmit={submit} noValidate={uncertain} className="habit-form" onFocusCapture={event => { if ((event.target as HTMLElement).matches('input,textarea,[role=combobox]')) lastField.current = event.target as HTMLElement; }}>
      <div className="habit-form-body"><fieldset disabled={busy} className="habit-form-fields">
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="habits-error">{error}</p>}
      {uncertain && <div className="habit-form-notice"><p>The earlier save could not be confirmed. Check it again before saving newer edits; the original request will be retried without creating a duplicate.</p></div>}
      {recovered && <div className="habit-form-notice"><p>Your earlier save was recovered. Your newer edits are still below. Review them before saving changes.</p>{immutableChanged && <><p>A saved habit’s timezone and start date are fixed: {currentHabit!.timezone}, {currentHabit!.plans[0].startDate}.</p><Button type="button" variant="outlined" disabled={busy} onClick={() => { if (!session.locked.current && currentHabit) setDraft(previous => ({ ...previous, timezone: currentHabit.timezone, plan: { ...previous.plan, startDate: currentHabit.plans[0].startDate } })); }}>Use saved timezone and start date</Button></>}</div>}
      {conflict && <div className="habit-form-notice"><p>The saved habit changed. Your draft is still here. Reload only when you are ready to replace it.</p><Button type="button" variant="outlined" disabled={busy} onClick={() => setConfirmation({ title: 'Replace this draft?', message: 'Reloading replaces your unsaved changes with the latest saved habit. If reloading fails, your draft will stay here.', confirmLabel: 'Replace with latest', action: () => void reload() })}>Reload latest habit</Button></div>}
      <Field label="Habit name"><input autoFocus required maxLength={160} value={draft.name} onChange={event => field('name', event.target.value)} placeholder="e.g. Read two pages" /></Field>
      <Field label="Why it matters (optional)"><input maxLength={1000} value={draft.description} onChange={event => field('description', event.target.value)} placeholder="A short reason to keep going" /></Field>
      <div className="habit-appearance"><div role="group" aria-label="Habit icon">{HABIT_ICONS.map(icon => <IconButton key={icon} label={`${icon} icon`} aria-pressed={draft.icon === icon} onClick={() => field('icon', icon)}><HabitIcon name={icon} size={17} /></IconButton>)}</div><div role="group" aria-label="Habit color">{HABIT_COLORS.map(color => <button key={color} type="button" className={`habit-color-choice habit-color-${color}`} aria-label={`${color} color`} aria-pressed={draft.color === color} onClick={() => field('color', color)} />)}</div></div>
      <div className="habit-form-grid"><Field label="Section"><input required maxLength={80} list={`${id}-sections`} value={draft.section} onChange={event => field('section', event.target.value)} /><datalist id={`${id}-sections`}>{['Personal', 'Health', 'Movement', 'Learning', 'Mind', 'Creative'].map(section => <option key={section} value={section} />)}</datalist></Field><Field label="Timezone" hint={currentHabit ? 'Fixed to keep historical dates stable.' : 'Your check-in day follows this timezone.'}><input required disabled={busy || Boolean(currentHabit)} value={draft.timezone} onChange={event => field('timezone', event.target.value)} list={`${id}-timezones`} /><datalist id={`${id}-timezones`}>{['Asia/Kolkata', 'UTC', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'Australia/Sydney'].map(zone => <option key={zone} value={zone} />)}</datalist></Field></div>
      <div className="habit-form-grid"><Field label="Schedule"><HabitSelect disabled={busy} label="Habit schedule" value={draft.plan.frequency} items={{ DAILY: 'Every day', WEEKDAYS: 'Selected weekdays', WEEKLY: 'Days per week', INTERVAL: 'Every few days' }} onChange={value => plan('frequency', value as HabitFrequency)} /></Field><Field label="Daily goal"><HabitSelect disabled={busy} label="Daily goal type" value={draft.plan.goalType} items={{ CHECK: 'Check off once', COUNT: 'Reach an amount' }} onChange={value => { if (session.locked.current) return; setDraft(previous => ({ ...previous, plan: { ...previous.plan, goalType: value as HabitGoal, target: 1, step: 1, unit: value === 'CHECK' ? '' : previous.plan.unit || 'minutes' } })); }} /></Field></div>
      {draft.plan.frequency === 'WEEKDAYS' && <div className="habit-weekdays" role="group" aria-label="Scheduled weekdays">{[1, 2, 3, 4, 5, 6, 0].map(day => <button key={day} type="button" aria-pressed={draft.plan.weekdays.includes(day)} onClick={() => plan('weekdays', draft.plan.weekdays.includes(day) ? draft.plan.weekdays.filter(item => item !== day) : [...draft.plan.weekdays, day].sort())}>{WEEKDAYS[day]}</button>)}</div>}
      {draft.plan.frequency === 'WEEKLY' && <Field label="Days to complete each week" hint="Choose any days, Monday–Sunday. A completed day counts once."><input type="number" min={1} max={7} required value={draft.plan.weeklyTarget} onChange={event => plan('weeklyTarget', Number(event.target.value))} /></Field>}
      {draft.plan.frequency === 'INTERVAL' && <Field label="Repeat every (days)"><input type="number" min={1} max={365} required value={draft.plan.intervalDays} onChange={event => plan('intervalDays', Number(event.target.value))} /></Field>}
      {draft.plan.goalType === 'COUNT' && <div className="habit-form-grid three"><Field label="Daily amount"><input type="number" min={0.001} max={999999999} step="0.001" required value={draft.plan.target} onChange={event => plan('target', Number(event.target.value))} /></Field><Field label="Unit"><input required maxLength={30} value={draft.plan.unit} onChange={event => plan('unit', event.target.value)} placeholder="pages, minutes…" /></Field><Field label="Quick-add amount"><input type="number" min={0.001} max={999999999} step="0.001" required value={draft.plan.step} onChange={event => plan('step', Number(event.target.value))} /></Field></div>}
      <div className="habit-form-grid"><Field label="Start date"><input type="date" required disabled={busy || Boolean(currentHabit)} value={draft.plan.startDate} onChange={event => plan('startDate', event.target.value)} /></Field><Field label="End date (optional)"><input type="date" min={draft.plan.startDate} value={draft.plan.endDate ?? ''} onChange={event => plan('endDate', event.target.value || null)} /></Field></div>
      <fieldset className="habit-reminder-field"><legend>Reminder times <span>· optional</span></legend><div className="habit-reminder-times">{draft.plan.reminders.map(item => <span key={item}>{item}<IconButton label={`Remove ${item} reminder`} onClick={() => plan('reminders', draft.plan.reminders.filter(value => value !== item))}><X size={12} /></IconButton></span>)}<input aria-label="Reminder time" type="time" value={time} onChange={event => { if (!session.locked.current) setTime(event.target.value); }} /><IconButton label="Add reminder time" disabled={busy || !time || draft.plan.reminders.includes(time) || draft.plan.reminders.length >= 8} onClick={() => plan('reminders', [...draft.plan.reminders, time].sort())}><Plus size={16} /></IconButton></div><small>Reminders use this habit’s timezone. Browser notifications work while Habits is open.</small></fieldset>
      {currentHabit && <p className="habits-muted">Name, appearance and reminders update now. Schedule and goal changes begin tomorrow, or next Monday for weekly goals. Saved history stays unchanged.</p>}
      </fieldset></div>
      <div className="habit-form-footer">{!currentHabit && <Button type="button" variant="ghost" disabled={busy} onClick={() => { if (!session.locked.current) setGallery(true); }}>Browse ideas</Button>}<Button type="button" variant="outlined" disabled={busy} onClick={requestClose}>Cancel</Button><Button type="submit" loading={busy}>{uncertain ? 'Check earlier save' : currentHabit ? 'Save changes' : 'Create habit'}</Button></div>
    </form>}
    {confirmation && <HabitConfirmDialog confirmation={confirmation} onKeep={() => setConfirmation(null)} returnFocus={lastField} />}
  </HabitDialog>;
}
