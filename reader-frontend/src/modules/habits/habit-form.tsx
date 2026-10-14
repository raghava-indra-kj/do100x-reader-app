import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { HABIT_COLORS, HABIT_ICONS, HABIT_TEMPLATES, WEEKDAYS, localDate, type Habit, type HabitDraft, type HabitFrequency, type HabitGoal } from '@reader/habit-core';
import { Button } from '@modules/core/ui/primitives/button';
import { HabitDialog, HabitIcon, HabitSelect, Field, IconButton } from './ui';
import { HabitApiError, habitsApi } from './api';

export function newHabitDraft(): HabitDraft {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  return { name: '', description: '', icon: 'sprout', color: 'green', section: 'Personal', timezone, plan: { startDate: localDate(timezone), endDate: null, frequency: 'DAILY', weekdays: [1, 2, 3, 4, 5], intervalDays: 2, weeklyTarget: 3, goalType: 'CHECK', target: 1, unit: '', step: 1, reminders: [] } };
}
function fromHabit(habit: Habit): HabitDraft {
  const { id: _id, effectiveFrom: _from, ...plan } = habit.plans[habit.plans.length - 1];
  return { name: habit.name, description: habit.description, icon: habit.icon, color: habit.color, section: habit.section, timezone: habit.timezone, plan };
}
export function HabitForm({ habit, onClose, onSaved }: { habit?: Habit; onClose: () => void; onSaved: (habit: Habit) => void }) {
  const [draft, setDraft] = useState(() => habit ? fromHabit(habit) : newHabitDraft());
  const [currentHabit, setCurrentHabit] = useState(habit), [conflict, setConflict] = useState(false);
  const [gallery, setGallery] = useState(!habit), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [requestKey] = useState(() => crypto.randomUUID()), [time, setTime] = useState('09:00');
  const field = <K extends keyof HabitDraft>(key: K, value: HabitDraft[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  const plan = <K extends keyof HabitDraft['plan']>(key: K, value: HabitDraft['plan'][K]) => setDraft(previous => ({ ...previous, plan: { ...previous.plan, [key]: value } }));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    if (draft.plan.frequency === 'WEEKDAYS' && !draft.plan.weekdays.length) { setError('Choose at least one weekday.'); return; }
    if (draft.plan.endDate && draft.plan.endDate < draft.plan.startDate) { setError('End date must follow the start date.'); return; }
    setBusy(true); setError('');
    try { onSaved(currentHabit ? await habitsApi.edit(currentHabit, draft) : await habitsApi.create(draft, requestKey)); }
    catch (error) { setError(error instanceof Error ? error.message : 'Couldn’t save the habit.'); setConflict(error instanceof HabitApiError && error.status === 409 && Boolean(currentHabit)); }
    finally { setBusy(false); }
  }
  return <HabitDialog title={habit ? 'Edit habit' : 'Build a small habit'} onClose={onClose} busy={busy} wide>
    {gallery ? <><p className="habits-muted">Start small. Choose an idea, then make it yours.</p><div className="habit-gallery">{HABIT_TEMPLATES.map(template => <button key={template.name} onClick={() => { setDraft({ ...draft, name: template.name, description: template.description, icon: template.icon, color: template.color, section: template.section, plan: { ...draft.plan, goalType: template.unit ? 'COUNT' : 'CHECK', target: template.target, step: template.step, unit: template.unit } }); setGallery(false); }}><span className={`habit-icon habit-color-${template.color}`}><HabitIcon name={template.icon} /></span><strong>{template.name}</strong><small>{template.unit ? `${template.target} ${template.unit} a day` : 'One small action a day'}</small></button>)}</div><Button variant="outlined" onClick={() => setGallery(false)}>Create my own habit</Button></> :
    <form onSubmit={submit} className="habit-form">
      {error && <p role="alert" className="habits-error">{error}</p>}
      {conflict && <div><p className="habits-muted">Reload to review the latest version. This replaces your unsaved edits.</p><Button type="button" variant="outlined" disabled={busy} onClick={async () => { if (!currentHabit) return; setBusy(true); try { const latest = await habitsApi.get(currentHabit.id); setCurrentHabit(latest); setDraft(fromHabit(latest)); setConflict(false); setError(''); } catch (error) { setError(error instanceof Error ? error.message : 'Couldn’t reload the habit.'); } finally { setBusy(false); } }}>Reload latest habit</Button></div>}
      <Field label="Habit name"><input autoFocus required maxLength={160} value={draft.name} onChange={event => field('name', event.target.value)} placeholder="e.g. Read two pages" /></Field>
      <Field label="Why it matters (optional)"><input maxLength={1000} value={draft.description} onChange={event => field('description', event.target.value)} placeholder="A short reason to keep going" /></Field>
      <div className="habit-appearance"><div role="group" aria-label="Habit icon">{HABIT_ICONS.map(icon => <IconButton key={icon} label={`${icon} icon`} aria-pressed={draft.icon === icon} onClick={() => field('icon', icon)}><HabitIcon name={icon} size={17} /></IconButton>)}</div><div role="group" aria-label="Habit color">{HABIT_COLORS.map(color => <button key={color} type="button" className={`habit-color-choice habit-color-${color}`} aria-label={`${color} color`} aria-pressed={draft.color === color} onClick={() => field('color', color)} />)}</div></div>
      <div className="habit-form-grid"><Field label="Section"><input required maxLength={80} list="habit-sections" value={draft.section} onChange={event => field('section', event.target.value)} /><datalist id="habit-sections">{['Personal', 'Health', 'Movement', 'Learning', 'Mind', 'Creative'].map(section => <option key={section} value={section} />)}</datalist></Field><Field label="Timezone" hint={habit ? 'Fixed to keep historical dates stable.' : 'Your check-in day follows this timezone.'}><input required disabled={Boolean(habit)} value={draft.timezone} onChange={event => field('timezone', event.target.value)} list="habit-timezones" /><datalist id="habit-timezones">{['Asia/Kolkata', 'UTC', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore', 'Australia/Sydney'].map(zone => <option key={zone} value={zone} />)}</datalist></Field></div>
      <div className="habit-form-grid"><Field label="Schedule"><HabitSelect label="Habit schedule" value={draft.plan.frequency} items={{ DAILY: 'Every day', WEEKDAYS: 'Selected weekdays', WEEKLY: 'Days per week', INTERVAL: 'Every few days' }} onChange={value => plan('frequency', value as HabitFrequency)} /></Field><Field label="Daily goal"><HabitSelect label="Daily goal type" value={draft.plan.goalType} items={{ CHECK: 'Check off once', COUNT: 'Reach an amount' }} onChange={value => { setDraft(previous => ({ ...previous, plan: { ...previous.plan, goalType: value as HabitGoal, target: 1, step: 1, unit: value === 'CHECK' ? '' : previous.plan.unit || 'minutes' } })); }} /></Field></div>
      {draft.plan.frequency === 'WEEKDAYS' && <div className="habit-weekdays" role="group" aria-label="Scheduled weekdays">{[1, 2, 3, 4, 5, 6, 0].map(day => <button key={day} type="button" aria-pressed={draft.plan.weekdays.includes(day)} onClick={() => plan('weekdays', draft.plan.weekdays.includes(day) ? draft.plan.weekdays.filter(item => item !== day) : [...draft.plan.weekdays, day].sort())}>{WEEKDAYS[day]}</button>)}</div>}
      {draft.plan.frequency === 'WEEKLY' && <Field label="Days to complete each week" hint="Choose any days, Monday–Sunday. A completed day counts once."><input type="number" min={1} max={7} required value={draft.plan.weeklyTarget} onChange={event => plan('weeklyTarget', Number(event.target.value))} /></Field>}
      {draft.plan.frequency === 'INTERVAL' && <Field label="Repeat every (days)"><input type="number" min={1} max={365} required value={draft.plan.intervalDays} onChange={event => plan('intervalDays', Number(event.target.value))} /></Field>}
      {draft.plan.goalType === 'COUNT' && <div className="habit-form-grid three"><Field label="Daily amount"><input type="number" min={0.001} max={999999999} step="0.001" required value={draft.plan.target} onChange={event => plan('target', Number(event.target.value))} /></Field><Field label="Unit"><input required maxLength={30} value={draft.plan.unit} onChange={event => plan('unit', event.target.value)} placeholder="pages, minutes…" /></Field><Field label="Quick-add amount"><input type="number" min={0.001} max={999999999} step="0.001" required value={draft.plan.step} onChange={event => plan('step', Number(event.target.value))} /></Field></div>}
      <div className="habit-form-grid"><Field label="Start date"><input type="date" required disabled={Boolean(habit)} value={draft.plan.startDate} onChange={event => plan('startDate', event.target.value)} /></Field><Field label="End date (optional)"><input type="date" min={draft.plan.startDate} value={draft.plan.endDate ?? ''} onChange={event => plan('endDate', event.target.value || null)} /></Field></div>
      <fieldset className="habit-reminder-field"><legend>Reminder times <span>· optional</span></legend><div className="habit-reminder-times">{draft.plan.reminders.map(item => <span key={item}>{item}<IconButton label={`Remove ${item} reminder`} onClick={() => plan('reminders', draft.plan.reminders.filter(value => value !== item))}><X size={12} /></IconButton></span>)}<input aria-label="Reminder time" type="time" value={time} onChange={event => setTime(event.target.value)} /><IconButton label="Add reminder time" disabled={!time || draft.plan.reminders.includes(time) || draft.plan.reminders.length >= 8} onClick={() => plan('reminders', [...draft.plan.reminders, time].sort())}><Plus size={16} /></IconButton></div><small>Reminders use this habit’s timezone. Browser notifications work while Habits is open.</small></fieldset>
      {habit && <p className="habits-muted">Name, appearance and reminders update now. Schedule and goal changes begin tomorrow, or next Monday for weekly goals. Saved history stays unchanged.</p>}
      <div className="habit-form-footer">{!habit && <Button type="button" variant="ghost" onClick={() => setGallery(true)}>Browse ideas</Button>}<Button type="button" variant="outlined" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>{habit ? 'Save changes' : 'Create habit'}</Button></div>
    </form>}
  </HabitDialog>;
}
