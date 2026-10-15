import { useEffect, useRef, useState } from 'react';
import { planOn, type Habit, type HabitLog } from '@reader/habit-core';
import { Button } from '@modules/core/ui/primitives/button';
import { Field, HabitConfirmDialog, HabitDialog, formatDay, type HabitFormConfirmation } from './ui';
import { HabitApiError } from './api';
import { sameDraft, useHabitFormSession } from './form-session';

export const MOODS = ['Difficult', 'Low', 'Okay', 'Good', 'Great'];
export type LogValue = Pick<HabitLog, 'value' | 'status' | 'note' | 'mood'>;
type LogDraft = { value: number; note: string; mood: number | null; skipped: boolean };
type LogFormProps = { habit: Habit; date: string; onClose: () => void; onSave: (value: LogValue, sourceHabit: Habit) => Promise<void>; onReload: () => Promise<Habit> };
function fromHabit(habit: Habit, date: string): LogDraft {
  const existing = habit.logs.find(log => log.date === date), plan = planOn(habit, date);
  return { value: existing?.value ?? (plan?.goalType === 'CHECK' ? 1 : 0), note: existing?.note ?? '', mood: existing?.mood ?? null, skipped: existing?.status === 'SKIPPED' };
}
export function LogForm(props: LogFormProps) { return <LogFormSession key={`${props.habit.id}:${props.date}`} {...props} />; }
function LogFormSession({ habit, date, onClose, onSave, onReload }: LogFormProps) {
  const [currentHabit, setCurrentHabit] = useState(() => structuredClone(habit));
  const [draft, setDraft] = useState(() => fromHabit(habit, date)), baseline = useRef(structuredClone(draft));
  const existing = currentHabit.logs.find(log => log.date === date), plan = planOn(currentHabit, date);
  const [error, setError] = useState(''), [conflict, setConflict] = useState(false);
  const [confirmation, setConfirmation] = useState<HabitFormConfirmation | null>(null);
  const session = useHabitFormSession(), { busy } = session;
  const errorRef = useRef<HTMLParagraphElement>(null), lastField = useRef<HTMLElement | null>(null);
  const dirty = !sameDraft(draft, baseline.current);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  function field<K extends keyof LogDraft>(key: K, value: LogDraft[K]) { if (!session.locked.current) setDraft(previous => ({ ...previous, [key]: value })); }
  function requestClose() {
    if (session.locked.current) return;
    if (!dirty) { session.close(onClose); return; }
    setConfirmation({ title: 'Discard unsaved changes?', message: 'Your check-in changes will be lost. The previously saved check-in stays unchanged.', confirmLabel: 'Discard changes', action: () => session.close(onClose) });
  }
  async function reload() {
    setConfirmation(null);
    const token = session.begin(); if (token === null) return;
    try {
      const latest = await onReload(); if (!session.current(token)) return;
      if (latest.id !== currentHabit.id) throw new Error('The requested habit changed. Your draft has been kept.');
      const next = fromHabit(latest, date); setCurrentHabit(structuredClone(latest)); setDraft(next); baseline.current = structuredClone(next);
      setConflict(false); setError('');
    } catch (error) { if (session.current(token)) setError(error instanceof Error ? error.message : 'Couldn’t reload the check-in.'); }
    finally { session.finish(token); }
  }
  async function save(clear = false) {
    const token = session.begin(); if (token === null) return;
    setConfirmation(null); setError('');
    const snapshot: LogValue = clear ? { value: 0, status: 'NONE', note: '', mood: null } : { value: draft.skipped ? 0 : draft.value, status: draft.skipped ? 'SKIPPED' : 'RECORDED', note: draft.note, mood: draft.mood };
    const source = structuredClone(currentHabit);
    try { await onSave(snapshot, source); if (session.current(token)) onClose(); }
    catch (error) { if (session.current(token)) { setError(error instanceof Error ? error.message : 'Couldn’t save this check-in.'); setConflict(error instanceof HabitApiError && error.status === 409); } }
    finally { session.finish(token); }
  }
  return <HabitDialog title={currentHabit.name} onClose={requestClose} busy={busy} formLayout>
    <form className="habit-form" onSubmit={event => { event.preventDefault(); void save(); }} onFocusCapture={event => { if ((event.target as HTMLElement).matches('input,textarea')) lastField.current = event.target as HTMLElement; }}>
      <div className="habit-form-body"><fieldset className="habit-form-fields" disabled={busy}>
        <p className="habit-form-date">{formatDay(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {currentHabit.timezone}</p>
        {error && <p ref={errorRef} tabIndex={-1} role="alert" className="habits-error">{error}</p>}
        {conflict && <div className="habit-form-notice"><p>The saved check-in changed. Your draft is still here. Reload only when you are ready to replace it.</p><Button type="button" variant="outlined" disabled={busy} onClick={() => setConfirmation({ title: 'Replace this check-in draft?', message: 'Reloading replaces your unsaved progress, note and mood with the latest saved check-in. If reloading fails, your draft will stay here.', confirmLabel: 'Replace with latest', action: () => void reload() })}>Reload check-in</Button></div>}
        <div className="habit-tabs" role="group" aria-label="Check-in type"><button type="button" aria-pressed={!draft.skipped} onClick={() => field('skipped', false)}>Record progress</button><button type="button" aria-pressed={draft.skipped} onClick={() => field('skipped', true)}>Skip this day</button></div>
        {draft.skipped ? <p className="habits-muted">An excused day preserves a daily streak without adding to it. Weekly targets still need their planned number of completed days.</p> : plan?.goalType === 'COUNT' ? <Field label={`Amount (${plan.unit})`} hint={`Daily goal: ${plan.target} ${plan.unit}. You can record partial progress.`}><div className="habit-amount-editor"><input type="number" autoFocus required min={0} max={999999999} step="0.001" value={draft.value} onChange={event => field('value', Number(event.target.value))} /><Button type="button" variant="outlined" size="sm" onClick={() => field('value', plan.target)}>Fill goal</Button></div></Field> : <label className="habit-checkbox"><input type="checkbox" checked={draft.value >= 1} onChange={event => field('value', event.target.checked ? 1 : 0)} />Completed this habit</label>}
        <Field label="A note for yourself (optional)"><textarea maxLength={5000} rows={3} value={draft.note} onChange={event => field('note', event.target.value)} placeholder="What helped? What got in the way?" /></Field>
        <fieldset className="habit-moods"><legend>How did it feel? <span>· optional</span></legend><div>{MOODS.map((label, index) => <button type="button" key={label} aria-pressed={draft.mood === index + 1} onClick={() => field('mood', draft.mood === index + 1 ? null : index + 1)}>{label}</button>)}</div></fieldset>
      </fieldset></div>
      <div className="habit-form-footer">{existing && existing.status !== 'NONE' && <Button type="button" variant="ghost" disabled={busy} onClick={() => { if (!session.locked.current) setConfirmation({ title: 'Clear this check-in?', message: `This removes the saved progress, note and mood for ${formatDay(date)}. Any unsaved changes in this form will also be discarded. The habit and its other check-ins stay unchanged.`, confirmLabel: 'Clear saved check-in', action: () => void save(true) }); }}>Clear check-in</Button>}<Button type="button" variant="outlined" disabled={busy} onClick={requestClose}>Cancel</Button><Button type="submit" loading={busy}>Save check-in</Button></div>
    </form>
    {confirmation && <HabitConfirmDialog confirmation={confirmation} onKeep={() => setConfirmation(null)} returnFocus={lastField} />}
  </HabitDialog>;
}
