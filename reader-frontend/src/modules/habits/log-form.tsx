import { useState } from 'react';
import { planOn, type Habit, type HabitLog } from '@reader/habit-core';
import { Button } from '@modules/core/ui/primitives/button';
import { Field, HabitDialog, formatDay } from './ui';
import { HabitApiError } from './api';

export const MOODS = ['Difficult', 'Low', 'Okay', 'Good', 'Great'];
export type LogValue = Pick<HabitLog, 'value' | 'status' | 'note' | 'mood'>;
export function LogForm({ habit, date, onClose, onSave, onReload }: { habit: Habit; date: string; onClose: () => void; onSave: (value: LogValue) => Promise<void>; onReload: () => Promise<void> }) {
  const existing = habit.logs.find(log => log.date === date), plan = planOn(habit, date)!;
  const [value, setValue] = useState(existing?.value ?? (plan.goalType === 'CHECK' ? 1 : 0));
  const [note, setNote] = useState(existing?.note ?? ''), [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [skipped, setSkipped] = useState(existing?.status === 'SKIPPED'), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  async function save(clear = false) {
    if (busy) return;
    setBusy(true); setError('');
    try { await onSave(clear ? { value: 0, status: 'NONE', note: '', mood: null } : { value: skipped ? 0 : value, status: skipped ? 'SKIPPED' : 'RECORDED', note, mood }); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Couldn’t save this check-in.'); setConflict(error instanceof HabitApiError && error.status === 409); }
    finally { setBusy(false); }
  }
  return <HabitDialog title={habit.name} onClose={onClose} busy={busy}>
    <p className="habits-muted">{formatDay(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {habit.timezone}</p>
    <form className="habit-form" onSubmit={event => { event.preventDefault(); void save(); }}>
      {error && <p role="alert" className="habits-error">{error}</p>}
      {conflict && <div><p className="habits-muted">Reload to review the saved check-in. This replaces your unsaved changes.</p><Button type="button" variant="outlined" disabled={busy} onClick={async () => { setBusy(true); try { await onReload(); } catch (error) { setError(error instanceof Error ? error.message : 'Couldn’t reload.'); } finally { setBusy(false); } }}>Reload check-in</Button></div>}
      <div className="habit-tabs" role="group" aria-label="Check-in type"><button type="button" aria-pressed={!skipped} onClick={() => setSkipped(false)}>Record progress</button><button type="button" aria-pressed={skipped} onClick={() => setSkipped(true)}>Skip this day</button></div>
      {skipped ? <p className="habits-muted">An excused day preserves a daily streak without adding to it. Weekly targets still need their planned number of completed days.</p> : plan.goalType === 'COUNT' ? <Field label={`Amount (${plan.unit})`} hint={`Daily goal: ${plan.target} ${plan.unit}. You can record partial progress.`}><div className="habit-amount-editor"><input type="number" autoFocus required min={0} max={999999999} step="0.001" value={value} onChange={event => setValue(Number(event.target.value))} /><Button type="button" variant="outlined" size="sm" onClick={() => setValue(plan.target)}>Fill goal</Button></div></Field> : <label className="habit-checkbox"><input type="checkbox" checked={value >= 1} onChange={event => setValue(event.target.checked ? 1 : 0)} />Completed this habit</label>}
      <Field label="A note for yourself (optional)"><textarea maxLength={5000} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="What helped? What got in the way?" /></Field>
      <fieldset className="habit-moods"><legend>How did it feel? <span>· optional</span></legend><div>{MOODS.map((label, index) => <button type="button" key={label} aria-pressed={mood === index + 1} onClick={() => setMood(mood === index + 1 ? null : index + 1)}>{label}</button>)}</div></fieldset>
      <div className="habit-form-footer">{existing && existing.status !== 'NONE' && <Button type="button" variant="ghost" disabled={busy} onClick={() => void save(true)}>Clear check-in</Button>}<Button type="button" variant="outlined" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Save check-in</Button></div>
    </form>
  </HabitDialog>;
}
